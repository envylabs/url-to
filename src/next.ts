/**
 * Next.js integration, published as `@envylabs/url-to/next`. This is the only
 * module that refers to `next`, and only to its types.
 */
import type { Route as NextRoute } from "next";

import { buildPath } from "./build.js";
import type { RouteParametersArgs, RouteParametersOutput } from "./params.js";
import {
  defineRouteSet,
  type LiteralName,
  type Route,
  type RouteSet,
} from "./route-set.js";
import type { RouteDefinition } from "./route.js";

/**
 * Builds origin-less paths for the Routes of one Next Route Set. A checked
 * Route's path is typed as Next's `Route`, so it is accepted by `Link`'s
 * `href`, the router methods, `redirect` and `Form`'s `action` when
 * `typedRoutes` is on. A Route declared with `next: false` returns a `string`.
 * The path never includes the app's `basePath`, which Next adds itself.
 */
export type NextPathTo<RouteSetName extends string> = <
  R extends Route<RouteDefinition, string, RouteSetName>,
>(
  route: R,
  ...params: RouteParametersArgs<R>
) => R extends { readonly next: false } ? string : NextRoute;

/**
 * A Route Set whose Routes were checked against the app's Next route patterns
 * by {@link defineNextRouteSet}.
 */
export type NextRouteSet<
  RouteSetName extends string = string,
  Definitions extends Record<string, RouteDefinition> = Record<
    string,
    RouteDefinition
  >,
> = {
  readonly [nextRouteSetBrand]: true;
} & RouteSet<RouteSetName, Definitions>;

/**
 * The app augments this interface with its generated `ParamMap`, once:
 *
 * ```ts
 * import type { ParamMap } from "./.next/types/routes";
 *
 * declare module "@envylabs/url-to/next" {
 *   interface Register {
 *     paramMap: ParamMap;
 *   }
 * }
 * ```
 *
 * Put this in a `.ts` file, not a `.d.ts` file, so that a missing
 * `.next/types/routes` (before `next typegen` has run) is a compile error.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- augmented by the app
export interface Register {}

declare const nextRouteSetBrand: unique symbol;

/** Each Definition's problems, keyed like the Definitions. */
type CheckNextDefinitions<Definitions extends Record<string, RouteDefinition>> =
  {
    readonly [Key in keyof Definitions]: Definitions[Key] extends {
      readonly next: false;
    }
      ? unknown
      : [ParamMapProblem] extends [never]
        ? CheckNextPattern<NextPattern<Definitions[Key]>>
        : ParamMapProblem;
  };

/** `unknown` for a known Next route pattern, or the problem otherwise. */
type CheckNextPattern<Pattern extends string> = Pattern extends KnownNextPattern
  ? unknown
  : [SameShapePatterns<Pattern>] extends [never]
    ? {
        readonly "Not a known Next route pattern": Pattern;
      }
    : {
        readonly "Segment names differ from the Next route pattern": SameShapePatterns<Pattern>;
      };

/** A literal part of a template, cut at the first query or fragment. */
type CutLiteral<Literal extends string> =
  Literal extends `${infer Path}?${string}`
    ? CutLiteral<Path>
    : Literal extends `${infer Path}#${string}`
      ? CutLiteral<Path>
      : Literal;

/**
 * The Next route pattern text for one expression. An expression with no Next
 * equivalent is kept as written, so that the pattern matches nothing and the
 * error shows it.
 */
type ExpressionPattern<
  Body extends string,
  Output,
> = Body extends `/${infer Name}*`
  ? Name extends `${string}${"," | ":" | "*"}${string}`
    ? `{${Body}}`
    : IsOptional<Output, Name> extends true
      ? `/[[...${Name}]]`
      : `/[...${Name}]`
  : Body extends
        `${OperatorCharacter}${string}` | `${string}${"," | ":" | "*"}${string}`
    ? `{${Body}}`
    : `[${Body}]`;

type IsOptional<Output, Name extends string> = Name extends keyof Output
  ? undefined extends Output[Name]
    ? true
    : false
  : false;

/** Keys of the registered `ParamMap`, the app's Next route patterns. */
type KnownNextPattern = Extract<keyof RegisteredParamMap, string>;

