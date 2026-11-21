import * as v from "valibot";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  createPathTo,
  createUrlTo,
  defineRouteSet,
  route,
  UrlToError,
} from "../src/index.js";

import { catalog } from "./fixtures/schema-route-sets.js";

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

describe("Routes with a Standard Schema", () => {
  it("fills the template from a Zod schema's output", () => {
    const pathTo = createPathTo(catalog);

    expect(pathTo(catalog.Item, { id: 42 })).toBe("/items/42");
  });

  it("fills the template from a Valibot schema's output", () => {
    const pathTo = createPathTo(catalog);

    expect(pathTo(catalog.ItemReview, { itemId: "  7 ", reviewId: 2026 })).toBe(
      "/items/7/reviews/2026",
    );
  });

  it("validates an omitted params argument as an empty object", () => {
    const listing = defineRouteSet("listing", {
      Items: route("/items{?page}", {
        params: z.object({ page: z.number().optional() }),
      }),
    });
    const pathTo = createPathTo(listing);
    const urlTo = createUrlTo(listing, "https://example.com");

    expect(pathTo(listing.Items)).toBe("/items");
    expect(urlTo(listing.Items)).toBe("https://example.com/items");
  });

  it("fills a url-to's template from the schema's output", () => {
    const urlTo = createUrlTo(catalog, "https://example.com");

    expect(urlTo(catalog.Item, { id: 42 })).toBe(
      "https://example.com/items/42",
    );
  });

  it("escapes the schema's output", () => {
    const pathTo = createPathTo(catalog);

    expect(pathTo(catalog.Search, { term: " a/b?c " })).toBe(
      "/search/a%2Fb%3Fc",
    );
  });

  it("lets the schema accept values a template-only Route would reject", () => {
    const optionalTerm = defineRouteSet("optionalTerm", {
      Search: route("/search/{term}", {
        params: z.object({ term: z.string().default("all") }),
      }),
    });
    const pathTo = createPathTo(optionalTerm);

    expect(pathTo(optionalTerm.Search, {})).toBe("/search/all");
  });

  it("throws a UrlToError with each failing key from a Zod schema", () => {
    const pathTo = createPathTo(catalog);
    const error = thrownBy(() => pathTo(catalog.Item, { id: -5 }));

    expect(error.route).toBe(catalog.Item);
    expect(error.routeSetName).toBe("catalog");
    expect(error.issues).toHaveLength(1);
    expect(error.issues[0]?.path).toEqual(["id"]);
    expect(error.message).toMatch(
      /^Invalid Route Parameters for Route "Item" in Route Set "catalog": id: /,
    );
  });

  it("throws a UrlToError with each failing key from a Valibot schema", () => {
    const pathTo = createPathTo(catalog);
    const error = thrownBy(() =>
      pathTo(catalog.ItemReview, { itemId: "   ", reviewId: 1 }),
    );

    expect(error.issues.map(({ path }) => path)).toEqual([["itemId"]]);
    expect(error.message).toContain('Route "ItemReview"');
    expect(error.message).toContain("itemId: ");
  });

  it("maps nested issue paths to keys", () => {
    const nested = defineRouteSet("nested", {
      Item: route("/items/{id}", {
        params: v.object({
          id: v.pipe(
            v.object({ value: v.string() }),
            v.transform(({ value }) => value),
          ),
        }),
      }),
    });
    const pathTo = createPathTo(nested);
    const error = thrownBy(() =>
      // @ts-expect-error: value must be a string
      pathTo(nested.Item, { id: { value: 7 } }),
    );

    expect(error.issues.map(({ path }) => path)).toEqual([["id", "value"]]);
  });

  it("lists issues about the whole object without a key", () => {
    const range = defineRouteSet("range", {
      Size: route("/size/{x,y}", {
        params: z
          .object({ x: z.string(), y: z.string() })
          .refine(({ x, y }) => x !== y, "x and y must differ"),
      }),
    });
    const pathTo = createPathTo(range);
    const error = thrownBy(() => pathTo(range.Size, { x: "1", y: "1" }));

    expect(error.issues).toEqual([
      { message: "x and y must differ", path: [] },
    ]);
    expect(error.message).toBe(
      'Invalid Route Parameters for Route "Size" in Route Set "range": x and y must differ',
    );
  });

  it("never includes values in the message", () => {
    const secrets = defineRouteSet("secrets", {
      Reset: route("/reset/{token}", {
        params: z.object({ token: z.string().length(4) }),
      }),
    });
    const pathTo = createPathTo(secrets);
    const error = thrownBy(() =>
      pathTo(secrets.Reset, { token: "secret-token-value" }),
    );

    expect(error.issues[0]?.path).toEqual(["token"]);
    expect(error.message).not.toContain("secret-token-value");
  });

  it("throws when the schema's output has keys the template doesn't use", () => {
    const stale = defineRouteSet("stale", {
      Item: route("/items/{id}", {
        // @ts-expect-error: legacyId isn't in the template, which is also caught at compile time
        params: z
          .object({ id: z.string() })
          .transform((value) => ({ ...value, legacyId: value.id })),
      }),
    });
    const pathTo = createPathTo(stale);
    const error = thrownBy(() => pathTo(stale.Item, { id: "7" }));

    expect(error.issues).toEqual([
      { message: "is not a variable in the template", path: ["legacyId"] },
    ]);
  });

  it("throws when the schema's output leaves out a required variable", () => {
    const partial = defineRouteSet("partial", {
      Item: route("/items/{id}", {
        // @ts-expect-error: an optional id in a simple expression is also caught at compile time
        params: z.object({ id: z.string().optional() }),
      }),
    });
    const pathTo = createPathTo(partial);
    const error = thrownBy(() => pathTo(partial.Item, {}));

    expect(error.issues).toEqual([{ message: "is required", path: ["id"] }]);
  });

  it("throws a clear error naming the Route when the schema is async", () => {
    const remote = defineRouteSet("remote", {
      Item: route("/items/{id}", {
        params: z.object({
          id: z.string().refine(async () => Promise.resolve(true)),
        }),
      }),
    });
    const pathTo = createPathTo(remote);

    expect(() => pathTo(remote.Item, { id: "7" })).toThrow(
      new TypeError(
        'The Route Parameters schema for Route "Item" in Route Set "remote" validates asynchronously; Route Parameters are validated synchronously when building and parsing, so use a synchronous schema',
      ),
    );
  });
});

