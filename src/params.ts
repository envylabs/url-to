import type { RouteDefinition } from "./route.js";
import type {
  StandardSchemaV1,
  StandardSchemaV1InferInput,
  StandardSchemaV1InferOutput,
} from "./standard-schema.js";
import type {
  MisplacedListKeys,
  RequiredValueOperator,
  TemplateParameters,
  TemplateVariableNames,
  TemplateVariables,
} from "./template/types.js";

/**
 * `unknown` when a Route Parameters schema's output fits the template, or an
 * object describing each problem otherwise. Intersect the schema's parameter
 * with it to reject a mismatch at compile time. The output keys must equal the
 * template's variables, and a variable in a simple or reserved expression
 * can't be optional, since leaving it out would leave an empty path segment.
 * A variable that isn't exploded in every expression can't be a list or
 * record.
 */
export type CheckParamsSchema<
  Template extends string,
  Params extends StandardSchemaV1 | undefined,
> = Params extends StandardSchemaV1
  ? SchemaProblems<
      TemplateVariables<Template>["name"],
      OutputKeys<Params>,
      OptionalKeys<StandardSchemaV1InferOutput<Params>> &
        TemplateVariableNames<Template, RequiredValueOperator>,
      MisplacedListKeys<Template, StandardSchemaV1InferOutput<Params>>
    >
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

type OptionalKeys<Output> = {
  [Key in keyof Output]-?: undefined extends Output[Key] ? Key : never;
}[keyof Output];

type OutputKeys<Params extends StandardSchemaV1> =
  keyof StandardSchemaV1InferOutput<Params> & string;

type SchemaProblems<
  Variables extends string,
  Keys extends string,
  Optional,
  Misplaced,
> = [
  Exclude<Variables, Keys>,
  Exclude<Keys, Variables>,
  Optional,
  Misplaced,
] extends [never, never, never, never]
  ? unknown
  : {
      readonly "Route Parameters schema doesn't match the template": {
        readonly "list or record in a non-exploded expression": Misplaced;
        readonly "missing from the schema": Exclude<Variables, Keys>;
        readonly "not in the template": Exclude<Keys, Variables>;
        readonly "optional in a simple or reserved expression": Optional;
      };
    };
