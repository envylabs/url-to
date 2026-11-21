import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";

import {
  createPathTo,
  defineRouteSet,
  route,
  type RouteParameters,
} from "../src/index.js";

import { values } from "./fixtures/values.js";

type List = readonly Scalar[];
type Record_ = Readonly<Record<string, Scalar>>;
type Scalar = boolean | number | string;

describe("Route Parameter value types", () => {
  it("accepts numbers and booleans for every variable", () => {
    const pathTo = createPathTo(values);

    expectTypeOf(pathTo(values.Item, { id: 42 })).toEqualTypeOf<string>();
    expectTypeOf(pathTo(values.Search, { q: true })).toEqualTypeOf<string>();
  });

  it("accepts lists and records only for exploded variables", () => {
    expectTypeOf<RouteParameters<typeof values.Search>>().toEqualTypeOf<{
      q?: Scalar;
      tags?: List | Record_ | Scalar;
    }>();
    expectTypeOf<RouteParameters<typeof values.Docs>>().toEqualTypeOf<{
      path: List | Record_ | Scalar;
    }>();
  });

  it("rejects a list or record in a non-exploded expression", () => {
    const pathTo = createPathTo(values);

    // @ts-expect-error: id isn't exploded
    pathTo(values.Item, { id: ["1", "2"] });
    // @ts-expect-error: q isn't exploded
    pathTo(values.Search, { q: { a: "b" } });
    // @ts-expect-error: list members must be scalars
    pathTo(values.Search, { tags: [["a"]] });
  });

  it("rejects a list when any occurrence of the variable isn't exploded", () => {
    const shared = defineRouteSet("shared", {
      Search: route("/search/{tags}{?tags*}"),
    });
    const pathTo = createPathTo(shared);

    expectTypeOf<RouteParameters<typeof shared.Search>>().toEqualTypeOf<{
      tags: Scalar;
    }>();
    // @ts-expect-error: tags isn't exploded in the path
    pathTo(shared.Search, { tags: ["a"] });
  });
});

describe("schema value types", () => {
  it("accepts a list or record output for an exploded variable", () => {
    route("/search{?tags*}", {
      params: z.object({ tags: z.array(z.string()) }),
    });
    route("/search{?filter*}", {
      params: z.object({ filter: z.record(z.string(), z.number()) }),
    });
  });

  it("rejects a list or record output for a non-exploded variable", () => {
    route("/search{?tags}", {
      // @ts-expect-error: tags isn't exploded
      params: z.object({ tags: z.array(z.string()) }),
    });
    route("/items/{filter}", {
      // @ts-expect-error: filter isn't exploded
      params: z.object({ filter: z.record(z.string(), z.number()) }),
    });
  });

  it("accepts a list input that the schema turns into a string", () => {
    route("/search{?tags}", {
      params: z.object({
        tags: z.array(z.string()).transform((tags) => tags.join(" ")),
      }),
    });
  });
});

describe("explode modifier syntax types", () => {
  it("rejects a misplaced explode modifier", () => {
    // @ts-expect-error: invalid variable name
    route("/items/{id**}");
    // @ts-expect-error: invalid variable name
    route("/items/{*id}");
    // @ts-expect-error: invalid variable name
    route("/items/{i*d}");
  });
});
