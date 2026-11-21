import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";

import {
  defineRouteSet,
  parseParams,
  parseParamsOrThrow,
  route,
  type UrlToIssue,
} from "../src/index.js";

const shop = defineRouteSet("shop", {
  Item: route("/items/{id}", {
    params: z.object({ id: z.string().transform((id) => id.length) }),
  }),
  Search: route("/search{?q,tags*}"),
  User: route("/users/{userId}{?tab}"),
});

describe("parseParams types", () => {
  it("types data with the schema's output", () => {
    const result = parseParams(shop.Item, { id: "7" });

    if (result.success) {
      expectTypeOf(result.data).toEqualTypeOf<{ id: number }>();
    } else {
      expectTypeOf(result.issues).toEqualTypeOf<readonly UrlToIssue[]>();
    }
  });

  it("types data with a template-only Route's inferred Route Parameters", () => {
    const result = parseParams(shop.User, { userId: "u1" });

    if (result.success) {
      expectTypeOf(result.data).toEqualTypeOf<{
        tab?: string;
        userId: string;
      }>();
    }
  });

  it("types an exploded template-only variable as a string or list of strings", () => {
    expectTypeOf(
      parseParamsOrThrow(shop.Search, new URLSearchParams("tags=a")),
    ).toEqualTypeOf<{ q?: string; tags?: string | string[] }>();
  });

  it("accepts Next-style records and URLSearchParams as sources", () => {
    const params: Record<string, string | string[]> = { userId: "u1" };
    const searchParams: Record<string, string | string[] | undefined> = {};

    parseParams(shop.User, params, searchParams, new URLSearchParams());
    parseParams(shop.User);
    // @ts-expect-error: a source is a record or URLSearchParams
    parseParams(shop.User, "userId=u1");
  });
});

describe("parseParamsOrThrow types", () => {
  it("returns the schema's output", () => {
    expectTypeOf(parseParamsOrThrow(shop.Item, { id: "7" })).toEqualTypeOf<{
      id: number;
    }>();
  });
});
