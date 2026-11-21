import { describe, expect, it } from "vitest";

import {
  createPathTo,
  defineRouteSet,
  route,
  UrlToError,
} from "../src/index.js";

import { app, shapes } from "./fixtures/route-sets.js";

function thrownBy(build: () => unknown): UrlToError {
  try {
    build();
  } catch (error) {
    if (error instanceof UrlToError) {
      return error;
    }
    throw error;
  }
  throw new Error("expected a UrlToError to be thrown");
}

describe("createPathTo", () => {
  it("builds the path of a Route with no variables", () => {
    const pathTo = createPathTo(app);

    expect(pathTo(app.Home)).toBe("/");
    expect(pathTo(app.About)).toBe("/about/team");
  });

  it("fills a simple expression from the Route Parameters", () => {
    const pathTo = createPathTo(app);

    expect(pathTo(app.Item, { id: "42" })).toBe("/items/42");
  });

  it("fills every expression in the template", () => {
    const pathTo = createPathTo(app);

    expect(pathTo(app.ItemReview, { itemId: "7", reviewId: "2026-01" })).toBe(
      "/items/7/reviews/2026-01",
    );
  });

  it("fills a list of variables in one expression", () => {
    const pathTo = createPathTo(shapes);

    expect(pathTo(shapes.Size, { x: "1024", y: "768" })).toBe("/size/1024,768");
  });

  it("fills dotted and underscored variable names", () => {
    const pathTo = createPathTo(shapes);

    expect(pathTo(shapes.Names, { _owner_1: "ann", "item.id": "7" })).toBe(
      "/7/ann",
    );
  });

  it.each([
    ["a/b", "a%2Fb"],
    ["a?b", "a%3Fb"],
    ["a&b=c", "a%26b%3Dc"],
    ["a#b", "a%23b"],
    ["a b", "a%20b"],
    ["100%", "100%25"],
    ["!'()*", "%21%27%28%29%2A"],
    ["café", "caf%C3%A9"],
    ["☃", "%E2%98%83"],
    ["-._~", "-._~"],
  ])("escapes %j as %j", (value, escaped) => {
    const pathTo = createPathTo(app);

    expect(pathTo(app.Item, { id: value })).toBe(`/items/${escaped}`);
  });

  it("throws a UrlToError for an empty string", () => {
    const pathTo = createPathTo(app);
    const error = thrownBy(() => pathTo(app.Item, { id: "" }));

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("UrlToError");
    expect(error.message).toBe(
      'Invalid Route Parameters for Route "Item" in Route Set "app": id: must not be empty',
    );
  });

  it.each([
    ["/x{/p*}"],
    ["/x/{p*}"],
    ["/x/{+p*}"],
    ["/x{.p*}"],
    ["/x{;p*}"],
  ] as const)("rejects an empty list member in %s", (template) => {
    const lists = defineRouteSet("lists", { List: route(template) });
    const pathTo = createPathTo(lists);
    const error = thrownBy(() => pathTo(lists.List, { p: ["a", ""] }));

    expect(error.issues).toEqual([
      { message: "must not be empty", path: ["p", 1] },
    ]);
  });

  it("rejects an empty record member in a path-type expression", () => {
    const records = defineRouteSet("records", { Record: route("/x{/r*}") });
    const pathTo = createPathTo(records);
    const error = thrownBy(() =>
      pathTo(records.Record, { r: { a: "1", b: "" } }),
    );

    expect(error.issues).toEqual([
      { message: "must not be empty", path: ["r", "b"] },
    ]);
  });

  it("allows an empty list member in a query expression", () => {
    const queries = defineRouteSet("queries", { Query: route("/x{?q*}") });
    const pathTo = createPathTo(queries);

    expect(pathTo(queries.Query, { q: ["a", ""] })).toBe("/x?q=a&q=");
  });

  it("names every failing key", () => {
    const pathTo = createPathTo(app);
    const error = thrownBy(() =>
      pathTo(app.ItemReview, { itemId: "", reviewId: "" }),
    );

    expect(error.issues).toEqual([
      { message: "must not be empty", path: ["itemId"] },
      { message: "must not be empty", path: ["reviewId"] },
    ]);
    expect(error.message).toContain("itemId: must not be empty");
    expect(error.message).toContain("reviewId: must not be empty");
  });

  it("throws for a missing key", () => {
    const pathTo = createPathTo(app);
    const error = thrownBy(() =>
      pathTo(app.ItemReview, { itemId: "7" } as {
        itemId: string;
        reviewId: string;
      }),
    );

    expect(error.message).toBe(
      'Invalid Route Parameters for Route "ItemReview" in Route Set "app": reviewId: is required',
    );
  });

  it("throws for a key the template doesn't use, without its value", () => {
    const pathTo = createPathTo(app);
    const params = { id: "42", token: "s3cr3t-t0ken" };
    const error = thrownBy(() => pathTo(app.Item, params));

    expect(error.message).toBe(
      'Invalid Route Parameters for Route "Item" in Route Set "app": token: is not a variable in the template',
    );
    expect(error.message).not.toContain("s3cr3t-t0ken");
    expect(error.message).not.toContain("42");
  });

  it("exposes the Route and its Route Set name", () => {
    const pathTo = createPathTo(app);
    const error = thrownBy(() => pathTo(app.Item, { id: "" }));

    expect(error.route).toBe(app.Item);
    expect(error.routeSetName).toBe("app");
  });
});

describe("route templates", () => {
  it.each([
    ["/items/{id", 'unclosed "{"'],
    ["/items/{id{x}}", 'unclosed "{"'],
    ["/items/id}", 'unmatched "}"'],
    ["/items/{}", 'invalid variable name ""'],
    ["/items/{item-id}", 'invalid variable name "item-id"'],
  ])("rejects %j", (template, reason) => {
    expect(() => route(template as "/")).toThrow(
      new TypeError(
        `Invalid Route template ${JSON.stringify(template)}: ${reason}`,
      ),
    );
  });
});
