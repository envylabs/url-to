import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  defineRouteSet,
  parseParams,
  parseParamsOrThrow,
  route,
  UrlToError,
} from "../src/index.js";

const shop = defineRouteSet("shop", {
  Search: route("/search/{term}{?page}", {
    params: z.object({
      page: z.string().regex(/^\d+$/).optional(),
      term: z.string().trim().min(1),
    }),
  }),
});

describe("parseParams", () => {
  it("returns the schema's output for a valid record", () => {
    expect(parseParams(shop.Search, { term: "  lamps " })).toEqual({
      data: { term: "lamps" },
      success: true,
    });
  });

  it("merges records and URLSearchParams left to right", () => {
    expect(
      parseParams(
        shop.Search,
        { page: "1", term: "lamps" },
        new URLSearchParams("page=3"),
      ),
    ).toEqual({ data: { page: "3", term: "lamps" }, success: true });
    expect(
      parseParams(shop.Search, new URLSearchParams("page=3"), {
        page: "1",
        term: "lamps",
      }),
    ).toEqual({ data: { page: "1", term: "lamps" }, success: true });
  });

  it("turns repeated URLSearchParams keys into arrays", () => {
    const filters = defineRouteSet("filters", {
      Items: route("/items{?tags}", {
        params: z.object({
          tags: z
            .union([z.string(), z.array(z.string())])
            .transform((tags) => (Array.isArray(tags) ? tags.join("|") : tags)),
        }),
      }),
    });

    expect(
      parseParams(filters.Items, new URLSearchParams("tags=a&tags=b")),
    ).toEqual({ data: { tags: "a|b" }, success: true });
    expect(parseParams(filters.Items, new URLSearchParams("tags=a"))).toEqual({
      data: { tags: "a" },
      success: true,
    });
  });

  it("returns the schema's issues for invalid input", () => {
    expect(
      parseParams(
        shop.Search,
        { term: "lamps" },
        new URLSearchParams("page=x"),
      ),
    ).toEqual({
      issues: [{ message: expect.any(String) as string, path: ["page"] }],
      success: false,
    });
  });

  describe("with a template-only Route", () => {
    const people = defineRouteSet("people", {
      User: route("/users/{userId}{?tab}"),
    });

    it("returns the inferred Route Parameters", () => {
      expect(
        parseParams(
          people.User,
          { userId: "u1" },
          new URLSearchParams("tab=posts"),
        ),
      ).toEqual({ data: { tab: "posts", userId: "u1" }, success: true });
    });

    it("requires path-type Route Parameters to be present and non-empty", () => {
      expect(parseParams(people.User, new URLSearchParams("tab=x"))).toEqual({
        issues: [{ message: "is required", path: ["userId"] }],
        success: false,
      });
      expect(parseParams(people.User, { userId: "" })).toEqual({
        issues: [{ message: "must not be empty", path: ["userId"] }],
        success: false,
      });
    });

    it("ignores keys that aren't variables in the template", () => {
      expect(
        parseParams(
          people.User,
          { userId: "u1" },
          new URLSearchParams("ref=home&tab=posts"),
        ),
      ).toEqual({ data: { tab: "posts", userId: "u1" }, success: true });
    });
  });
});

describe("parseParamsOrThrow", () => {
  it("returns the validated Route Parameters", () => {
    expect(
      parseParamsOrThrow(
        shop.Search,
        { term: " lamps " },
        new URLSearchParams("page=2"),
      ),
    ).toEqual({ page: "2", term: "lamps" });
  });

  it("throws a UrlToError whose message has no values", () => {
    const parse = () =>
      parseParamsOrThrow(
        shop.Search,
        { term: "secret-term" },
        new URLSearchParams("page=secret-page"),
      );

    expect(parse).toThrow(UrlToError);
    expect(parse).toThrow(
      /^Invalid Route Parameters for Route "Search" in Route Set "shop": page: /,
    );
    expect(parse).not.toThrow(/secret/);
  });
});

describe("parsing with an async schema", () => {
  it("throws the same clear error as building", () => {
    const remote = defineRouteSet("remote", {
      Item: route("/items/{id}", {
        params: z.object({
          id: z.string().refine(async () => Promise.resolve(true)),
        }),
      }),
    });
    const error = new TypeError(
      'The Route Parameters schema for Route "Item" in Route Set "remote" validates asynchronously; paths and URLs are built synchronously, so use a synchronous schema',
    );

    expect(() => parseParams(remote.Item, { id: "7" })).toThrow(error);
    expect(() => parseParamsOrThrow(remote.Item, { id: "7" })).toThrow(error);
  });
});
