import { buildPath, type RouteBuilder } from "./build.js";
import { parseOrigin } from "./origin.js";
import type { Route, RouteSet } from "./route-set.js";

/**
 * Builds fully-qualified URLs for the Routes of one Route Set, against one
 * Origin.
 */
export type UrlTo<RouteSetName extends string> = RouteBuilder<RouteSetName>;

/**
 * Validates an Origin and returns a function that builds a URL from it and a
 * Route's path, passed through `toPath` first (for example, to prefix it).
 *
 * @throws TypeError when the Origin is invalid.
 */
export function createUrlBuilder(
  origin: string,
  toPath: (path: string) => string = (path) => path,
): (route: Route, params: unknown) => string {
  const serializedOrigin = parseOrigin(origin);

  return (route, params) => serializedOrigin + toPath(buildPath(route, params));
}

/**
 * Creates a url-to for a Route Set and an Origin.
 *
 * @example
 * ```ts
 * const publicUrlTo = createUrlTo(api, "https://api.example.com");
 * const internalUrlTo = createUrlTo(api, "http://api.internal:8080");
 *
 * publicUrlTo(api.Order, { orderId: "A-1" }); // "https://api.example.com/orders/A-1"
 * internalUrlTo(api.Order, { orderId: "A-1" }); // "http://api.internal:8080/orders/A-1"
 * ```
 */
export function createUrlTo<RouteSetName extends string>(
  _routeSet: RouteSet<RouteSetName>,
  origin: string,
): UrlTo<RouteSetName> {
  const buildUrl = createUrlBuilder(origin);

  return (route, ...[params]) => buildUrl(route, params);
}
