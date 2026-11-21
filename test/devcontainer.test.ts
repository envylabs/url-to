// Keeps the Dev Container's Node.js image tag pinned to the exact version in
// .tool-versions.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readRepoFile(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const FULL_VERSION = /^\d+\.\d+\.\d+$/;

// The Node.js version that .tool-versions and the Dockerfile's `FROM node:`
// line both declare, or an error saying why they don't agree.
function nodeVersion(toolVersions: string, dockerfile: string): string {
  const tag = /^FROM[ \t]+node:([^\s-]+)/im.exec(dockerfile)?.[1];
  if (tag === undefined) {
    throw new Error("No FROM node: line found in the Dockerfile");
  }
  if (!FULL_VERSION.test(tag)) {
    throw new Error(
      `Dockerfile Node.js image tag "${tag}" is not a full major.minor.patch version`,
    );
  }

  const declared = /^nodejs[ \t]+(\S+)/m.exec(toolVersions)?.[1];
  if (declared === undefined) {
    throw new Error("No nodejs version found in .tool-versions");
  }
  if (!FULL_VERSION.test(declared)) {
    throw new Error(
      `.tool-versions nodejs version "${declared}" is not a full major.minor.patch version`,
    );
  }

  if (declared !== tag) {
    throw new Error(
      `Dockerfile Node.js version "${tag}" does not match .tool-versions "${declared}"`,
    );
  }
  return declared;
}

describe("Dev Container: Node.js version", () => {
  it("matches .tool-versions", () => {
    expect(
      nodeVersion(
        readRepoFile(".tool-versions"),
        readRepoFile(".devcontainer/Dockerfile"),
      ),
    ).toMatch(FULL_VERSION);
  });

  it("rejects versions that differ", () => {
    expect(() =>
      nodeVersion("nodejs 26.13.1\n", "FROM node:26.12.0-trixie\n"),
    ).toThrow(
      'Dockerfile Node.js version "26.12.0" does not match .tool-versions "26.13.1"',
    );
  });

  it("rejects a Dockerfile tag that isn't a full version", () => {
    expect(() => nodeVersion("nodejs 26\n", "FROM node:26\n")).toThrow(
      'Dockerfile Node.js image tag "26" is not a full major.minor.patch version',
    );
    expect(() =>
      nodeVersion("nodejs 26.13.1\n", "FROM node:lts-trixie\n"),
    ).toThrow(
      'Dockerfile Node.js image tag "lts" is not a full major.minor.patch version',
    );
  });

  it("rejects a .tool-versions with no recognizable Node.js version", () => {
    expect(() =>
      nodeVersion("python 3.14.0\n", "FROM node:26.13.1-trixie\n"),
    ).toThrow("No nodejs version found in .tool-versions");
    expect(() =>
      nodeVersion("nodejs latest\n", "FROM node:26.13.1-trixie\n"),
    ).toThrow(
      '.tool-versions nodejs version "latest" is not a full major.minor.patch version',
    );
  });

  it("rejects a Dockerfile with no FROM node: line", () => {
    expect(() =>
      nodeVersion("nodejs 26.13.1\n", "FROM debian:trixie\n"),
    ).toThrow("No FROM node: line found in the Dockerfile");
  });
});
