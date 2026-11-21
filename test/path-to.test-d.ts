import { describe, expectTypeOf, it } from "vitest";

import {
  createPathTo,
  defineRouteSet,
  route,
  type RouteParameters,
  UrlToError,
  type UrlToIssue,
} from "../src/index.js";

import { app, shapes, store } from "./fixtures/route-sets.js";

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

describe("template-only Route Parameters types", () => {
  it("infers a required string for each variable", () => {
    expectTypeOf<RouteParameters<typeof app.Item>>().toEqualTypeOf<{
      id: string;
    }>();
    expectTypeOf<RouteParameters<typeof app.ItemReview>>().toEqualTypeOf<{
      itemId: string;
      reviewId: string;
    }>();
  });

  it("infers every variable in a variable list", () => {
    expectTypeOf<RouteParameters<typeof shapes.Size>>().toEqualTypeOf<{
      x: string;
      y: string;
    }>();
  });

  it("requires the params argument when the Route has variables", () => {
    const pathTo = createPathTo(app);

    expectTypeOf(pathTo(app.Item, { id: "42" })).toEqualTypeOf<string>();
    // @ts-expect-error: app.Item requires Route Parameters
    pathTo(app.Item);
  });

  it("rejects missing keys", () => {
    const pathTo = createPathTo(app);

    // @ts-expect-error: id is missing
    pathTo(app.Item, {});
    // @ts-expect-error: reviewId is missing
    pathTo(app.ItemReview, { itemId: "7" });
  });

  it("rejects extra keys", () => {
    const pathTo = createPathTo(app);

    // @ts-expect-error: token isn't a variable in the template
    pathTo(app.Item, { id: "42", token: "abc" });
  });

  it("rejects non-string values", () => {
    const pathTo = createPathTo(app);

    // @ts-expect-error: id must be a string
    pathTo(app.Item, { id: undefined });
  });
});

describe("route template syntax types", () => {
  it("rejects malformed templates", () => {
    // @ts-expect-error: unclosed "{"
    route("/items/{id");
    // @ts-expect-error: unmatched "}"
    route("/items/id}");
    // @ts-expect-error: empty expression
    route("/items/{}");
    // @ts-expect-error: "-" isn't allowed in a variable name
    route("/items/{item-id}");
    // @ts-expect-error: empty segment in a dotted variable name
    route("/items/{a..b}");
  });

  it("accepts dotted and underscored variable names", () => {
    expectTypeOf<RouteParameters<typeof shapes.Names>>().toEqualTypeOf<{
      _owner_1: string;
      "item.id": string;
    }>();
  });
});

describe("UrlToError types", () => {
  it("exposes the Route, the Route Set name and the issues", () => {
    expectTypeOf<UrlToError>().toExtend<Error>();
    expectTypeOf<UrlToError["routeSetName"]>().toEqualTypeOf<string>();
    expectTypeOf<UrlToError["issues"]>().toEqualTypeOf<readonly UrlToIssue[]>();
    expectTypeOf<UrlToIssue["path"]>().toEqualTypeOf<readonly PropertyKey[]>();
  });
});
