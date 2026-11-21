import type { Route as NextRoute } from "next";
import { describe, expectTypeOf, it } from "vitest";

import { defineRouteSet, route } from "../src/index.js";
import {
  createNextPathTo,
  defineNextRouteSet,
  type NextRouteSet,
} from "../src/next.js";

import { web } from "./fixtures/next-route-sets.js";

describe("createNextPathTo types", () => {
  it("returns Next's Route type for a checked Route", () => {
    const pathTo = createNextPathTo(web);

    expectTypeOf(pathTo(web.Home)).toEqualTypeOf<NextRoute>();
    expectTypeOf(pathTo(web.Item, { id: "1" })).toEqualTypeOf<NextRoute>();
  });

  it("returns a string for an opted-out Route", () => {
    const pathTo = createNextPathTo(web);

    expectTypeOf(pathTo(web.Robots)).toEqualTypeOf<string>();
  });

  it("takes Route Parameters like the core path-to", () => {
    const pathTo = createNextPathTo(web);

    expectTypeOf(
      pathTo(web.UserPost, { postId: "2", userId: "1" }),
    ).toEqualTypeOf<NextRoute>();
    expectTypeOf(
      pathTo(web.ItemSearch, { id: "1" }),
    ).toEqualTypeOf<NextRoute>();
    // @ts-expect-error: id is required
    pathTo(web.Item);
    // @ts-expect-error: id is missing
    pathTo(web.Item, {});
    // @ts-expect-error: the Route has no Route Parameters
    pathTo(web.Home, {});
  });

  it("rejects a Route from another Route Set", () => {
    const pathTo = createNextPathTo(web);
    const other = defineNextRouteSet("other", { Home: route("/") });

    // @ts-expect-error: other.Home belongs to the "other" Route Set
    pathTo(other.Home);
  });

  it("rejects a Route Set that wasn't defined with defineNextRouteSet", () => {
    const plain = defineRouteSet("plain", { Home: route("/") });

    // @ts-expect-error: plain wasn't checked against the Next route patterns
    createNextPathTo(plain);
  });
});

describe("defineNextRouteSet types", () => {
  it("accepts static, dynamic and route-handler patterns", () => {
    expectTypeOf(
      defineNextRouteSet("checked", {
        About: route("/about"),
        Health: route("/api/health"),
        Home: route("/"),
        Item: route("/items/{id}"),
        UserPost: route("/users/{userId}/posts/{postId}"),
      }),
    ).toExtend<NextRouteSet<"checked">>();
  });

  it("rejects a template with no matching Next route pattern", () => {
    defineNextRouteSet("unknown", {
      // @ts-expect-error: /missing isn't a Next route pattern
      Missing: route("/missing"),
    });
    defineNextRouteSet("unknown", {
      // @ts-expect-error: /items/{id}/edit isn't a Next route pattern
      Edit: route("/items/{id}/edit"),
    });
    defineNextRouteSet("unknown", {
      // @ts-expect-error: a literal segment doesn't match a dynamic one
      Item: route("/items/new"),
    });
  });

  it("rejects variable names that differ from Next's segment names", () => {
    defineNextRouteSet("renamed", {
      // @ts-expect-error: the Next route pattern is /items/[id]
      Item: route("/items/{itemId}"),
    });
    defineNextRouteSet("renamed", {
      // @ts-expect-error: the Next route pattern uses userId and postId
      UserPost: route("/users/{id}/posts/{postId}"),
    });
  });

  it("rejects expressions with no Next equivalent", () => {
    defineNextRouteSet("unmappable", {
      // @ts-expect-error: a reserved expression isn't a Next segment
      Reserved: route("/items/{+id}"),
    });
    defineNextRouteSet("unmappable", {
      // @ts-expect-error: a variable list isn't a Next segment
      List: route("/users/{userId,postId}"),
    });
    defineNextRouteSet("unmappable", {
      // @ts-expect-error: a label expression isn't a Next segment
      Label: route("/items/x{.id}"),
    });
  });

  it("ignores query, continuation and fragment parts", () => {
    expectTypeOf(
      defineNextRouteSet("search", {
        Fragment: route("/items/{id}{#section}"),
        LiteralFragment: route("/about#team"),
        LiteralQuery: route("/items/{id}?view=full{&page}"),
        Query: route("/items/{id}{?q,page}"),
        RootQuery: route("/{?q}"),
      }),
    ).toExtend<NextRouteSet<"search">>();
  });

  it("skips checking a Route declared with next: false", () => {
    expectTypeOf(
      defineNextRouteSet("mixed", {
        Item: route("/items/{id}"),
        Robots: route("/robots.txt", { next: false }),
        Sitemap: route("/sitemaps/{name}.xml", { next: false }),
      }),
    ).toExtend<NextRouteSet<"mixed">>();
  });

  it("requires a literal Route Set name", () => {
    const name = ((): string => "web")();

    // @ts-expect-error: the Route Set name must be a string literal
    defineNextRouteSet(name, {});
  });
});
