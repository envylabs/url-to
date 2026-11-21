// Mirrors the examples in README.md, so that every result shown there is
// checked. Keep the two in step: change one, change the other.
import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  createPathTo,
  createUrlTo,
  defineRouteSet,
  parseParams,
  parseParamsOrThrow,
  route,
  UrlToError,
} from "../src/index.js";
import {
  createNextPathTo,
  createNextUrlTo,
  defineNextRouteSet,
} from "../src/next.js";

import "./fixtures/next-param-map.js";

function thrownBy(build: () => unknown): unknown {
  try {
    build();
  } catch (error) {
    return error;
  }
  throw new Error("expected an error to be thrown");
}

describe("README: Quick start", () => {
  const app = defineRouteSet("app", {
    Home: route("/"),
    Item: route("/items/{id}"),
    Search: route("/search{?q,page}"),
  });

  it("builds paths and URLs", () => {
    const pathTo = createPathTo(app);
    const urlTo = createUrlTo(app, "https://www.example.com");

    expect(pathTo(app.Home)).toBe("/");
    expect(pathTo(app.Item, { id: "a/b c" })).toBe("/items/a%2Fb%20c");
    expect(pathTo(app.Search, { q: "red shoes" })).toBe(
      "/search?q=red%20shoes",
    );
    expect(urlTo(app.Item, { id: "42" })).toBe(
      "https://www.example.com/items/42",
    );
  });
});

describe("README: Routes and Route Sets", () => {
  const app = defineRouteSet("app", {
    Home: route("/"),
    Order: route("/orders/{orderId}"),
  });

  it("names each Route after its key", () => {
    expect(app.Order.name).toBe("Order");
    expect(app.Order.routeSetName).toBe("app");
    expect(app.Order.template).toBe("/orders/{orderId}");
  });
});

describe("README: Templates", () => {
  const docs = defineRouteSet("docs", {
    Download: route("/files/{+path}"),
    Export: route("/reports/{id}{.format}"),
    Filter: route("/items{?filter*}"),
    Guide: route("/guide{/sections*}{#heading}"),
    Map: route("/map{;lat,lng}"),
    Search: route("/search{?q,tags*}"),
    Settings: route("/account.php?action=settings{&tab}"),
  });
  const pathTo = createPathTo(docs);

  it("expands every operator", () => {
    expect(pathTo(docs.Download, { path: "guides/getting started.pdf" })).toBe(
      "/files/guides/getting%20started.pdf",
    );
    expect(pathTo(docs.Export, { format: "csv", id: "7" })).toBe(
      "/reports/7.csv",
    );
    expect(
      pathTo(docs.Guide, { heading: "setup", sections: ["install", "next"] }),
    ).toBe("/guide/install/next#setup");
    expect(pathTo(docs.Map, { lat: 51.5, lng: -0.12 })).toBe(
      "/map;lat=51.5;lng=-0.12",
    );
    expect(pathTo(docs.Search, { q: "lamp", tags: ["new", "sale"] })).toBe(
      "/search?q=lamp&tags=new&tags=sale",
    );
    expect(pathTo(docs.Settings, { tab: "billing" })).toBe(
      "/account.php?action=settings&tab=billing",
    );
    expect(pathTo(docs.Filter, { filter: { color: "red", size: "m" } })).toBe(
      "/items?color=red&size=m",
    );
  });

  it("leaves out undefined optional values", () => {
    expect(pathTo(docs.Search)).toBe("/search");
    expect(pathTo(docs.Settings)).toBe("/account.php?action=settings");
  });

  it("follows RFC 6570 for an empty query value", () => {
    expect(pathTo(docs.Search, { q: "" })).toBe("/search?q=");
  });

  it("rejects an empty path value in a template-only Route", () => {
    expect(() => pathTo(docs.Export, { format: "csv", id: "" })).toThrow(
      UrlToError,
    );
  });

  it("rejects templates that don't start with /", () => {
    expect(() => route("items/{id}" as "/items/{id}")).toThrow(TypeError);
  });
});

