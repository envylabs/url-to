import { describe, expect, it } from "vitest";

import { route, UrlToError } from "../src/index.js";
import {
  createNextPathTo,
  createNextUrlTo,
  defineNextRouteSet,
} from "../src/next.js";

import { web } from "./fixtures/next-route-sets.js";

describe("defineNextRouteSet", () => {
  it("names each Route and brands it with the Route Set", () => {
    expect(web.Item.name).toBe("Item");
    expect(web.Item.routeSetName).toBe("web");
    expect(web.Item.template).toBe("/items/{id}");
  });

  it("keeps the next: false opt-out on the Route", () => {
    expect(web.Robots.next).toBe(false);
    expect(web.Item.next).toBeUndefined();
  });
});

describe("createNextPathTo", () => {
  const pathTo = createNextPathTo(web);

  it("builds static paths", () => {
    expect(pathTo(web.Home)).toBe("/");
    expect(pathTo(web.About)).toBe("/about");
    expect(pathTo(web.Health)).toBe("/api/health");
  });

  it("builds escaped dynamic paths", () => {
    expect(pathTo(web.Item, { id: "a/b c" })).toBe("/items/a%2Fb%20c");
    expect(pathTo(web.UserPost, { postId: "2", userId: "1" })).toBe(
      "/users/1/posts/2",
    );
  });

  it("builds catch-all paths", () => {
    expect(pathTo(web.Docs, { slug: ["guides", "a b"] })).toBe(
      "/docs/guides/a%20b",
    );
    expect(pathTo(web.Docs, { slug: "intro" })).toBe("/docs/intro");
  });

  it("builds optional catch-all paths", () => {
    expect(pathTo(web.Shop)).toBe("/shop");
    expect(pathTo(web.Shop, {})).toBe("/shop");
    expect(pathTo(web.Shop, { slug: ["sale", "new"] })).toBe("/shop/sale/new");
  });

  it("keeps query and fragment parts", () => {
    expect(pathTo(web.ItemSearch, { id: "1", page: "2", q: "a&b" })).toBe(
      "/items/1?q=a%26b&page=2#reviews",
    );
    expect(pathTo(web.ItemSearch, { id: "1" })).toBe("/items/1#reviews");
  });

  it("builds opted-out Routes", () => {
    expect(pathTo(web.Robots)).toBe("/robots.txt");
  });

  it("validates Route Parameters like the core path-to", () => {
    expect(() => pathTo(web.Item, { id: "" })).toThrow(UrlToError);
    expect(() => pathTo(web.Item, { id: "" })).toThrow(
      'Invalid Route Parameters for Route "Item" in Route Set "web": id: must not be empty',
    );
  });
});

