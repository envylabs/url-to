import { describe, expect, it } from "vitest";

import { defineRouteSet, route } from "../src/index.js";

import { app } from "./fixtures/route-sets.js";

describe("defineRouteSet", () => {
  it("names each Route after its key", () => {
    expect(app.Home.name).toBe("Home");
    expect(app.About.name).toBe("About");
  });

  it("ties each Route to the Route Set's name", () => {
    expect(app.Home.routeSetName).toBe("app");
    expect(app.About.routeSetName).toBe("app");
  });

  it("keeps each Route's template", () => {
    expect(app.About.template).toBe("/about/team");
  });

  it("gives the same definition a separate identity in each Route Set", () => {
    const definition = route("/shared");
    const first = defineRouteSet("first", { Shared: definition });
    const second = defineRouteSet("second", { Other: definition });

    expect(first.Shared.name).toBe("Shared");
    expect(first.Shared.routeSetName).toBe("first");
    expect(second.Other.name).toBe("Other");
    expect(second.Other.routeSetName).toBe("second");
  });
});

describe("route", () => {
  it("rejects a template that doesn't start with /", () => {
    expect(() => route("items" as "/items")).toThrow(
      'Route templates must start with "/": received "items"',
    );
  });

  it("rejects an empty template", () => {
    expect(() => route("" as "/")).toThrow(/must start with "\/"/);
  });
});
