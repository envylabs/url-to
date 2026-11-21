import type { Route, RouteSet } from "./route-set.js";

/**
 * Builds origin-less paths for the Routes of one Route Set.
 */
export type PathTo<RouteSetName extends string> = (
  route: Route<{ readonly template: string }, string, RouteSetName>,
) => string;

/**
 * Creates a path-to for a Route Set.
 */
export function createPathTo<RouteSetName extends string>(
  _routeSet: RouteSet<RouteSetName>,
): PathTo<RouteSetName> {
  return (route) => route.template;
}
