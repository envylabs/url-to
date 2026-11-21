import { UrlToError } from "./errors.js";
import type { Route } from "./route-set.js";
import { expandTemplate, parseTemplate } from "./template/engine.js";
import { validateRouteParameters } from "./validate.js";

/**
 * Validates Route Parameters against a Route and expands its template.
 * Shared by every path-to and url-to. Throws {@link UrlToError}.
 */
export function buildPath(route: Route, params: unknown): string {
  const result = validateRouteParameters(route, params);

  if (!result.success) {
    throw new UrlToError(route, result.issues);
  }

  return expandTemplate(parseTemplate(route.template), result.values);
}
