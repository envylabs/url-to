import type { UrlToIssue } from "./errors.js";
import type { Route } from "./route-set.js";
import type {
  StandardSchemaV1,
  StandardSchemaV1Issue,
} from "./standard-schema.js";
import {
  parseTemplate,
  type ScalarValue,
  type TemplateValue,
  type TemplateValues,
} from "./template/engine.js";

/**
 * The outcome of validating Route Parameters against a Route.
 */
export type RouteParametersResult =
  | {
      // The schema's output, or `values` for a template-only Route.
      readonly output: unknown;
      readonly success: true;
      /** The values that fill the template, keyed by variable name. */
      readonly values: TemplateValues;
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

function checkScalar(
  value: unknown,
  path: readonly PropertyKey[],
  message = "must be a string, number or boolean",
): UrlToIssue[] {
  if (typeof value === "number" && !Number.isFinite(value)) {
    return [{ message: "must be a finite number", path }];
  }
  return isScalar(value) ? [] : [{ message, path }];
}

/**
 * Checks values against the template's variables: required variables must be
 * present, values must be scalars (strings, finite numbers, booleans), lists
 * or records of scalars, and every key must be a variable in the template.
 * Template-only Routes also reject empty path-type values (including empty
 * lists and records); with a schema, emptiness is the schema's call.
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
  const values: Record<string, TemplateValue> = {};
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
      continue;
    }

    const valueIssues = checkValue(value, [name]);
    if (valueIssues.length > 0) {
      issues.push(...valueIssues);
    } else if (isRequired && templateOnly && isEmpty(value as TemplateValue)) {
      issues.push({ message: "must not be empty", path: [name] });
    } else {
      values[name] = value as TemplateValue;
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

/**
 * Issues for a value the template engine can't expand: anything other than a
 * scalar, or a list or record of scalars.
 */
function checkValue(
  value: unknown,
  path: readonly PropertyKey[],
): UrlToIssue[] {
  if (Array.isArray(value) || isPlainObject(value)) {
    return Object.entries(value).flatMap(([key, member]) =>
      checkScalar(member, [...path, Array.isArray(value) ? Number(key) : key]),
    );
  }
  return checkScalar(
    value,
    path,
    "must be a string, number, boolean, list or record",
  );
}

function isEmpty(value: TemplateValue): boolean {
  return typeof value === "object"
    ? Object.keys(value).length === 0
    : value === "";
}

function isPlainObject(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isScalar(value: unknown): value is ScalarValue {
  return (
    typeof value === "string" ||
    typeof value === "boolean" ||
    typeof value === "number"
  );
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
