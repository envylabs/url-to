import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  createPathTo,
  defineRouteSet,
  route,
  UrlToError,
} from "../src/index.js";

import { values } from "./fixtures/values.js";

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

describe("number and boolean values", () => {
  it.each([
    [42, "/items/42"],
    [-1.5, "/items/-1.5"],
    [true, "/items/true"],
    [false, "/items/false"],
  ])("turns %j into a string", (id, expected) => {
    const pathTo = createPathTo(values);

    expect(pathTo(values.Item, { id })).toBe(expected);
  });

  it("escapes the string form", () => {
    const pathTo = createPathTo(values);

    expect(pathTo(values.Search, { q: 1e21 })).toBe("/search?q=1e%2B21");
  });

  it("turns list and record members into strings", () => {
    const pathTo = createPathTo(values);

    expect(pathTo(values.Search, { tags: [1, true] })).toBe(
      "/search?tags=1&tags=true",
    );
    expect(pathTo(values.Search, { tags: { open: false, page: 2 } })).toBe(
      "/search?open=false&page=2",
    );
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY])("rejects %j", (id) => {
    const pathTo = createPathTo(values);
    const error = thrownBy(() => pathTo(values.Item, { id }));

    expect(error.issues).toEqual([
      { message: "must be a finite number", path: ["id"] },
    ]);
  });
});

describe("exploded Route Parameters", () => {
  it("expands a list in an exploded query expression", () => {
    const pathTo = createPathTo(values);

    expect(pathTo(values.Search, { q: "a b", tags: ["red", "x&y"] })).toBe(
      "/search?q=a%20b&tags=red&tags=x%26y",
    );
  });

  it("expands a list in an exploded path segment expression", () => {
    const pathTo = createPathTo(values);

    expect(pathTo(values.Docs, { path: ["guides", "a/b"] })).toBe(
      "/docs/guides/a%2Fb",
    );
  });

  it("accepts a single value in an exploded expression", () => {
    const pathTo = createPathTo(values);

    expect(pathTo(values.Docs, { path: "guides" })).toBe("/docs/guides");
  });

  it("leaves out an empty list or record in a query expression", () => {
    const pathTo = createPathTo(values);

    expect(pathTo(values.Search, { tags: [] })).toBe("/search");
    expect(pathTo(values.Search, { tags: {} })).toBe("/search");
  });

  it("rejects an empty list or record in a path-type expression", () => {
    const pathTo = createPathTo(values);

    expect(thrownBy(() => pathTo(values.Docs, { path: [] })).issues).toEqual([
      { message: "must not be empty", path: ["path"] },
    ]);
    expect(thrownBy(() => pathTo(values.Docs, { path: {} })).issues).toEqual([
      { message: "must not be empty", path: ["path"] },
    ]);
  });

  it("names each value that isn't a string, number, boolean, list or record", () => {
    const pathTo = createPathTo(values) as (
      route: unknown,
      params: Record<string, unknown>,
    ) => string;
    const error = thrownBy(() =>
      pathTo(values.Search, {
        q: new Date(0),
        tags: ["a", ["b"], { c: "d" }, null],
      }),
    );

    expect(error.issues).toEqual([
      {
        message: "must be a string, number, boolean, list or record",
        path: ["q"],
      },
      { message: "must be a string, number or boolean", path: ["tags", 1] },
      { message: "must be a string, number or boolean", path: ["tags", 2] },
      { message: "must be a string, number or boolean", path: ["tags", 3] },
    ]);
  });
});

describe("Route Parameters from a schema", () => {
  it("expands a schema's list output", () => {
    const listings = defineRouteSet("listings", {
      Search: route("/search{?tags*}", {
        params: z.object({
          tags: z.string().transform((tags) => tags.split(" ")),
        }),
      }),
    });
    const pathTo = createPathTo(listings);

    expect(pathTo(listings.Search, { tags: "new sale" })).toBe(
      "/search?tags=new&tags=sale",
    );
  });

  it("expands a schema's record output", () => {
    const listings = defineRouteSet("listings", {
      Search: route("/search{?filter*}", {
        params: z.object({
          filter: z.record(z.string(), z.union([z.string(), z.number()])),
        }),
      }),
    });
    const pathTo = createPathTo(listings);

    expect(pathTo(listings.Search, { filter: { color: "red", size: 3 } })).toBe(
      "/search?color=red&size=3",
    );
  });

  it("expands a schema's number and boolean output", () => {
    const listings = defineRouteSet("listings", {
      Page: route("/pages/{page}{?draft}", {
        params: z.object({
          draft: z.boolean().optional(),
          page: z.coerce.number().int(),
        }),
      }),
    });
    const pathTo = createPathTo(listings);

    expect(pathTo(listings.Page, { draft: true, page: "3" })).toBe(
      "/pages/3?draft=true",
    );
  });
});

