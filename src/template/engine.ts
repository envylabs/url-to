import {
  operatorCharacters,
  operators,
  type OperatorSpec,
} from "./operators.js";

/**
 * A template split into literal text and expressions.
 */
export interface ParsedTemplate {
  readonly parts: readonly TemplatePart[];
  /** Every variable in the template, in order of appearance. */
  readonly variables: readonly TemplateVariable[];
}

/** A single value, turned into a string before it is escaped. */
export type ScalarValue = boolean | number | string;

/**
 * A value the engine can expand: a scalar, a list or an associative array
 * (record), per RFC 6570 section 2.3.
 */
export type TemplateValue =
  Readonly<Record<string, ScalarValue>> | readonly ScalarValue[] | ScalarValue;

/**
 * Values the engine can expand. Undefined values, empty lists and empty
 * records are left out per RFC 6570.
 */
export type TemplateValues = Readonly<
  Record<string, TemplateValue | undefined>
>;

/**
 * A variable in a template expression, e.g. `id` in `{id}`, or `tags` with
 * `explode` set in `{?tags*}`.
 */
export interface TemplateVariable {
  readonly explode: boolean;
  readonly name: string;
  readonly operator: OperatorSpec;
}

type TemplatePart =
  | {
      readonly kind: "expression";
      readonly operator: OperatorSpec;
      readonly variables: readonly TemplateVariable[];
    }
  | { readonly kind: "literal"; readonly text: string };

const varnamePattern = /^[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*$/;

const cache = new Map<string, ParsedTemplate>();

/**
 * Expands a parsed template with already-validated values.
 */
export function expandTemplate(
  parsed: ParsedTemplate,
  values: TemplateValues,
): string {
  return parsed.parts
    .map((part) =>
      part.kind === "literal"
        ? encode(part.text, true)
        : expandExpression(part.operator, part.variables, values),
    )
    .join("");
}

/**
 * Parses an RFC 6570 template. Throws a `TypeError` naming the template when
 * it uses syntax the engine doesn't support. Must accept exactly the syntax
 * that `ParseTemplate` in `./types.ts` accepts.
 */
export function parseTemplate(template: string): ParsedTemplate {
  const cached = cache.get(template);
  if (cached) {
    return cached;
  }

  const parts: TemplatePart[] = [];
  const variables: TemplateVariable[] = [];
  let rest = template;

  while (rest.length > 0) {
    const open = rest.indexOf("{");
    const literal = open === -1 ? rest : rest.slice(0, open);

    if (literal.includes("}")) {
      invalid(template, 'unmatched "}"');
    }
    if (literal) {
      parts.push({ kind: "literal", text: literal });
    }
    if (open === -1) {
      break;
    }

    const close = rest.indexOf("}", open);
    const body = close === -1 ? undefined : rest.slice(open + 1, close);
    if (body === undefined || body.includes("{")) {
      invalid(template, 'unclosed "{"');
    }

    const expression = parseExpression(template, body);
    parts.push(expression);
    variables.push(...expression.variables);
    rest = rest.slice(close + 1);
  }

  const parsed = { parts, variables };
  cache.set(template, parsed);
  return parsed;
}

/**
 * Expands one expression per RFC 6570 Appendix A.
 */
function expandExpression(
  operator: OperatorSpec,
  variables: readonly TemplateVariable[],
  values: TemplateValues,
): string {
  const expansions = variables.flatMap(({ explode, name }) => {
    const value = values[name];
    if (value === undefined) {
      return [];
    }

    const ownKey = operator.named ? name : undefined;
    if (typeof value !== "object") {
      return [expandMember(operator, ownKey, String(value))];
    }

    const members = toMembers(value);
    if (members.length === 0) {
      return [];
    }

    if (explode) {
      return [
        members
          .map(([key, item]) => expandMember(operator, key ?? ownKey, item))
          .join(operator.separator),
      ];
    }

    const joined = members
      .flatMap(([key, item]) => (key === undefined ? [item] : [key, item]))
      .map((part) => encode(part, operator.allowReserved))
      .join(",");
    return [ownKey === undefined ? joined : `${ownKey}=${joined}`];
  });

  return expansions.length === 0
    ? ""
    : operator.first + expansions.join(operator.separator);
}

/**
 * Expands one string, as `key=value` when it has a key (a named operator's
 * variable name, or a record key in an exploded expression).
 */
function expandMember(
  operator: OperatorSpec,
  key: string | undefined,
  value: string,
): string {
  const encoded = encode(value, operator.allowReserved);
  if (key === undefined) {
    return encoded;
  }

  const encodedKey = encode(key, operator.allowReserved);
  return value === "" && operator.named
    ? encodedKey + operator.ifEmpty
    : `${encodedKey}=${encoded}`;
}

function invalid(template: string, reason: string): never {
  throw new TypeError(
    `Invalid Route template ${JSON.stringify(template)}: ${reason}`,
  );
}

function isList(value: TemplateValue): value is readonly ScalarValue[] {
  return Array.isArray(value);
}

function parseExpression(
  template: string,
  body: string,
): Extract<TemplatePart, { kind: "expression" }> {
  const operatorCharacter =
    body.length > 0 && operatorCharacters.includes(body.charAt(0))
      ? body.charAt(0)
      : "";
  const operator = operators[operatorCharacter];
  if (!operator) {
    invalid(template, `unsupported operator "${operatorCharacter}"`);
  }

  const variables = body
    .slice(operatorCharacter.length)
    .split(",")
    .map((varspec): TemplateVariable => {
      if (varspec.includes(":")) {
        invalid(template, `prefix modifiers are not supported in "${varspec}"`);
      }
      const explode = varspec.endsWith("*");
      const name = explode ? varspec.slice(0, -1) : varspec;
      if (!varnamePattern.test(name)) {
        invalid(template, `invalid variable name "${varspec}"`);
      }
      return { explode, name, operator };
    });

  return { kind: "expression", operator, variables };
}

/**
 * A list's items as `[undefined, item]` or a record's entries as
 * `[key, value]`, with every member turned into a string.
 */
function toMembers(
  value: Exclude<TemplateValue, ScalarValue>,
): (readonly [string | undefined, string])[] {
  return isList(value)
    ? value.map((item) => [undefined, String(item)] as const)
    : Object.entries(value).map(([key, item]) => [key, String(item)] as const);
}

const pctEncoded = /^%[0-9A-Fa-f]{2}$/;
const unreservedOnly = /[^A-Za-z0-9\-._~]+/gu;
const reservedAllowed =
  /%[0-9A-Fa-f]{2}|[^A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=]+/gu;

/**
 * Pct-encodes a value as UTF-8. Only unreserved characters are kept unless
 * `allowReserved` is set, in which case reserved characters and existing
 * pct-encoded triplets are kept too (as for literals and `{+x}`).
 */
function encode(value: string, allowReserved: boolean): string {
  return value.replace(
    allowReserved ? reservedAllowed : unreservedOnly,
    (run) =>
      allowReserved && pctEncoded.test(run)
        ? run
        : Array.from(
            new TextEncoder().encode(run),
            (byte) => `%${byte.toString(16).toUpperCase().padStart(2, "0")}`,
          ).join(""),
  );
}
