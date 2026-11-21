import { buildPath, type RouteBuilder } from "./build.js";
import type { RouteSet } from "./route-set.js";

/**
 * Builds origin-less paths for the Routes of one Route Set.
 */
export type PathTo<RouteSetName extends string> = RouteBuilder<RouteSetName>;

/**
 * Creates a path-to for a Route Set.
 */
export function createPathTo<RouteSetName extends string>(
  _routeSet: RouteSet<RouteSetName>,
): PathTo<RouteSetName> {
  return (route, ...[params]) => buildPath(route, params);
}