describe("RFC 6570 level 4 list and map examples", () => {
  // Section 3.2 list and map variables. Prefix modifiers are excluded.
  const examples: Record<string, unknown> = {
    count: ["one", "two", "three"],
    dom: ["example", "com"],
    empty_keys: {},
    // RFC order matters, so build it from entries rather than a literal.
    keys: Object.fromEntries([
      ["semi", ";"],
      ["dot", "."],
      ["comma", ","],
    ]),
    list: ["red", "green", "blue"],
    x: "1024",
    y: "768",
  };

  it.each([
    ["{count}", "one,two,three"],
    ["{count*}", "one,two,three"],
    ["{/count}", "/one,two,three"],
    ["{/count*}", "/one/two/three"],
    ["{;count}", ";count=one,two,three"],
    ["{;count*}", ";count=one;count=two;count=three"],
    ["{?count}", "?count=one,two,three"],
    ["{?count*}", "?count=one&count=two&count=three"],
    ["{&count*}", "&count=one&count=two&count=three"],
    ["www{.dom*}", "www.example.com"],
    ["{list}", "red,green,blue"],
    ["{list*}", "red,green,blue"],
    ["{keys}", "semi,%3B,dot,.,comma,%2C"],
    ["{keys*}", "semi=%3B,dot=.,comma=%2C"],
    ["{+list}", "red,green,blue"],
    ["{+list*}", "red,green,blue"],
    ["{+keys}", "semi,;,dot,.,comma,,"],
    ["{+keys*}", "semi=;,dot=.,comma=,"],
    ["{#list}", "#red,green,blue"],
    ["{#list*}", "#red,green,blue"],
    ["{#keys}", "#semi,;,dot,.,comma,,"],
    ["{#keys*}", "#semi=;,dot=.,comma=,"],
    ["X{.list}", "X.red,green,blue"],
    ["X{.list*}", "X.red.green.blue"],
    ["X{.keys}", "X.semi,%3B,dot,.,comma,%2C"],
    ["X{.keys*}", "X.semi=%3B.dot=..comma=%2C"],
    ["{/list}", "/red,green,blue"],
    ["{/list*}", "/red/green/blue"],
    ["{/keys}", "/semi,%3B,dot,.,comma,%2C"],
    ["{/keys*}", "/semi=%3B/dot=./comma=%2C"],
    ["{;list}", ";list=red,green,blue"],
    ["{;list*}", ";list=red;list=green;list=blue"],
    ["{;keys}", ";keys=semi,%3B,dot,.,comma,%2C"],
    ["{;keys*}", ";semi=%3B;dot=.;comma=%2C"],
    ["{?list}", "?list=red,green,blue"],
    ["{?list*}", "?list=red&list=green&list=blue"],
    ["{?keys}", "?keys=semi,%3B,dot,.,comma,%2C"],
    ["{?keys*}", "?semi=%3B&dot=.&comma=%2C"],
    ["{&list}", "&list=red,green,blue"],
    ["{&list*}", "&list=red&list=green&list=blue"],
    ["{&keys}", "&keys=semi,%3B,dot,.,comma,%2C"],
    ["{&keys*}", "&semi=%3B&dot=.&comma=%2C"],
    ["{?empty_keys}", ""],
    ["{?empty_keys*}", ""],
    ["{#empty_keys}", ""],
    ["{?x,empty_keys*,y}", "?x=1024&y=768"],
  ])("expands %j as %j", (template, expected) => {
    const rfc = defineRouteSet("rfc", {
      Example: route(`/${template}` as "/"),
    });
    // Non-exploded lists and records are a compile error, so call the
    // path-to untyped to check the engine's RFC behaviour.
    const pathTo = createPathTo(rfc) as (
      route: unknown,
      params: Record<string, unknown>,
    ) => string;
    const params = Object.fromEntries(
      Object.entries(examples).filter(([name]) =>
        new RegExp(`[{,.;/?&#+]${name}[*,}]`).test(template),
      ),
    );

    expect(pathTo(rfc.Example, params)).toBe(`/${expected}`);
  });
});

describe("explode modifier syntax", () => {
  it.each([
    ["/items/{id**}", 'invalid variable name "id**"'],
    ["/items/{*id}", 'invalid variable name "*id"'],
    ["/items/{i*d}", 'invalid variable name "i*d"'],
  ])("rejects %j", (template, reason) => {
    expect(() => route(template as "/")).toThrow(
      new TypeError(
        `Invalid Route template ${JSON.stringify(template)}: ${reason}`,
      ),
    );
  });
});
