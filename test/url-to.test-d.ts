import { describe, expectTypeOf, it } from "vitest";

import { createUrlTo, route, type UrlTo } from "../src/index.js";

import { app, store } from "./fixtures/route-sets.js";

describe("createUrlTo types", () => {
  it("returns a UrlTo for the Route Set", () => {
    expectTypeOf(createUrlTo(app, "https://example.com")).toEqualTypeOf<
      UrlTo<"app">
    >();
  });

  it("returns a string", () => {
    const urlTo = createUrlTo(app, "https://example.com");

    expectTypeOf(urlTo(app.Home)).toEqualTypeOf<string>();
    expectTypeOf(urlTo(app.Item, { id: "42" })).toEqualTypeOf<string>();
  });

  it("requires an Origin", () => {
    // @ts-expect-error: the Origin is required
    createUrlTo(app);
  });

  it("takes Route Parameters exactly as path-to does", () => {
    const urlTo = createUrlTo(app, "https://example.com");

    // @ts-expect-error: a Route with no variables takes no Route Parameters
    urlTo(app.Home, {});
    // @ts-expect-error: app.Item requires Route Parameters
    urlTo(app.Item);
    // @ts-expect-error: reviewId is missing
    urlTo(app.ItemReview, { itemId: "7" });
    // @ts-expect-error: token isn't a variable in the template
    urlTo(app.Item, { id: "42", token: "abc" });
  });

  it("rejects a Route from another Route Set", () => {
    const urlTo = createUrlTo(app, "https://example.com");

    // @ts-expect-error: store.Cart belongs to the "store" Route Set
    urlTo(store.Cart);
    // @ts-expect-error: same key and template, but a different Route Set
    urlTo(store.Home);
    // @ts-expect-error: an unnamed RouteDefinition isn't a Route
    urlTo(route("/"));
  });
});
