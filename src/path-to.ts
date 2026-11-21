import { buildPath, type RouteBuilder } from "./build.js";
import type { RouteSet } from "./route-set.js";

/**
 * Builds origin-less paths for the Routes of one Route Set.
 */
export type PathTo<RouteSetName extends string> = RouteBuilder<RouteSetName>;

/**
 * Creates a path-to for a Route Set.
 *
 * @example
 * ```ts
 * const pathTo = createPathTo(app);
 *
 * pathTo(app.Home); // a Route with no Route Parameters takes no second argument
 * pathTo(app.Item, { id: "42" }); // required Route Parameters require the argument
 * pathTo(app.Search); // every Route Parameter optional: the argument is optional
 * ```
 */
export function createPathTo<RouteSetName extends string>(
  _routeSet: RouteSet<RouteSetName>,
): PathTo<RouteSetName> {
  return (route, ...[params]) => buildPath(route, params);
}