describe("README: url-to and Origins", () => {
  const store = defineRouteSet("store", {
    Product: route("/products/{sku}"),
  });

  it("builds URLs against several Origins", () => {
    const publicUrlTo = createUrlTo(store, "https://store.example.com");
    const internalUrlTo = createUrlTo(store, "http://store.internal:8080");

    expect(publicUrlTo(store.Product, { sku: "A-1" })).toBe(
      "https://store.example.com/products/A-1",
    );
    expect(internalUrlTo(store.Product, { sku: "A-1" })).toBe(
      "http://store.internal:8080/products/A-1",
    );
  });

  it("accepts a bare trailing slash", () => {
    const urlTo = createUrlTo(store, "https://store.example.com/");

    expect(urlTo(store.Product, { sku: "A-1" })).toBe(
      "https://store.example.com/products/A-1",
    );
  });

  it("rejects an Origin with anything but a scheme, host and port", () => {
    expect(() => createUrlTo(store, "https://example.com/shop")).toThrow(
      "Invalid Origin: must not include a path",
    );
    expect(() => createUrlTo(store, "https://example.com?ref=1")).toThrow(
      "Invalid Origin: must not include a query",
    );
    expect(() => createUrlTo(store, "https://example.com#top")).toThrow(
      "Invalid Origin: must not include a fragment",
    );
    expect(() => createUrlTo(store, "https://user:pw@example.com")).toThrow(
      "Invalid Origin: must not include credentials",
    );
    expect(() => createUrlTo(store, "example.com")).toThrow(
      "Invalid Origin: must be an absolute URL with a scheme and host",
    );
  });
});

describe("README: Route Parameter schemas", () => {
  const app = defineRouteSet("app", {
    Order: route("/orders/{orderId}", {
      params: z.object({ orderId: z.number().int().positive() }),
    }),
    Report: route("/reports/{day}", {
      params: z.object({
        day: z.date().transform((date) => date.toISOString().slice(0, 10)),
      }),
    }),
    Team: route("/teams/{slug}", {
      params: z.object({ slug: z.string().trim().toLowerCase().min(1) }),
    }),
  });
  const pathTo = createPathTo(app);

  it("fills the template from the schema's output", () => {
    expect(pathTo(app.Order, { orderId: 1001 })).toBe("/orders/1001");
    expect(pathTo(app.Report, { day: new Date("2026-03-01T12:00:00Z") })).toBe(
      "/reports/2026-03-01",
    );
    expect(pathTo(app.Team, { slug: "  Support " })).toBe("/teams/support");
  });

  it("throws a UrlToError when validation fails", () => {
    expect(() => pathTo(app.Order, { orderId: -1 })).toThrow(UrlToError);
  });

  it("rejects an output key the template doesn't use", () => {
    const loose = defineRouteSet("loose", {
      Order: route("/orders/{orderId}", {
        // @ts-expect-error: stale is not in the template, which is also caught at compile time
        params: z
          .object({ orderId: z.string() })
          .transform((value) => ({ ...value, stale: "x" })),
      }),
    });
    const error = thrownBy(() =>
      createPathTo(loose)(loose.Order, { orderId: "1" }),
    );

    expect(error).toBeInstanceOf(UrlToError);
    expect((error as UrlToError).message).toBe(
      'Invalid Route Parameters for Route "Order" in Route Set "loose": stale: is not a variable in the template',
    );
  });

  it("rejects an asynchronous schema", () => {
    const slow = defineRouteSet("slow", {
      Item: route("/items/{id}", {
        params: z.object({
          id: z.string().refine(async (id) => Promise.resolve(id !== "")),
        }),
      }),
    });

    expect(() => createPathTo(slow)(slow.Item, { id: "1" })).toThrow(TypeError);
  });
});

