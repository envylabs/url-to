import { describe, expect, it } from "vitest";

import { createPathTo } from "../src/index.js";

import { app } from "./fixtures/route-sets.js";

describe("createPathTo", () => {
  it("builds the path of a Route with no variables", () => {
    const pathTo = createPathTo(app);

    expect(pathTo(app.Home)).toBe("/");
    expect(pathTo(app.About)).toBe("/about/team");
  });
});
