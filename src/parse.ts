import { UrlToError, type UrlToIssue } from "./errors.js";
import type { RouteParametersOutput } from "./params.js";
import type { Route } from "./route-set.js";
import { parseTemplate } from "./template/engine.js";
import { validateRouteParameters } from "./validate.js";

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
  const result = validateRouteParameters(
    route,
    route.params === undefined ? pickTemplateVariables(route, merged) : merged,
  );

  return result.success
    ? { data: result.output as RouteParametersOutput<R>, success: true }
    : { issues: result.issues, success: false };
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
 * fail a template-only Route. A schema Route leaves unknown keys to its schema.
 */
function pickTemplateVariables(
  route: Route,
  values: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  const names = new Set(
    parseTemplate(route.template).variables.map(({ name }) => name),
  );

  return Object.fromEntries(
    Object.entries(values).filter(([name]) => names.has(name)),
  );
}
