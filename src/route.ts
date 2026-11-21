import type { CheckParamsSchema } from "./params.js";
import type { StandardSchemaV1 } from "./standard-schema.js";
import { parseTemplate } from "./template/engine.js";
import type { CheckTemplate } from "./template/types.js";

/**
 * A Route Definition: a Route before a Route Set names it and brands it with
 * the Route Set.
 */
export interface RouteDefinition<
  Template extends string = string,
  Params extends StandardSchemaV1 | undefined = StandardSchemaV1 | undefined,
  Meta = unknown,
> {
  /** App-specific data attached to the Route, with its literal type. */
  readonly meta: Meta;
  /**
   * `false` when the Route opts out of Next route pattern checking in a Next
   * Route Set. Ignored outside `@envylabs/url-to/next`.
   */
  readonly next?: false;
  /** The Standard Schema for the Route Parameters, if any. */
  readonly params: Params;
  /** The RFC 6570 URI template. Always starts with `/`. */
  readonly template: Template;
}

/**
 * A RouteDefinition with each left-out option typed as `undefined`. A left-out
 * option infers as its constraint, so it needs narrowing back.
 */
type DeclaredRoute<
  Template extends string,
  Params extends StandardSchemaV1 | undefined,
  Meta,
> = RouteDefinition<
  Template,
  [StandardSchemaV1 | undefined] extends [Params] ? undefined : Params,
  unknown extends Meta ? undefined : Meta
>;

/** Marks a Route declared with `next: false`. */
type NextOptOut<Next extends false | undefined> = [Next] extends [false]
  ? { readonly next: false }
  : unknown;

/**
 * Declares a Route from its URI template, with an optional Standard Schema for
 * its Route Parameters and optional `meta`. The template must start with `/`
 * and use only supported RFC 6570 syntax; otherwise it is rejected at compile
 * time and throws a `TypeError` at runtime.
 *
 * @example
 * ```ts
 * route("/orders/{orderId}");
 * ```
 */
export function route<
  const Template extends `/${string}`,
  Params extends StandardSchemaV1 | undefined = undefined,
  const Meta = undefined,
  const Next extends false | undefined = undefined,
>(
  template: CheckTemplate<Template> & Template,
  options?: {
    /** App-specific data, kept with its literal type. */
    readonly meta?: Meta;
    /**
     * `false` opts the Route out of Next route pattern checking in a Next
     * Route Set (for example `/robots.txt` or a path handled by middleware).
     * Its Next path-to then returns a plain `string`.
     */
    readonly next?: Next;
    /**
     * A Standard Schema for the Route Parameters. Its output keys must match
     * the template's variables. Arguments take its input type, and the
     * template is filled from its output.
     */
    readonly params?: CheckParamsSchema<Template, Params> & Params;
  },
): DeclaredRoute<Template, Params, Meta> & NextOptOut<Next> {
  if (!template.startsWith("/")) {
    throw new TypeError(
      `Route templates must start with "/": received ${JSON.stringify(template)}`,
    );
  }

  parseTemplate(template);

  return Object.freeze({
    meta: options?.meta,
    params: options?.params,
    template,
    ...(options?.next === false ? { next: false } : {}),
  }) as DeclaredRoute<Template, Params, Meta> & NextOptOut<Next>;
}
