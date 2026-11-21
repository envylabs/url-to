import { describe, expectTypeOf, it } from "vitest";

import { createPathTo, defineRouteSet, route } from "../src/index.js";

import { app, store } from "./fixtures/route-sets.js";

describe("createPathTo types", () => {
  it("returns a string for a Route with no variables", () => {
    const pathTo = createPathTo(app);

    expectTypeOf(pathTo(app.Home)).toEqualTypeOf<string>();
  });

  it("takes no second argument for a Route with no variables", () => {
    const pathTo = createPathTo(app);

    // @ts-expect-error: a Route with no variables takes no Route Parameters
    pathTo(app.Home, {});
  });

  it("rejects a Route from another Route Set", () => {
    const pathTo = createPathTo(app);

    // @ts-expect-error: store.Cart belongs to the "store" Route Set
    pathTo(store.Cart);
    // @ts-expect-error: same key and template, but a different Route Set
    pathTo(store.Home);
  });

  it("rejects a Route that hasn't been placed in a Route Set", () => {
    const pathTo = createPathTo(app);

    // @ts-expect-error: an unnamed RouteDefinition isn't a Route
    pathTo(route("/"));
  });

  it("rejects a Route from another Route Set even when the set is empty", () => {
    const empty = defineRouteSet("empty", {});
    const pathTo = createPathTo(empty);

    // @ts-expect-error: app.Home belongs to the "app" Route Set
    pathTo(app.Home);
  });
});
