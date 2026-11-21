import { describe, expect, it } from "vitest";

import { createUrlTo, UrlToError } from "../src/index.js";

import { app } from "./fixtures/route-sets.js";

describe("createUrlTo", () => {
  it("builds a fully-qualified URL against the Origin", () => {
    const urlTo = createUrlTo(app, "https://example.com");

    expect(urlTo(app.Item, { id: "42" })).toBe("https://example.com/items/42");
  });

  it("builds the root Route as the Origin followed by a slash", () => {
    const urlTo = createUrlTo(app, "https://example.com");

    expect(urlTo(app.Home)).toBe("https://example.com/");
  });

  it("accepts an Origin with a bare trailing slash", () => {
    const urlTo = createUrlTo(app, "https://example.com/");

    expect(urlTo(app.Item, { id: "42" })).toBe("https://example.com/items/42");
    expect(urlTo(app.Home)).toBe("https://example.com/");
  });

  it("keeps an explicit port", () => {
    const urlTo = createUrlTo(app, "http://localhost:3000");

    expect(urlTo(app.About)).toBe("http://localhost:3000/about/team");
  });

  it.each(["example.com", "/items", ""])(
    "rejects an Origin that isn't an absolute URL: %j",
    (origin) => {
      expect(() => createUrlTo(app, origin)).toThrow(
        new TypeError(
          "Invalid Origin: must be an absolute URL with a scheme and host",
        ),
      );
    },
  );

  it.each(["file:///", "mailto:someone@example.com", "data:,"])(
    "rejects an Origin whose scheme has no host: %s",
    (origin) => {
      expect(() => createUrlTo(app, origin)).toThrow(
        new TypeError(
          "Invalid Origin: must be an absolute URL with a scheme and host",
        ),
      );
    },
  );

  it("rejects an Origin with credentials, without echoing them", () => {
    const build = () => createUrlTo(app, "https://user:s3cret@example.com");

    expect(build).toThrow(
      new TypeError("Invalid Origin: must not include credentials"),
    );
    expect(build).not.toThrow(/s3cret/);
  });

  it("rejects an Origin with a path when the url-to is created", () => {
    expect(() => createUrlTo(app, "https://example.com/app")).toThrow(
      new TypeError("Invalid Origin: must not include a path"),
    );
    expect(() => createUrlTo(app, "https://example.com/app/")).toThrow(
      new TypeError("Invalid Origin: must not include a path"),
    );
  });

  it.each([
    "https://example.com?ref=1",
    "https://example.com/?",
    "https://example.com?",
  ])("rejects an Origin with a query: %s", (origin) => {
    expect(() => createUrlTo(app, origin)).toThrow(
      new TypeError("Invalid Origin: must not include a query"),
    );
  });

  it.each([
    "https://example.com#top",
    "https://example.com/#",
    "https://example.com#",
  ])("rejects an Origin with a fragment: %s", (origin) => {
    expect(() => createUrlTo(app, origin)).toThrow(
      new TypeError("Invalid Origin: must not include a fragment"),
    );
  });

  it.each([
    ["a/b", "a%2Fb"],
    ["a?b#c", "a%3Fb%23c"],
    ["café", "caf%C3%A9"],
  ])("escapes %j as path-to does", (value, escaped) => {
    const urlTo = createUrlTo(app, "https://example.com");

    expect(urlTo(app.Item, { id: value })).toBe(
      `https://example.com/items/${escaped}`,
    );
  });

  it("validates Route Parameters as path-to does", () => {
    const urlTo = createUrlTo(app, "https://example.com");
    const build = () => urlTo(app.Item, { id: "" });

    expect(build).toThrow(UrlToError);
    expect(build).toThrow(
      'Invalid Route Parameters for Route "Item" in Route Set "app": id: must not be empty',
    );
  });

  it("serves one Route Set from several Origins", () => {
    const publicUrlTo = createUrlTo(app, "https://www.example.com");
    const internalUrlTo = createUrlTo(app, "http://app.internal:8080");

    expect(publicUrlTo(app.Item, { id: "7" })).toBe(
      "https://www.example.com/items/7",
    );
    expect(internalUrlTo(app.Item, { id: "7" })).toBe(
      "http://app.internal:8080/items/7",
    );
  });
});
