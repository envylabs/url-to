/**
 * Next.js integration, published as `@envylabs/url-to/next`. This is the only
 * module that refers to `next`, and only to its types.
 */
import type { Route as NextRouteHref } from "next";

import { buildPath, type RouteBuilder } from "./build.js";
import { queryOrFragmentProblem } from "./origin.js";
import type { RouteParametersInput, RouteParametersOutput } from "./params.js";
import {
  defineRouteSet,
  type LiteralName,
  type Route,
  type RouteSet,
} from "./route-set.js";
import type { RouteDefinition } from "./route.js";
import { createUrlBuilder } from "./url-to.js";

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
  ...params: RouteParametersInput<R>
) => R extends { readonly next: false } ? string : NextRouteHref;

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
 * Builds fully-qualified URLs for the Routes of one Next Route Set, against
 * one Origin. Unlike the Next path-to, the URL includes the app's `basePath`.
 */
export type NextUrlTo<RouteSetName extends string> = RouteBuilder<RouteSetName>;

/**
 * The app's Next config that affects its fully-qualified URLs.
 */
export interface NextUrlToOptions {
  /** The app's `basePath` from `next.config`, such as `/docs`. */
  readonly basePath?: string;
}

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
type CheckNextPattern<Pattern extends string> = [
  OptionalPathSegments<Pattern>,
] extends [never]
  ? Pattern extends KnownNextPattern
    ? unknown
    : [SameShapePatterns<Pattern>] extends [never]
      ? {
          readonly "Not a known Next route pattern": Pattern;
        }
      : {
          readonly "Segment names differ from the Next route pattern": SameShapePatterns<Pattern>;
        }
  : {
      readonly "An optional {/x} has no Next route pattern: declare the Route with next: false, or use {/x*}": OptionalPathSegments<Pattern>;
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
  : Body extends `/${infer Name}`
    ? Name extends `${string}${"," | ":"}${string}`
      ? `{${Body}}`
      : IsOptional<Output, Name> extends true
        ? `{${Body}}`
        : `/[${Name}]`
    : Body extends
          | `${OperatorCharacter}${string}`
          | `${string}${"," | ":" | "*"}${string}`
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
 * The names of optional non-exploded path segment expressions (`{/x}`) left
 * in a derived pattern. Next has no optional single dynamic segment.
 */
type OptionalPathSegments<Pattern extends string> =
  Pattern extends `${string}{/${infer Body}}${infer After}`
    ? | (Body extends `${string}${"," | ":" | "*"}${string}` ? never : Body)
      | OptionalPathSegments<After>
    : never;

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
 *
 * @example
 * ```ts
 * export const pathTo = createNextPathTo(web);
 *
 * pathTo(web.Item, { id: "42", tab: "reviews" }); // "/items/42?tab=reviews", typed as Next's Route
 * pathTo(web.Docs, { slug: ["guides", "setup"] }); // "/docs/guides/setup"
 * pathTo(web.Robots); // "/robots.txt", typed as string
 * ```
 */
export function createNextPathTo<RouteSetName extends string>(
  _routeSet: NextRouteSet<RouteSetName>,
): NextPathTo<RouteSetName> {
  // The return type depends on the Route, which the implementation can't see.
  return (route: Route, params?: unknown) => buildPath(route, params);
}

/**
 * Creates a Next url-to for a Next Route Set, an Origin and the app's
 * `basePath`. Under a basePath, the root Route's URL is the basePath with no
 * trailing slash, as Next links it by default.
 *
 * @throws TypeError when the Origin is invalid (as for `createUrlTo`), or the
 * basePath isn't empty or a path prefix that starts with `/`, doesn't end
 * with `/`, has no query or fragment, has only characters valid in a URL
 * path, and has no empty, `.` or `..` segments.
 *
 * @example
 * ```ts
 * const urlTo = createNextUrlTo(web, "https://www.example.com", {
 *   basePath: "/app",
 * });
 *
 * urlTo(web.Item, { id: "42" }); // "https://www.example.com/app/items/42"
 * urlTo(web.Home); // "https://www.example.com/app"
 * ```
 */
export function createNextUrlTo<RouteSetName extends string>(
  _routeSet: NextRouteSet<RouteSetName>,
  origin: string,
  options: NextUrlToOptions = {},
): NextUrlTo<RouteSetName> {
  const basePath = parseBasePath(options.basePath ?? "");
  const buildUrl = createUrlBuilder(origin, (path) =>
    // Like Next, the root path under a basePath is the basePath itself.
    basePath === "" ? path : basePath + path.replace(rootSlash, ""),
  );

  return (route, ...[params]) => buildUrl(route, params);
}

function invalidBasePath(reason: string): TypeError {
  return new TypeError(`Invalid basePath: ${reason}`);
}

/**
 * Validates a basePath by Next's rules: empty for none, or a path prefix that
 * starts with `/` and doesn't end with one. It is a path, so a query,
 * fragment, character that isn't valid unescaped in a path, or empty, `.` or
 * `..` segment is rejected too.
 *
 * @throws TypeError when the basePath breaks one of those rules.
 */
function parseBasePath(basePath: string): string {
  if (basePath === "") {
    return basePath;
  }
  if (!basePath.startsWith("/")) {
    throw invalidBasePath("must start with /");
  }
  if (basePath === "/") {
    throw invalidBasePath(
      "must not be /; leave it out or pass an empty string",
    );
  }
  if (basePath.endsWith("/")) {
    throw invalidBasePath("must not end with /");
  }
  const problem = queryOrFragmentProblem(basePath);
  if (problem !== undefined) {
    throw invalidBasePath(problem);
  }
  if (!pathCharacters.test(basePath)) {
    throw invalidBasePath("must only contain characters valid in a URL path");
  }

  const segments = basePath.slice(1).split("/");
  if (segments.includes("")) {
    throw invalidBasePath("must not include empty segments");
  }
  if (segments.some((segment) => segment === "." || segment === "..")) {
    throw invalidBasePath("must not include . or .. segments");
  }

  return basePath;
}

/**
 * Characters allowed unescaped in a URL path (RFC 3986 `pchar` and `/`), and
 * percent-encoded octets.
 */
const pathCharacters = /^(?:[\w\-.~!$&'()*+,;=:@/]|%[\dA-Fa-f]{2})*$/u;

/** The slash of the root path, before any query or fragment. */
const rootSlash = /^\/(?=$|[?#])/u;

/**
 * Groups Routes into a named Next Route Set, like `defineRouteSet`, and
 * checks every Route against the registered `ParamMap` (see
 * {@link Register}): the Next route pattern derived from its template must be
 * a known one, with the same segment names. A Route declared with
 * `next: false` is not checked.
 *
 * The derived pattern keeps the template's literal path text, maps `{x}` to
 * `[x]`, maps a required `{/x}` to `/[x]`, maps `{/x*}` to `/[...x]` (or
 * `/[[...x]]` when `x` is optional), and ends at the first query,
 * continuation or fragment, literal or expression. An optional `{/x}` has no
 * Next equivalent and is rejected.
 *
 * @example
 * ```ts
 * export const web = defineNextRouteSet("web", {
 *   Docs: route("/docs{/slug*}"), // app/docs/[...slug]/page.tsx
 *   Home: route("/"), // app/page.tsx
 *   Item: route("/items/{id}{?tab}"), // app/items/[id]/page.tsx
 *   Robots: route("/robots.txt", { next: false }), // not a Next route pattern
 *   UserPost: route("/users/{userId}/posts/{postId}"), // app/users/[userId]/posts/[postId]/page.tsx
 * });
 * ```
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
