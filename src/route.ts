import { parseTemplate } from "./template/engine.js";
import type { CheckTemplate } from "./template/types.js";

/**
 * An unnamed Route, as returned by {@link route}. It becomes a {@link Route}
 * once it is placed in a Route Set with {@link defineRouteSet}.
 */
export interface RouteDefinition<Template extends string = string> {
  /** The RFC 6570 URI template. Always starts with `/`. */
  readonly template: Template;
}

/**
 * Declares a Route from its URI template. The template must start with `/`
 * and use only supported RFC 6570 syntax; otherwise it is rejected at compile
 * time and throws a `TypeError` at runtime.
 */
export function route<const Template extends `/${string}`>(
  template: CheckTemplate<Template> & Template,
): RouteDefinition<Template> {
  if (!template.startsWith("/")) {
    throw new TypeError(
      `Route templates must start with "/": received ${JSON.stringify(template)}`,
    );
  }

  parseTemplate(template);

  return Object.freeze({ template });
}
