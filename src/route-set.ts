import type { RouteDefinition } from "./route.js";

const routeSetNameKey: unique symbol = Symbol("url-to.routeSetName");

/**
 * A named Route that belongs to a Route Set. `Name` is its key in the Route
 * Set, and `RouteSetName` brands it with the Route Set, so that helpers built
 * for one Route Set reject Routes from another at compile time.
 */
export type Route<
  Definition extends RouteDefinition = RouteDefinition,
  Name extends string = string,
  RouteSetName extends string = string,
> = {
  /** The Route's key in its Route Set. */
  readonly name: Name;
  /** The name of the Route Set this Route belongs to. */
  readonly routeSetName: RouteSetName;
} & Definition;

/**
 * A named collection of Routes, each reachable as a property under its key.
 */
export type RouteSet<
  RouteSetName extends string = string,
  Definitions extends Record<string, RouteDefinition> = Record<
    string,
    RouteDefinition
  >,
> = {
  /** The Route Set's name. Keyed by a symbol so it can't clash with a Route. */
  readonly [routeSetNameKey]: RouteSetName;
} & {
  readonly [Key in keyof Definitions & string]: Route<
    Definitions[Key],
    Key,
    RouteSetName
  >;
};

type LiteralName<Name extends string> = string extends Name
  ? { "Route Set names must be string literals": never }
  : unknown;

/**
 * Groups Routes into a named Route Set. Each Route takes its key as its name
 * and is branded with the Route Set. The name must be a string literal, and
 * should be unique within the application, as it is what tells Route Sets
 * apart at compile time.
 */
export function defineRouteSet<
  const RouteSetName extends string,
  const Definitions extends Record<string, RouteDefinition>,
>(
  routeSetName: LiteralName<RouteSetName> & RouteSetName,
  definitions: Definitions,
): RouteSet<RouteSetName, Definitions> {
  const routeSet = Object.fromEntries(
    Object.entries(definitions).map(([name, definition]) => [
      name,
      Object.freeze({ ...definition, name, routeSetName }),
    ]),
  );

  Object.defineProperty(routeSet, routeSetNameKey, { value: routeSetName });

  // Object.fromEntries can't express the mapped key/name relationship.
  return Object.freeze(routeSet) as unknown as RouteSet<
    RouteSetName,
    Definitions
  >;
}
