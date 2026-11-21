import type { RouteDefinition } from "./route.js";
import type { TemplateParameters } from "./template/types.js";

/**
 * The Route Parameters a Route takes. For a template-only Route they are
 * inferred from its template.
 */
export type RouteParameters<R extends RouteDefinition> = TemplateParameters<
  R["template"]
>;

/**
 * The arguments that follow the Route in a path-to or url-to call: none when
 * the Route has no Route Parameters, otherwise a required params object.
 */
export type RouteParametersArgs<R extends RouteDefinition> =
  keyof RouteParameters<R> extends never ? [] : [params: RouteParameters<R>];
