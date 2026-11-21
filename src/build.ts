import { UrlToError } from "./errors.js";
import type { RouteParametersInput } from "./params.js";
import type { Route } from "./route-set.js";
import type { RouteDefinition } from "./route.js";
import { expandTemplate, parseTemplate } from "./template/engine.js";
import { validateRouteParameters } from "./validate.js";

/**
 * A function that builds a path or URL for any Route of one Route Set, taking
 * the Route Parameters that Route requires.
 */
export type RouteBuilder<RouteSetName extends string> = <
  R extends Route<RouteDefinition, string, RouteSetName>,
>(
  route: R,
  ...params: RouteParametersInput<R>
) => string;

/**
 * Validates Route Parameters against a Route and expands its template into an
 * escaped path. Throws {@link UrlToError}.
 */
export function buildPath(route: Route, params: unknown): string {
  // An omitted params argument means "no Route Parameters", which a schema
  // expects as an empty object.
  const result = validateRouteParameters(route, params ?? {});

  if (!result.success) {
    throw new UrlToError(route, result.issues);
  }

  return expandTemplate(parseTemplate(route.template), result.values);
}
