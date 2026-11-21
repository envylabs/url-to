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

/**
 * Values the engine can expand. Undefined values are left out per RFC 6570.
 */
export type TemplateValues = Readonly<Record<string, string | undefined>>;

/**
 * A variable in a template expression, e.g. `id` in `{id}`.
 */
export interface TemplateVariable {
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

function expandExpression(
  operator: OperatorSpec,
  variables: readonly TemplateVariable[],
  values: TemplateValues,
): string {
  const expansions = variables.flatMap(({ name }) => {
    const value = values[name];
    if (value === undefined) {
      return [];
    }

    const encoded = encode(value, operator.allowReserved);
    if (!operator.named) {
      return [encoded];
    }
    return [value === "" ? name + operator.ifEmpty : `${name}=${encoded}`];
  });

  return expansions.length === 0
    ? ""
    : operator.first + expansions.join(operator.separator);
}

function invalid(template: string, reason: string): never {
  throw new TypeError(
    `Invalid Route template ${JSON.stringify(template)}: ${reason}`,
  );
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
      if (varspec.includes("*")) {
        invalid(template, `unsupported modifier in "${varspec}"`);
      }
      if (!varnamePattern.test(varspec)) {
        invalid(template, `invalid variable name "${varspec}"`);
      }
      return { name: varspec, operator };
    });

  return { kind: "expression", operator, variables };
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
