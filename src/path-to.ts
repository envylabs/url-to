import { buildPath } from "./build.js";
import type { RouteParametersArgs } from "./params.js";
import type { Route, RouteSet } from "./route-set.js";

/**
 * Builds origin-less paths for the Routes of one Route Set.
 */
export type PathTo<RouteSetName extends string> = <
  R extends Route<{ readonly template: string }, string, RouteSetName>,
>(
  route: R,
  ...params: RouteParametersArgs<R>
) => string;

/**
 * Creates a path-to for a Route Set.
 */
export function createPathTo<RouteSetName extends string>(
  _routeSet: RouteSet<RouteSetName>,
): PathTo<RouteSetName> {
  return (route, ...[params]) => buildPath(route, params);
}
