import * as v from "valibot";
import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";

import {
  createPathTo,
  defineRouteSet,
  route,
  type RouteParameters,
} from "../src/index.js";

import { catalog } from "./fixtures/schema-route-sets.js";

describe("Standard Schema Route Parameters types", () => {
  it("takes the schema's input type", () => {
    expectTypeOf<RouteParameters<typeof catalog.Item>>().toEqualTypeOf<{
      id: number;
    }>();
    expectTypeOf<RouteParameters<typeof catalog.ItemReview>>().toEqualTypeOf<{
      itemId: string;
      reviewId: number;
    }>();
  });

  it("accepts the input type and rejects the output type", () => {
    const pathTo = createPathTo(catalog);

    expectTypeOf(pathTo(catalog.Item, { id: 42 })).toEqualTypeOf<string>();
    // @ts-expect-error: the schema takes a number and outputs a string
    pathTo(catalog.Item, { id: "42" });
    // @ts-expect-error: the Route requires Route Parameters
    pathTo(catalog.Item);
  });

  it("keeps inferring template-only Route Parameters", () => {
    expectTypeOf<RouteParameters<typeof catalog.User>>().toEqualTypeOf<{
      userId: string;
    }>();
  });

  it("rejects a Zod schema whose keys don't match the template", () => {
    route("/items/{itemId}", {
      // @ts-expect-error: itemID isn't a variable in the template
      params: z.object({ itemID: z.string() }),
    });
    route("/items/{itemId}/reviews/{reviewId}", {
      // @ts-expect-error: reviewId is missing from the schema
      params: z.object({ itemId: z.string() }),
    });
  });

  it("rejects a Valibot schema whose keys don't match the template", () => {
    route("/items/{id}", {
      // @ts-expect-error: token isn't a variable in the template
      params: v.object({ id: v.string(), token: v.string() }),
    });
  });

  it("rejects an optional key in a simple or reserved expression", () => {
    route("/items/{id}", {
      // @ts-expect-error: a missing id would leave an empty path segment
      params: z.object({ id: z.string().optional() }),
    });
    route("/files{+path}", {
      // @ts-expect-error: a missing path would leave an empty path segment
      params: v.object({ path: v.optional(v.string()) }),
    });
    route("/search/{q}{?q}", {
      // @ts-expect-error: q is also in a simple expression
      params: z.object({ q: z.string().optional() }),
    });
  });

  it("accepts an optional key in other expressions", () => {
    route("/docs{/section,page}{.format}{;mode}", {
      params: z.object({
        format: z.string().optional(),
        mode: z.string().optional(),
        page: z.string().optional(),
        section: z.string(),
      }),
    });
    route("/search{?q}{&page}{#section}", {
      params: v.object({
        page: v.optional(v.string()),
        q: v.optional(v.string()),
        section: v.optional(v.string()),
      }),
    });
  });

  it("makes the params argument optional when every key is optional", () => {
    const docs = defineRouteSet("docs", {
      Results: route("/search{?q}", {
        params: z.object({ q: z.string().optional() }),
      }),
    });
    const pathTo = createPathTo(docs);

    expectTypeOf(pathTo(docs.Results)).toEqualTypeOf<string>();
    expectTypeOf(pathTo(docs.Results, { q: "a" })).toEqualTypeOf<string>();
  });

  it("accepts a schema whose keys match the template", () => {
    expectTypeOf(
      route("/items/{id}", { params: v.object({ id: v.string() }) }).template,
    ).toEqualTypeOf<"/items/{id}">();
  });
});

describe("Route meta types", () => {
  it("keeps the literal type of meta", () => {
    expectTypeOf(catalog.User.meta).toEqualTypeOf<{
      readonly section: "users";
      readonly title: "User";
    }>();
    expectTypeOf(catalog.ItemReview.meta).toEqualTypeOf<{
      readonly title: "Item review";
    }>();
  });

  it("is undefined when a Route has none", () => {
    expectTypeOf(catalog.Item.meta).toEqualTypeOf<undefined>();
    expectTypeOf(route("/").meta).toEqualTypeOf<undefined>();
  });

  it("exposes the schema as params", () => {
    expectTypeOf(route("/").params).toEqualTypeOf<undefined>();
    expectTypeOf(catalog.User.params).toEqualTypeOf<undefined>();
  });
});
