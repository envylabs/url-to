// Keeps every `@example` on the public functions an exact excerpt of a README
// `ts` code block, which the README tests already check.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import ts from "typescript";
import { describe, expect, it } from "vitest";

const ENTRY_MODULES = ["src/index.ts", "src/next.ts"];

const DOCUMENTED_FUNCTIONS = [
  "route",
  "defineRouteSet",
  "createPathTo",
  "createUrlTo",
  "parseParams",
  "parseParamsOrThrow",
  "defineNextRouteSet",
  "createNextPathTo",
  "createNextUrlTo",
];

// An `@example` tag's code lines, without the doc comment's ` * ` prefixes,
// the tag name, or the fence lines.
function exampleCode(tag: ts.JSDocTag): string[] {
  const raw = tag.getSourceFile().text.slice(tag.tagName.end, tag.end);
  const lines = raw
    .split("\n")
    .map((line) => line.replace(/^\s*\*(?: |$)/, "").replace(/\s*\*\/$/, ""));
  const opening = lines.findIndex((line) => line === "```ts");
  const closing = lines.indexOf("```", opening + 1);
  if (opening === -1 || closing === -1) {
    return lines;
  }
  return lines.slice(opening + 1, closing);
}

// The code of each `@example` tag on each function exported from the entry
// modules, keyed by the function's name.
function exportedFunctionExamples(): Map<string, string[][]> {
  const program = ts.createProgram(ENTRY_MODULES.map(repoPath), {
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    skipLibCheck: true,
    target: ts.ScriptTarget.ESNext,
  });
  const checker = program.getTypeChecker();
  const examples = new Map<string, string[][]>();

  for (const entry of ENTRY_MODULES) {
    const sourceFile = program.getSourceFile(repoPath(entry));
    const moduleSymbol = sourceFile && checker.getSymbolAtLocation(sourceFile);
    if (moduleSymbol === undefined) {
      throw new Error(`Could not read the module ${entry}`);
    }
    for (const exported of checker.getExportsOfModule(moduleSymbol)) {
      const symbol =
        exported.flags & ts.SymbolFlags.Alias
          ? checker.getAliasedSymbol(exported)
          : exported;
      const functions = (symbol.declarations ?? []).filter(
        ts.isFunctionDeclaration,
      );
      if (functions.length === 0) {
        continue;
      }
      examples.set(
        exported.name,
        functions.flatMap((declaration) =>
          ts
            .getJSDocTags(declaration)
            .filter((tag) => tag.tagName.text === "example")
            .map((tag) => exampleCode(tag)),
        ),
      );
    }
  }
  return examples;
}

// Whether `excerpt` appears as consecutive lines of one of `blocks`.
function isExcerpt(excerpt: string[], blocks: string[][]): boolean {
  return blocks.some((block) =>
    block.some((_, start) =>
      excerpt.every((line, offset) => block[start + offset] === line),
    ),
  );
}

function repoPath(path: string): string {
  return fileURLToPath(new URL(`../${path}`, import.meta.url));
}

// The lines of each `ts` code block in a Markdown document, without the
// fence's indentation.
function tsCodeBlocks(markdown: string): string[][] {
  const blocks: string[][] = [];
  let block: string[] | undefined;
  let indent = "";
  for (const line of markdown.split("\n")) {
    if (block === undefined) {
      const opening = /^(\s*)```ts$/.exec(line);
      if (opening !== null) {
        block = [];
        indent = opening[1] ?? "";
      }
    } else if (line.trim() === "```") {
      blocks.push(block);
      block = undefined;
    } else {
      block.push(line.startsWith(indent) ? line.slice(indent.length) : line);
    }
  }
  return blocks;
}

describe("doc comment examples", () => {
  const examples = exportedFunctionExamples();
  const readmeBlocks = tsCodeBlocks(
    readFileSync(repoPath("README.md"), "utf8"),
  );

  it.each(DOCUMENTED_FUNCTIONS)("%s has an @example", (name) => {
    expect(
      examples.get(name)?.length ?? 0,
      `${name} has no @example`,
    ).toBeGreaterThan(0);
  });

  it("are exact excerpts of README ts code blocks", () => {
    const mismatches = [...examples].flatMap(([name, codes]) =>
      codes
        .filter((code) => code.length === 0 || !isExcerpt(code, readmeBlocks))
        .map(
          (code) =>
            `${name}: @example is not an excerpt of a README ts block:\n${code.join("\n")}`,
        ),
    );
    expect(mismatches, mismatches.join("\n\n")).toEqual([]);
  });
});
