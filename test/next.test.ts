import { describe, expect, it } from "vitest";

import { UrlToError } from "../src/index.js";
import { createNextPathTo } from "../src/next.js";

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
