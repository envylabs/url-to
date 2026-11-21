// Mirrors the compile-time behaviour shown in README.md. Keep the two in step:
// change one, change the other. The runtime results are in readme.test.ts.
import type { Route as NextRoute } from "next";
import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";

import {
  createPathTo,
  createUrlTo,
  defineRouteSet,
  parseParams,
  route,
  type RouteParameters,
} from "../src/index.js";
import {
  createNextPathTo,
  createNextUrlTo,
  defineNextRouteSet,
} from "../src/next.js";

import "./fixtures/next-param-map.js";

describe("README: Routes and Route Sets", () => {
  it("requires exactly the Route Parameters a Route takes", () => {
    const app = defineRouteSet("app", {
      Home: route("/"),
      Item: route("/items/{id}"),
      Search: route("/search{?q,page}"),
    });
    const pathTo = createPathTo(app);

    expectTypeOf<RouteParameters<typeof app.Item>>().toEqualTypeOf<{
      id: boolean | number | string;
    }>();
    expectTypeOf(pathTo(app.Search)).toEqualTypeOf<string>();
    // @ts-expect-error: id is required
    pathTo(app.Item);
    // @ts-expect-error: the Route has no Route Parameters
    pathTo(app.Home, {});
    // @ts-expect-error: itemId isn't a variable in the template
    pathTo(app.Item, { itemId: "1" });
  });

  it("rejects a Route from another Route Set", () => {
    const app = defineRouteSet("app", { Home: route("/") });
    const admin = defineRouteSet("admin", { Home: route("/") });
    const urlTo = createUrlTo(app, "https://www.example.com");

    // @ts-expect-error: admin.Home belongs to the "admin" Route Set
    urlTo(admin.Home);
  });
});

describe("README: Templates", () => {
  it("rejects unsupported templates", () => {
    // @ts-expect-error: templates must start with /
    route("items/{id}");
    // @ts-expect-error: prefix modifiers are not supported
    route("/items/{id:3}");
  });

  it("accepts lists and records only in exploded expressions", () => {
    const docs = defineRouteSet("docs", {
      Guide: route("/guide{/sections*}"),
      Search: route("/search{?q}"),
    });
    const pathTo = createPathTo(docs);

    pathTo(docs.Guide, { sections: ["install", "next"] });
    // @ts-expect-error: {?q} isn't exploded, so it takes a single value
    pathTo(docs.Search, { q: ["lamp", "desk"] });
  });

  it("rejects an optional value in a simple or reserved expression", () => {
    route("/orders/{orderId}", {
      // @ts-expect-error: a missing orderId would build "/orders/"
      params: z.object({ orderId: z.string().optional() }),
    });
    route("/search{?q}", {
      params: z.object({ q: z.string().optional() }),
    });
  });

  it("allows an optional path segment with a schema", () => {
    const app = defineRouteSet("app", {
      Items: route("/items{/id}", {
        params: z.object({ id: z.string().min(1).optional() }),
      }),
    });

    createPathTo(app)(app.Items);
  });
});

describe("README: Route Parameter schemas", () => {
  const app = defineRouteSet("app", {
    Report: route("/reports/{day}", {
      params: z.object({
        day: z.date().transform((date) => date.toISOString().slice(0, 10)),
      }),
    }),
  });

  it("takes the schema's input type", () => {
    const pathTo = createPathTo(app);

    pathTo(app.Report, { day: new Date() });
    // @ts-expect-error: day takes a Date, the schema's input
    pathTo(app.Report, { day: "2026-03-01" });
  });

  it("parses to the schema's output type", () => {
    const result = parseParams(app.Report, { day: new Date() });

    if (result.success) {
      expectTypeOf(result.data).toEqualTypeOf<{ day: string }>();
    }
  });

  it("parses a Next page's awaited params and searchParams", () => {
    const params: { id: string } = { id: "7" };
    const searchParams: Record<string, string | string[] | undefined> = {};
    const routes = defineRouteSet("routes", {
      ItemSearch: route("/items/{id}{?q,tags*}"),
    });

    expectTypeOf(
      parseParams(routes.ItemSearch, params, searchParams),
    ).toHaveProperty("success");
  });

  it("rejects a schema whose keys don't match the template", () => {
    route("/items/{itemId}", {
      // @ts-expect-error: the template's variable is itemId
      params: z.object({ itemID: z.string() }),
    });
  });
});

describe("README: meta", () => {
  it("keeps meta's literal type", () => {
    const app = defineRouteSet("app", {
      Orders: route("/orders", { meta: { title: "Orders" } }),
    });

    expectTypeOf(app.Orders.meta).toEqualTypeOf<{
      readonly title: "Orders";
    }>();
  });
});

describe("README: Next.js", () => {
  const web = defineNextRouteSet("web", {
    Docs: route("/docs{/slug*}"),
    Home: route("/"),
    Item: route("/items/{id}{?tab}"),
    Robots: route("/robots.txt", { next: false }),
    UserPost: route("/users/{userId}/posts/{postId}"),
  });

  it("types checked Routes as Next's Route", () => {
    const pathTo = createNextPathTo(web);

    expectTypeOf(pathTo(web.Item, { id: "42" })).toEqualTypeOf<NextRoute>();
    expectTypeOf(pathTo(web.Robots)).toEqualTypeOf<string>();
  });

  it("returns a string from the Next url-to", () => {
    const urlTo = createNextUrlTo(web, "https://www.example.com", {
      basePath: "/app",
    });

    expectTypeOf(urlTo(web.Item, { id: "42" })).toEqualTypeOf<string>();
  });

  it("rejects templates that don't match a Next route pattern", () => {
    defineNextRouteSet("web", {
      // @ts-expect-error: /item/[id] isn't a Next route pattern
      Item: route("/item/{id}"),
    });
    defineNextRouteSet("web", {
      // @ts-expect-error: the Next route pattern is /items/[id]
      Item: route("/items/{itemId}"),
    });
  });
});
