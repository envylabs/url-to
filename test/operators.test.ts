import { describe, expect, it } from "vitest";

import { createPathTo, defineRouteSet, route } from "../src/index.js";

describe("RFC 6570 examples (string values)", () => {
  // Section 3.2 variables. Path-type expressions reject empty and undefined
  // values for template-only Routes, so those examples are left out here.
  const values: Record<string, string> = {
    base: "http://example.com/home/",
    dub: "me/too",
    empty: "",
    half: "50%",
    hello: "Hello World!",
    path: "/foo/bar",
    v: "6",
    var: "value",
    who: "fred",
    x: "1024",
    y: "768",
  };

  it.each([
    ["{var}", "value"],
    ["{hello}", "Hello%20World%21"],
    ["{half}", "50%25"],
    ["map?{x,y}", "map?1024,768"],
    ["{x,hello,y}", "1024,Hello%20World%21,768"],
    ["{+var}", "value"],
    ["{+hello}", "Hello%20World!"],
    ["{+half}", "50%25"],
    ["{base}index", "http%3A%2F%2Fexample.com%2Fhome%2Findex"],
    ["{+base}index", "http://example.com/home/index"],
    ["{+path}/here", "/foo/bar/here"],
    ["here?ref={+path}", "here?ref=/foo/bar"],
    ["{+x,hello,y}", "1024,Hello%20World!,768"],
    ["{+path,x}/here", "/foo/bar,1024/here"],
    ["{#var}", "#value"],
    ["{#hello}", "#Hello%20World!"],
    ["{#half}", "#50%25"],
    ["foo{#empty}", "foo#"],
    ["foo{#undef}", "foo"],
    ["{#x,hello,y}", "#1024,Hello%20World!,768"],
    ["{#path,x}/here", "#/foo/bar,1024/here"],
    ["X{.var}", "X.value"],
    ["X{.x,y}", "X.1024.768"],
    ["{.who}", ".fred"],
    ["{.who,who}", ".fred.fred"],
    ["{.half,who}", ".50%25.fred"],
    ["{/who}", "/fred"],
    ["{/who,who}", "/fred/fred"],
    ["{/half,who}", "/50%25/fred"],
    ["{/who,dub}", "/fred/me%2Ftoo"],
    ["{/var}", "/value"],
    ["{/var,x}/here", "/value/1024/here"],
    ["{;who}", ";who=fred"],
    ["{;half}", ";half=50%25"],
    ["{;x,y}", ";x=1024;y=768"],
    ["{?who}", "?who=fred"],
    ["{?half}", "?half=50%25"],
    ["{?x,y}", "?x=1024&y=768"],
    ["{?x,y,empty}", "?x=1024&y=768&empty="],
    ["{?x,y,undef}", "?x=1024&y=768"],
    ["{&who}", "&who=fred"],
    ["{&half}", "&half=50%25"],
    ["?fixed=yes{&x}", "?fixed=yes&x=1024"],
    ["{&x,y,empty}", "&x=1024&y=768&empty="],
  ])("expands %j as %j", (template, expected) => {
    const examples = defineRouteSet("examples", {
      Example: route(`/${template}` as "/"),
    });
    const pathTo = createPathTo(examples) as (
      route: unknown,
      params: Record<string, string>,
    ) => string;
    const params = Object.fromEntries(
      Object.entries(values).filter(([name]) =>
        new RegExp(`[{,.;/?&#+]${name}[,}]`).test(template),
      ),
    );

    expect(pathTo(examples.Example, params)).toBe(`/${expected}`);
  });
});

describe("operator template syntax", () => {
  it.each([
    ["/items/{id:3}", 'prefix modifiers are not supported in "id:3"'],
    ["/search{?q:10}", 'prefix modifiers are not supported in "q:10"'],
    ["/items/{=id}", 'unsupported operator "="'],
    ["/items/{|id}", 'unsupported operator "|"'],
  ])("rejects %j", (template, reason) => {
    expect(() => route(template as "/")).toThrow(
      new TypeError(
        `Invalid Route template ${JSON.stringify(template)}: ${reason}`,
      ),
    );
  });
});

describe("reserved expressions", () => {
  it("keeps reserved characters and escapes the rest", () => {
    const files = defineRouteSet("files", { File: route("/files{+path}") });
    const pathTo = createPathTo(files);

    expect(pathTo(files.File, { path: "/docs/a b?c=d#e" })).toBe(
      "/files/docs/a%20b?c=d#e",
    );
  });
});

describe("path-type expressions", () => {
  const docs = defineRouteSet("docs", {
    Label: route("/report{.format}"),
    Matrix: route("/items{;id,mode}"),
    Segments: route("/docs{/section,page}"),
  });
  const pathTo = createPathTo(docs);

  it("expands a label expression", () => {
    expect(pathTo(docs.Label, { format: "c sv" })).toBe("/report.c%20sv");
  });

  it("expands a path-segment expression", () => {
    expect(pathTo(docs.Segments, { page: "a/b", section: "intro" })).toBe(
      "/docs/intro/a%2Fb",
    );
  });

  it("expands a path-style parameter expression", () => {
    expect(pathTo(docs.Matrix, { id: "7", mode: "full view" })).toBe(
      "/items;id=7;mode=full%20view",
    );
  });
});

describe("query, continuation and fragment expressions", () => {
  const search = defineRouteSet("search", {
    AddressBook: route("/account.php?action=address_book{&page,sort}"),
    Help: route("/help#getting-started"),
    Results: route("/search{?q,page}"),
    Section: route("/guide{#section}"),
  });
  const pathTo = createPathTo(search);

  it("expands a query expression", () => {
    expect(pathTo(search.Results, { page: "2", q: "a&b c" })).toBe(
      "/search?q=a%26b%20c&page=2",
    );
  });

  it("leaves out undefined values with no stray separators", () => {
    expect(pathTo(search.Results, { page: "2" })).toBe("/search?page=2");
    expect(pathTo(search.Results, {})).toBe("/search");
    expect(pathTo(search.Results)).toBe("/search");
    expect(pathTo(search.AddressBook, { sort: "name" })).toBe(
      "/account.php?action=address_book&sort=name",
    );
    expect(pathTo(search.AddressBook)).toBe("/account.php?action=address_book");
    expect(pathTo(search.Section)).toBe("/guide");
  });

  it("writes an empty string in a query as name=", () => {
    expect(pathTo(search.Results, { q: "" })).toBe("/search?q=");
    expect(pathTo(search.AddressBook, { page: "" })).toBe(
      "/account.php?action=address_book&page=",
    );
  });

  it("expands a continuation expression after a literal query string", () => {
    expect(pathTo(search.AddressBook, { page: "3", sort: "name" })).toBe(
      "/account.php?action=address_book&page=3&sort=name",
    );
  });

  it("expands a fragment expression, keeping reserved characters", () => {
    expect(pathTo(search.Section, { section: "a/b c" })).toBe("/guide#a/b%20c");
    expect(pathTo(search.Section, { section: "" })).toBe("/guide#");
  });

  it("keeps a literal fragment", () => {
    expect(pathTo(search.Help)).toBe("/help#getting-started");
  });
});
