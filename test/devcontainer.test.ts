// Keeps the Dev Container's Node.js image tag pinned to the exact version in
// .tool-versions.
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

function readRepoFile(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const FULL_VERSION = /^\d+\.\d+\.\d+$/;

// The official Node.js image, optionally after a `--platform` flag and with a
// Docker Hub registry or library prefix; captures the tag's version part.
const DOCKERFILE_NODE_TAG =
  /^FROM[ \t]+(?:--platform=\S+[ \t]+)?(?:docker\.io\/)?(?:library\/)?node:([^\s-]+)/im;
const TOOL_VERSIONS_NODEJS = /^nodejs[ \t]+(\S+)/m;

// The Node.js version that .tool-versions and the Dockerfile's `FROM node:`
// line both declare in full, or an error saying why they don't.
function agreedNodeVersion(toolVersions: string, dockerfile: string): string {
  const tag = fullVersion(
    dockerfile,
    DOCKERFILE_NODE_TAG,
    "Dockerfile Node.js image tag",
    "No FROM node: line found in the Dockerfile",
  );
  const declared = fullVersion(
    toolVersions,
    TOOL_VERSIONS_NODEJS,
    ".tool-versions nodejs version",
    "No nodejs version found in .tool-versions",
  );
  if (declared !== tag) {
    throw new Error(
      `Dockerfile Node.js version "${tag}" does not match .tool-versions "${declared}"`,
    );
  }
  return declared;
}

// The full major.minor.patch version that `pattern` captures from `text`, or
// an error when it is missing or incomplete.
function fullVersion(
  text: string,
  pattern: RegExp,
  source: string,
  missing: string,
): string {
  const version = pattern.exec(text)?.[1];
  if (version === undefined) {
    throw new Error(missing);
  }
  if (!FULL_VERSION.test(version)) {
    throw new Error(
      `${source} "${version}" is not a full major.minor.patch version`,
    );
  }
  return version;
}

describe("Dev Container: Node.js version", () => {
  it("matches .tool-versions", () => {
    expect(() =>
      agreedNodeVersion(
        readRepoFile(".tool-versions"),
        readRepoFile(".devcontainer/Dockerfile"),
      ),
    ).not.toThrow();
  });

  it("rejects versions that differ", () => {
    expect(() =>
      agreedNodeVersion("nodejs 26.13.1\n", "FROM node:26.12.0-trixie\n"),
    ).toThrow(
      'Dockerfile Node.js version "26.12.0" does not match .tool-versions "26.13.1"',
    );
  });

  it("rejects a Dockerfile tag that isn't a full version", () => {
    expect(() => agreedNodeVersion("nodejs 26\n", "FROM node:26\n")).toThrow(
      'Dockerfile Node.js image tag "26" is not a full major.minor.patch version',
    );
    expect(() =>
      agreedNodeVersion("nodejs 26.13.1\n", "FROM node:lts-trixie\n"),
    ).toThrow(
      'Dockerfile Node.js image tag "lts" is not a full major.minor.patch version',
    );
  });

  it("rejects a .tool-versions with no recognizable Node.js version", () => {
    expect(() =>
      agreedNodeVersion("python 3.14.0\n", "FROM node:26.13.1-trixie\n"),
    ).toThrow("No nodejs version found in .tool-versions");
    expect(() =>
      agreedNodeVersion("nodejs latest\n", "FROM node:26.13.1-trixie\n"),
    ).toThrow(
      '.tool-versions nodejs version "latest" is not a full major.minor.patch version',
    );
  });

  it("reads a tag after a --platform flag", () => {
    expect(
      agreedNodeVersion(
        "nodejs 26.13.1\n",
        "FROM --platform=linux/amd64 node:26.13.1-trixie\n",
      ),
    ).toBe("26.13.1");
  });

  it("reads a tag with a registry and library prefix", () => {
    expect(
      agreedNodeVersion(
        "nodejs 26.13.1\n",
        "FROM docker.io/library/node:26.13.1-trixie\n",
      ),
    ).toBe("26.13.1");
  });

  it("rejects a Dockerfile with no FROM node: line", () => {
    expect(() =>
      agreedNodeVersion("nodejs 26.13.1\n", "FROM debian:trixie\n"),
    ).toThrow("No FROM node: line found in the Dockerfile");
  });
});