describe("Route meta", () => {
  it("is kept on the Route", () => {
    expect(catalog.User.meta).toEqual({ section: "users", title: "User" });
    expect(catalog.ItemReview.meta).toEqual({ title: "Item review" });
    expect(catalog.Item.meta).toBeUndefined();
  });

  it("doesn't affect building", () => {
    const pathTo = createPathTo(catalog);

    expect(pathTo(catalog.User, { userId: "u1" })).toBe("/users/u1");
  });
});

describe("schema Routes in path-type expressions", () => {
  const docs = defineRouteSet("docs", {
    Label: route("/report{.format}", {
      params: z.object({ format: z.string().optional() }),
    }),
    Matrix: route("/items{;id,mode}", {
      params: z.object({ id: z.string(), mode: z.string().optional() }),
    }),
    Segments: route("/docs{/section,page}", {
      params: z.object({ page: z.string().optional(), section: z.string() }),
    }),
    Shared: route("/search{?q}/{q}", {
      // @ts-expect-error: q is also in a simple expression, so it can't be optional
      params: z.object({ q: z.string().optional() }),
    }),
  });
  const pathTo = createPathTo(docs);

  it("leaves out undefined optional values with no stray separators", () => {
    expect(pathTo(docs.Label, {})).toBe("/report");
    expect(pathTo(docs.Matrix, { id: "7" })).toBe("/items;id=7");
    expect(pathTo(docs.Segments, { section: "intro" })).toBe("/docs/intro");
  });

  it("lets the schema allow empty strings", () => {
    expect(pathTo(docs.Label, { format: "" })).toBe("/report.");
    expect(pathTo(docs.Matrix, { id: "7", mode: "" })).toBe("/items;id=7;mode");
    expect(pathTo(docs.Segments, { page: "", section: "intro" })).toBe(
      "/docs/intro/",
    );
  });

  it("requires a variable used in any simple expression", () => {
    const error = thrownBy(() => pathTo(docs.Shared, {}));

    expect(error.issues).toEqual([{ message: "is required", path: ["q"] }]);
  });
});

describe("RFC 6570 examples (schema Routes with empty and undefined values)", () => {
  // Section 3.2 variables. A schema decides what is valid, so empty strings
  // and undefined values reach the engine.
  const values: Record<string, string> = {
    empty: "",
    path: "/foo/bar",
    v: "6",
    var: "value",
    who: "fred",
    x: "1024",
    y: "768",
  };
  const passThrough = z.record(z.string(), z.string());

  function expand(template: string): string {
    const examples = defineRouteSet("examples", {
      Example: route(`/${template}` as "/", { params: passThrough as never }),
    });
    const pathTo = createPathTo(examples) as (
      route: unknown,
      params: Record<string, string>,
    ) => string;

    return pathTo(
      examples.Example,
      Object.fromEntries(
        Object.entries(values).filter(([name]) =>
          new RegExp(`[{,.;/?&#+]${name}[,}]`).test(template),
        ),
      ),
    );
  }

  it.each([
    ["O{empty}X", "OX"],
    ["?{x,empty}", "?1024,"],
    ["O{+empty}X", "OX"],
    ["up{+path}{var}/here", "up/foo/barvalue/here"],
    ["X{.empty}", "X."],
    ["X{.undef}", "X"],
    ["{/var,empty}", "/value/"],
    ["{/var,undef}", "/value"],
    ["{;empty}", ";empty"],
    ["{;v,empty,who}", ";v=6;empty;who=fred"],
    ["{;v,bar,who}", ";v=6;who=fred"],
    ["{;x,y,empty}", ";x=1024;y=768;empty"],
    ["{;x,y,undef}", ";x=1024;y=768"],
  ])("expands %j as %j", (template, expected) => {
    expect(expand(template)).toBe(`/${expected}`);
  });

  it.each(["O{undef}X", "?{x,undef}", "?{undef,y}", "O{+undef}X"])(
    "rejects an undefined value in a simple or reserved expression: %j",
    (template) => {
      const error = thrownBy(() => expand(template));

      expect(error.issues).toEqual([
        { message: "is required", path: ["undef"] },
      ]);
    },
  );
});