/**
 * The Next route pattern derived from a Route's template, using its Route
 * Parameters to tell `[...x]` from `[[...x]]`.
 */
type NextPattern<Definition extends RouteDefinition> = TemplatePattern<
  Definition["template"],
  RouteParametersOutput<Definition>
>;

type OperatorCharacter =
  "," | ";" | "!" | "?" | "." | "@" | "/" | "&" | "#" | "+" | "=" | "|";

/**
 * A problem with the registration itself, or `never`. A ParamMap whose keys
 * aren't literal patterns would accept every template, so it is rejected. That
 * covers `any`, including the error type an unresolved import in a `.d.ts`
 * becomes under `skipLibCheck` (before `next typegen` has run). The error type
 * can't be the checked type of a conditional (the result is `any`), so only
 * `Register` and `string` are.
 */
type ParamMapProblem = Register extends { readonly paramMap: unknown }
  ? string extends keyof RegisteredParamMap
    ? {
        readonly "The registered ParamMap has no literal Next route patterns: run next typegen, and register it from a .ts file": never;
      }
    : never
  : {
      readonly "Register the app's ParamMap with the Register interface of @envylabs/url-to/next": never;
    };

type RegisteredParamMap = Register extends { paramMap: infer ParamMap }
  ? ParamMap
  : never;

/** Known patterns that differ from `Pattern` only in segment names. */
type SameShapePatterns<Pattern extends string> = {
  [Known in KnownNextPattern]: [Shape<Known>] extends [Shape<Pattern>]
    ? [Shape<Pattern>] extends [Shape<Known>]
      ? Known
      : never
    : never;
}[KnownNextPattern];

/** A Next route pattern with its segment names removed. */
type Shape<Pattern extends string> =
  Pattern extends `${infer Before}[[...${string}]]${infer After}`
    ? `${Shape<Before>}[[...]]${Shape<After>}`
    : Pattern extends `${infer Before}[...${string}]${infer After}`
      ? `${Shape<Before>}[...]${Shape<After>}`
      : Pattern extends `${infer Before}[${string}]${infer After}`
        ? `${Before}[]${Shape<After>}`
        : Pattern;

type TemplatePattern<
  Template extends string,
  Output,
> = Template extends `${infer Literal}{${infer Body}}${infer After}`
  ? Literal extends `${string}${"?" | "#"}${string}`
    ? CutLiteral<Literal>
    : Body extends `${"?" | "&" | "#"}${string}`
      ? Literal
      : `${Literal}${ExpressionPattern<Body, Output>}${TemplatePattern<After, Output>}`
  : CutLiteral<Template>;

/**
 * Creates a Next path-to for a Next Route Set.
 */
export function createNextPathTo<RouteSetName extends string>(
  _routeSet: NextRouteSet<RouteSetName>,
): NextPathTo<RouteSetName> {
  // The return type depends on the Route, which the implementation can't see.
  return (route: Route, params?: unknown) => buildPath(route, params);
}

/**
 * Groups Routes into a named Next Route Set, like `defineRouteSet`, and
 * checks every Route against the registered `ParamMap` (see
 * {@link Register}): the Next route pattern derived from its template must be
 * a known one, with the same segment names. A Route declared with
 * `next: false` is not checked.
 *
 * The derived pattern keeps the template's literal path text, maps `{x}` to
 * `[x]`, maps `{/x*}` to `/[...x]` (or `/[[...x]]` when `x` is optional), and
 * ends at the first query, continuation or fragment, literal or expression.
 */
export function defineNextRouteSet<
  const RouteSetName extends string,
  const Definitions extends Record<string, RouteDefinition>,
>(
  routeSetName: LiteralName<RouteSetName> & RouteSetName,
  definitions: CheckNextDefinitions<Definitions> & Definitions,
): NextRouteSet<RouteSetName, Definitions> {
  const routeSet: RouteSet<RouteSetName, Definitions> = defineRouteSet<
    RouteSetName,
    Definitions
  >(routeSetName, definitions);

  // The brand only exists at the type level.
  return routeSet as NextRouteSet<RouteSetName, Definitions>;
}