describe("createNextUrlTo", () => {
  it("builds a fully-qualified URL that includes the basePath", () => {
    const urlTo = createNextUrlTo(web, "https://example.com", {
      basePath: "/docs-site",
    });

    expect(urlTo(web.Item, { id: "1" })).toBe(
      "https://example.com/docs-site/items/1",
    );
  });

  it("builds the root Route as the basePath, with no trailing slash", () => {
    const urlTo = createNextUrlTo(web, "https://example.com", {
      basePath: "/docs-site",
    });

    expect(urlTo(web.Home)).toBe("https://example.com/docs-site");
  });

  it("keeps the root Route's query and fragment after the basePath", () => {
    const site = defineNextRouteSet("site", {
      Search: route("/{?q}#results"),
    });
    const urlTo = createNextUrlTo(site, "https://example.com", {
      basePath: "/docs-site",
    });

    expect(urlTo(site.Search, { q: "a b" })).toBe(
      "https://example.com/docs-site?q=a%20b#results",
    );
    expect(urlTo(site.Search, {})).toBe(
      "https://example.com/docs-site#results",
    );
  });

  it("builds URLs without a basePath", () => {
    const urlTo = createNextUrlTo(web, "https://example.com/");

    expect(urlTo(web.Home)).toBe("https://example.com/");
    expect(urlTo(web.Item, { id: "1" })).toBe("https://example.com/items/1");
    expect(createNextUrlTo(web, "https://example.com", {})(web.About)).toBe(
      "https://example.com/about",
    );
  });

  it("treats an empty basePath as no basePath, like Next", () => {
    const urlTo = createNextUrlTo(web, "https://example.com", {
      basePath: "",
    });

    expect(urlTo(web.Home)).toBe("https://example.com/");
  });

  it("escapes Route Parameters and keeps query and fragment parts", () => {
    const urlTo = createNextUrlTo(web, "http://localhost:3000", {
      basePath: "/docs-site",
    });

    expect(urlTo(web.Item, { id: "a/b c" })).toBe(
      "http://localhost:3000/docs-site/items/a%2Fb%20c",
    );
    expect(urlTo(web.ItemSearch, { id: "1", q: "a&b" })).toBe(
      "http://localhost:3000/docs-site/items/1?q=a%26b#reviews",
    );
    expect(urlTo(web.Shop, { slug: ["sale", "new"] })).toBe(
      "http://localhost:3000/docs-site/shop/sale/new",
    );
    expect(urlTo(web.Robots)).toBe(
      "http://localhost:3000/docs-site/robots.txt",
    );
  });

  it("validates Route Parameters like the core url-to", () => {
    const urlTo = createNextUrlTo(web, "https://example.com", {
      basePath: "/docs-site",
    });

    expect(() => urlTo(web.Item, { id: "" })).toThrow(UrlToError);
    expect(() => urlTo(web.Item, { id: "" })).toThrow(
      'Invalid Route Parameters for Route "Item" in Route Set "web": id: must not be empty',
    );
  });

  it.each([
    ["docs-site", "must start with /"],
    ["/", "must not be /; leave it out or pass an empty string"],
    ["/docs-site/", "must not end with /"],
    ["/docs-site?a=1", "must not include a query"],
    ["/docs-site#top", "must not include a fragment"],
    ["https://example.com/docs-site", "must start with /"],
    ["/docs site", "must only contain characters valid in a URL path"],
    ["/docs%2", "must only contain characters valid in a URL path"],
    ["/caf\u00e9", "must only contain characters valid in a URL path"],
    ["/apps//docs", "must not include empty segments"],
    ["/apps/./docs", "must not include . or .. segments"],
    ["/apps/..", "must not include . or .. segments"],
  ])(
    "rejects the basePath %j when the url-to is created",
    (basePath, reason) => {
      expect(() =>
        createNextUrlTo(web, "https://example.com", { basePath }),
      ).toThrow(new TypeError(`Invalid basePath: ${reason}`));
    },
  );

  it("accepts a basePath with percent-encoded and sub-delimiter characters", () => {
    const urlTo = createNextUrlTo(web, "https://example.com", {
      basePath: "/caf%C3%A9/v1.2/a-b_c~d!$&'()*+,;=:@",
    });

    expect(urlTo(web.About)).toBe(
      "https://example.com/caf%C3%A9/v1.2/a-b_c~d!$&'()*+,;=:@/about",
    );
  });

  it("keeps a nested basePath as written", () => {
    const urlTo = createNextUrlTo(web, "https://example.com", {
      basePath: "/apps/docs-site",
    });

    expect(urlTo(web.About)).toBe("https://example.com/apps/docs-site/about");
  });

  it.each([
    ["items", "must be an absolute URL with a scheme and host"],
    [
      "mailto:team@example.com",
      "must be an absolute URL with a scheme and host",
    ],
    ["https://user:secret@example.com", "must not include credentials"],
    ["https://example.com/docs-site", "must not include a path"],
    ["https://example.com?a=1", "must not include a query"],
    ["https://example.com#top", "must not include a fragment"],
  ])("rejects the Origin %s like the core url-to", (origin, reason) => {
    expect(() => createNextUrlTo(web, origin)).toThrow(
      new TypeError(`Invalid Origin: ${reason}`),
    );
    expect(() =>
      createNextUrlTo(web, origin, { basePath: "/docs-site" }),
    ).toThrow(new TypeError(`Invalid Origin: ${reason}`));
  });
});
