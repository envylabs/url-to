import { buildPath } from "./build.js";
import { parseOrigin } from "./origin.js";
import type { RouteParametersArgs } from "./params.js";
import type { Route, RouteSet } from "./route-set.js";
import type { RouteDefinition } from "./route.js";

/**
 * Builds fully-qualified URLs for the Routes of one Route Set, against one
 * Origin.
 */
export type UrlTo<RouteSetName extends string> = <
  R extends Route<RouteDefinition, string, RouteSetName>,
>(
  route: R,
  ...params: RouteParametersArgs<R>
) => string;

/**
 * Creates a url-to for a Route Set and an Origin.
 */
export function createUrlTo<RouteSetName extends string>(
  _routeSet: RouteSet<RouteSetName>,
  origin: string,
): UrlTo<RouteSetName> {
  const base = parseOrigin(origin);

  return (route, ...[params]) => base + buildPath(route, params);
}
