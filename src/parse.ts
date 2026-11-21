import { UrlToError, type UrlToIssue } from "./errors.js";
import type { RouteParametersOutput } from "./params.js";
import type { Route } from "./route-set.js";
import { parseTemplate } from "./template/engine.js";
import {
  type RouteParametersResult,
  validateRouteParameters,
} from "./validate.js";

/**
 * Where incoming Route Parameters come from: a plain record or
 * `URLSearchParams`.
 */
export type ParamsSource = Readonly<Record<string, unknown>> | URLSearchParams;

/**
 * The outcome of parsing incoming Route Parameters against a Route: the
 * validated Route Parameters, or each problem with them.
 */
export type ParseParamsResult<R extends Route> =
  | {
      readonly data: RouteParametersOutput<R>;
      readonly success: true;
    }
  | {
      readonly issues: readonly UrlToIssue[];
      readonly success: false;
    };

/**
 * Validates incoming Route Parameters against a Route, e.g. a page's awaited
 * `params` and `searchParams`. Sources are merged left to right.
 */
export function parseParams<R extends Route>(
  route: R,
  ...sources: readonly ParamsSource[]
): ParseParamsResult<R> {
  const merged = mergeSources(sources);
  if (route.params !== undefined) {
    return toParseResult(validateRouteParameters(route, merged));
  }

  const { issues, values } = pickParsedValues(route, merged);
  const result = validateRouteParameters(route, values);
  if (issues.length === 0) {
    return toParseResult(result);
  }

  // A key left out for its type would also be reported as missing.
  const reported = new Set(issues.map(({ path }) => path[0]));
  const others = result.success
    ? []
    : result.issues.filter(({ path }) => !reported.has(path[0]));
  return { issues: [...issues, ...others], success: false };
}

/**
 * Like {@link parseParams}, but returns the validated Route Parameters and
 * throws {@link UrlToError} when they're invalid.
 */
export function parseParamsOrThrow<R extends Route>(
  route: R,
  ...sources: readonly ParamsSource[]
): RouteParametersOutput<R> {
  const result = parseParams(route, ...sources);

  if (!result.success) {
    throw new UrlToError(route, result.issues);
  }

  return result.data;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function mergeSources(
  sources: readonly ParamsSource[],
): Record<string, unknown> {
  const merged: Record<string, unknown> = {};

  for (const source of sources) {
    if (source instanceof URLSearchParams) {
      for (const key of new Set(source.keys())) {
        const values = source.getAll(key);
        merged[key] = values.length === 1 ? values[0] : values;
      }
    } else {
      Object.assign(merged, source);
    }
  }

  return merged;
}

/**
 * Keeps only the template's variables, so that unrelated search params don't
 * fail a template-only Route (a schema Route leaves unknown keys to its
 * schema), and reports values a template-only Route can't parse to: anything
 * but a string, or a list of strings for a variable exploded everywhere it
 * appears.
 */
function pickParsedValues(
  route: Route,
  values: Readonly<Record<string, unknown>>,
): { issues: UrlToIssue[]; values: Record<string, unknown> } {
  const explodedOnly = new Map<string, boolean>();
  for (const { explode, name } of parseTemplate(route.template).variables) {
    explodedOnly.set(name, (explodedOnly.get(name) ?? true) && explode);
  }

  const issues: UrlToIssue[] = [];
  const picked: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(values)) {
    const exploded = explodedOnly.get(name);
    if (exploded === undefined || value === undefined) {
      continue;
    }
    if (
      typeof value === "string" ||
      (exploded && Array.isArray(value) && value.every(isString))
    ) {
      picked[name] = value;
    } else {
      issues.push({
        message: exploded
          ? "must be a string or list of strings"
          : "must be a string",
        path: [name],
      });
    }
  }

  return { issues, values: picked };
}

function toParseResult<R extends Route>(
  result: RouteParametersResult,
): ParseParamsResult<R> {
  return result.success
    ? { data: result.output as RouteParametersOutput<R>, success: true }
    : { issues: result.issues, success: false };
}
