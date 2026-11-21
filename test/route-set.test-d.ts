import { describe, expectTypeOf, it } from "vitest";

import { defineRouteSet, route } from "../src/index.js";

import { app } from "./fixtures/route-sets.js";

describe("route types", () => {
  it("keeps the template's literal type", () => {
    expectTypeOf(route("/about/team").template).toEqualTypeOf<"/about/team">();
  });

  it("rejects a template that doesn't start with /", () => {
    // @ts-expect-error: templates must start with "/"
    route("items");
    // @ts-expect-error: templates must start with "/"
    route("");
    // @ts-expect-error: templates must start with "/"
    route("https://example.com/items");
  });
});

describe("defineRouteSet types", () => {
  it("types each Route's name as its key", () => {
    expectTypeOf(app.Home.name).toEqualTypeOf<"Home">();
    expectTypeOf(app.About.name).toEqualTypeOf<"About">();
  });

  it("types each Route's Route Set name as the literal name", () => {
    expectTypeOf(app.Home.routeSetName).toEqualTypeOf<"app">();
  });

  it("keeps each Route's literal template", () => {
    expectTypeOf(app.About.template).toEqualTypeOf<"/about/team">();
  });

  it("requires a literal Route Set name", () => {
    const name = "app" as string;

    // @ts-expect-error: a widened string can't brand Routes
    defineRouteSet(name, { Home: route("/") });
  });

  it("only accepts Route definitions", () => {
    // @ts-expect-error: a bare string isn't a Route definition
    defineRouteSet("bad", { Home: "/" });
  });
});
