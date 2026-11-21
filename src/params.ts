import type { RouteDefinition } from "./route.js";
import type {
  StandardSchemaV1,
  StandardSchemaV1InferInput,
  StandardSchemaV1InferOutput,
} from "./standard-schema.js";
import type {
  TemplateParameters,
  TemplateVariables,
} from "./template/types.js";

/**
 * `unknown` when a Route Parameters schema's output keys match the template's
 * variables, or an object describing the mismatch otherwise. Intersect the
 * schema's parameter with it to reject the mismatch at compile time.
 */
export type CheckParamsSchema<
  Template extends string,
  Params extends StandardSchemaV1 | undefined,
> = Params extends StandardSchemaV1
  ? [
      Exclude<TemplateVariables<Template>["name"], OutputKeys<Params>>,
      Exclude<OutputKeys<Params>, TemplateVariables<Template>["name"]>,
    ] extends [never, never]
    ? unknown
    : {
        readonly "Route Parameters schema doesn't match the template": {
          readonly "missing from the schema": Exclude<
            TemplateVariables<Template>["name"],
            OutputKeys<Params>
          >;
          readonly "not in the template": Exclude<
            OutputKeys<Params>,
            TemplateVariables<Template>["name"]
          >;
        };
      }
  : unknown;

/**
 * The Route Parameters a Route takes: its schema's input type, or, for a
 * template-only Route, the parameters inferred from its template.
 */
export type RouteParameters<R extends RouteDefinition> =
  R["params"] extends StandardSchemaV1
    ? StandardSchemaV1InferInput<R["params"]>
    : TemplateParameters<R["template"]>;

/**
 * The arguments that follow the Route in a path-to or url-to call: none when
 * the Route has no Route Parameters, an optional params object when every
 * Route Parameter is optional, otherwise a required params object.
 */
export type RouteParametersArgs<R extends RouteDefinition> =
  keyof RouteParameters<R> extends never
    ? []
    : Partial<RouteParameters<R>> extends RouteParameters<R>
      ? [params?: RouteParameters<R>]
      : [params: RouteParameters<R>];

/**
 * The validated Route Parameters that fill a Route's template: its schema's
 * output type, or, for a template-only Route, the inferred parameters.
 */
export type RouteParametersOutput<R extends RouteDefinition> =
  R["params"] extends StandardSchemaV1
    ? StandardSchemaV1InferOutput<R["params"]>
    : TemplateParameters<R["template"]>;

type OutputKeys<Params extends StandardSchemaV1> =
  keyof StandardSchemaV1InferOutput<Params> & string;
