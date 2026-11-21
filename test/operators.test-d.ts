import { describe, expectTypeOf, it } from "vitest";

import { createPathTo, route, type RouteParameters } from "../src/index.js";

import { operators } from "./fixtures/operators.js";

describe("operator Route Parameters types", () => {
  it("infers required strings for path-type expressions", () => {
    expectTypeOf<RouteParameters<typeof operators.File>>().toEqualTypeOf<{
      path: string;
    }>();
    expectTypeOf<RouteParameters<typeof operators.Label>>().toEqualTypeOf<{
      format: string;
    }>();
    expectTypeOf<RouteParameters<typeof operators.Segments>>().toEqualTypeOf<{
      page: string;
      section: string;
    }>();
    expectTypeOf<RouteParameters<typeof operators.Matrix>>().toEqualTypeOf<{
      id: string;
      mode: string;
    }>();
  });

  it("infers optional strings for query, continuation and fragment expressions", () => {
    expectTypeOf<RouteParameters<typeof operators.Results>>().toEqualTypeOf<{
      page?: string;
      q?: string;
    }>();
    expectTypeOf<
      RouteParameters<typeof operators.AddressBook>
    >().toEqualTypeOf<{
      page?: string;
      sort?: string;
    }>();
    expectTypeOf<RouteParameters<typeof operators.Section>>().toEqualTypeOf<{
      section?: string;
    }>();
  });

  it("mixes required and optional Route Parameters", () => {
    expectTypeOf<RouteParameters<typeof operators.Mixed>>().toEqualTypeOf<{
      id: string;
      q?: string;
    }>();
  });

  it("requires a variable used in both a path-type and a query expression", () => {
    expectTypeOf<RouteParameters<typeof operators.Shared>>().toEqualTypeOf<{
      q: string;
    }>();
  });

  it("makes the params argument optional when every key is optional", () => {
    const pathTo = createPathTo(operators);

    expectTypeOf(pathTo(operators.Results)).toEqualTypeOf<string>();
    expectTypeOf(pathTo(operators.Results, { q: "a" })).toEqualTypeOf<string>();
    // @ts-expect-error: id is required
    pathTo(operators.Mixed, { q: "a" });
    // @ts-expect-error: token isn't a variable in the template
    pathTo(operators.Results, { token: "abc" });
  });
});

describe("operator template syntax types", () => {
  it("rejects prefix modifiers", () => {
    // @ts-expect-error: prefix modifiers are not supported
    route("/items/{id:3}");
    // @ts-expect-error: prefix modifiers are not supported
    route("/search{?q:3}");
  });

  it("rejects operators reserved for future extensions", () => {
    // @ts-expect-error: "=" is reserved
    route("/items/{=id}");
    // @ts-expect-error: "!" is reserved
    route("/items/{!id}");
  });
});