describe("README: meta", () => {
  const app = defineRouteSet("app", {
    Orders: route("/orders", { meta: { title: "Orders" } }),
  });

  it("keeps meta on the Route", () => {
    expect(app.Orders.meta.title).toBe("Orders");
  });
});

describe("README: Errors", () => {
  const app = defineRouteSet("app", {
    Invite: route("/invites/{token}", {
      params: z.object({ token: z.string().length(32) }),
    }),
  });
  const pathTo = createPathTo(app);

  it("names the Route and failing keys, never the values", () => {
    const error = thrownBy(() => pathTo(app.Invite, { token: "secret-value" }));

    expect(error).toBeInstanceOf(UrlToError);
    const urlToError = error as UrlToError;
    expect(urlToError.message).toBe(
      'Invalid Route Parameters for Route "Invite" in Route Set "app": token: Too small: expected string to have exactly 32 characters',
    );
    expect(urlToError.message).not.toContain("secret-value");
    expect(urlToError.route).toBe(app.Invite);
    expect(urlToError.routeSetName).toBe("app");
    expect(urlToError.issues).toEqual([
      {
        message: "Too small: expected string to have exactly 32 characters",
        path: ["token"],
      },
    ]);
  });
});

describe("README: Reverse parsing", () => {
  const app = defineRouteSet("app", {
    ItemSearch: route("/items/{id}{?q,tags*}"),
    Orders: route("/accounts/{accountId}/orders{?page}", {
      params: z.object({
        accountId: z.string().min(1),
        page: z.coerce.number().int().positive().optional(),
      }),
    }),
  });

  it("parses merged sources", () => {
    const result = parseParams(
      app.Orders,
      { accountId: "acct_1" },
      new URLSearchParams("page=2"),
    );

    expect(result).toEqual({
      data: { accountId: "acct_1", page: 2 },
      success: true,
    });
  });

  it("reports issues instead of throwing", () => {
    const result = parseParams(app.Orders, { accountId: "" });

    expect(result.success).toBe(false);
  });

  it("parses template-only Routes, with repeated keys as lists", () => {
    expect(
      parseParamsOrThrow(
        app.ItemSearch,
        { id: "7" },
        new URLSearchParams("q=lamp&tags=new&tags=sale&utm_source=email"),
      ),
    ).toEqual({ id: "7", q: "lamp", tags: ["new", "sale"] });
  });

  it("parses a Next page's params and searchParams records", () => {
    expect(
      parseParamsOrThrow(
        app.ItemSearch,
        { id: "7" },
        { q: "lamp", tags: ["new", "sale"], utm_source: undefined },
      ),
    ).toEqual({ id: "7", q: "lamp", tags: ["new", "sale"] });
  });

  it("builds an optional path segment from a schema", () => {
    const shop = defineRouteSet("shop", {
      Items: route("/items{/id}", {
        params: z.object({ id: z.string().min(1).optional() }),
      }),
    });
    const pathTo = createPathTo(shop);

    expect(pathTo(shop.Items)).toBe("/items");
    expect(pathTo(shop.Items, { id: "7" })).toBe("/items/7");
  });

  it("throws a UrlToError from the throwing variant", () => {
    expect(() => parseParamsOrThrow(app.ItemSearch, {})).toThrow(UrlToError);
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

  it("builds paths without the basePath", () => {
    const pathTo = createNextPathTo(web);

    expect(pathTo(web.Item, { id: "42", tab: "reviews" })).toBe(
      "/items/42?tab=reviews",
    );
    expect(pathTo(web.Docs, { slug: ["guides", "setup"] })).toBe(
      "/docs/guides/setup",
    );
    expect(pathTo(web.Robots)).toBe("/robots.txt");
  });

  it("builds URLs with the basePath", () => {
    const urlTo = createNextUrlTo(web, "https://www.example.com", {
      basePath: "/shop",
    });

    expect(urlTo(web.Item, { id: "42" })).toBe(
      "https://www.example.com/shop/items/42",
    );
    expect(urlTo(web.Home)).toBe("https://www.example.com/shop");
  });
});
