import type { UrlToIssue } from "./errors.js";
import type { Route } from "./route-set.js";
import type {
  StandardSchemaV1,
  StandardSchemaV1Issue,
} from "./standard-schema.js";
import { parseTemplate } from "./template/engine.js";

/**
 * The outcome of validating Route Parameters against a Route.
 */
export type RouteParametersResult =
  | {
      // The schema's output, or `values` for a template-only Route.
      readonly output: unknown;
      readonly success: true;
      /** The values that fill the template, keyed by variable name. */
      readonly values: Readonly<Record<string, string | undefined>>;
    }
  | {
      readonly issues: readonly UrlToIssue[];
      readonly success: false;
    };

/**
 * Validates Route Parameters against a Route. Runs the Route's schema when it
 * has one, then checks the resulting values against the template's
 * variables. Shared by building (path-to, url-to) and reverse parsing.
 *
 * Never throws for invalid input; it reports issues instead. It throws a
 * `TypeError` naming the Route when the schema validates asynchronously.
 */
export function validateRouteParameters(
  route: Route,
  input: unknown,
): RouteParametersResult {
  if (route.params === undefined) {
    return checkTemplateValues(route, input, true);
  }

  const result = runSchema(route, route.params, input);
  if (result.issues) {
    return { issues: result.issues.map(toUrlToIssue), success: false };
  }

  const checked = checkTemplateValues(route, result.value, false);
  return checked.success ? { ...checked, output: result.value } : checked;
}

/**
 * Checks values against the template's variables: required variables must be
 * present, values must be strings, and every key must be a variable in the
 * template. Template-only Routes also reject empty path-type values; with a
 * schema, emptiness is the schema's call.
 */
function checkTemplateValues(
  route: Route,
  input: unknown,
  templateOnly: boolean,
): RouteParametersResult {
  if (input !== undefined && !isRecord(input)) {
    return {
      issues: [{ message: "must be an object", path: [] }],
      success: false,
    };
  }

  const parsed = parseTemplate(route.template);
  const values: Record<string, string> = {};
  const issues: UrlToIssue[] = [];
  // Whether each variable is required: template-only Routes require every
  // path-type variable, schema Routes only those whose absence would leave
  // an empty path segment. A variable used several times is required if any
  // occurrence requires it.
  const required = new Map<string, boolean>();

  for (const { name, operator } of parsed.variables) {
    const requires = templateOnly ? operator.pathType : operator.requiresValue;
    required.set(name, (required.get(name) ?? false) || requires);
  }

  for (const [name, isRequired] of required) {
    const value = input?.[name];
    if (value === undefined) {
      if (isRequired) {
        issues.push({ message: "is required", path: [name] });
      }
    } else if (typeof value !== "string") {
      issues.push({ message: "must be a string", path: [name] });
    } else if (value === "" && isRequired && templateOnly) {
      issues.push({ message: "must not be empty", path: [name] });
    } else {
      values[name] = value;
    }
  }

  for (const key of Object.keys(input ?? {})) {
    if (!required.has(key)) {
      issues.push({
        message: "is not a variable in the template",
        path: [key],
      });
    }
  }

  return issues.length > 0
    ? { issues, success: false }
    : { output: values, success: true, values };
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function runSchema(
  route: Route,
  schema: StandardSchemaV1,
  input: unknown,
):
  | { readonly issues: readonly StandardSchemaV1Issue[] }
  | { readonly issues?: undefined; readonly value: unknown } {
  const result = schema["~standard"].validate(input);

  if (result instanceof Promise) {
    // Don't leave a rejected promise unhandled.
    result.catch(() => undefined);
    throw new TypeError(
      `The Route Parameters schema for Route ${JSON.stringify(route.name)} in Route Set ${JSON.stringify(route.routeSetName)} validates asynchronously; paths and URLs are built synchronously, so use a synchronous schema`,
    );
  }

  return result;
}

function toUrlToIssue({
  message,
  path = [],
}: StandardSchemaV1Issue): UrlToIssue {
  return {
    message,
    path: path.map((segment) =>
      typeof segment === "object" ? segment.key : segment,
    ),
  };
}
