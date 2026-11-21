import type { Route } from "./route-set.js";

/**
 * One problem with a Route Parameter. Never carries the value.
 */
export interface UrlToIssue {
  /** What is wrong with it. */
  readonly message: string;
  /** The key path of the failing Route Parameter, e.g. `["id"]`. */
  readonly path: readonly PropertyKey[];
}

/**
 * Thrown when a path or URL can't be built from the given Route Parameters.
 * Its message names the Route, the Route Set and each failing key, and never
 * includes Route Parameter values.
 */
export class UrlToError extends Error {
  /** Each failing Route Parameter, with its key path and message. */
  readonly issues: readonly UrlToIssue[];
  override readonly name = "UrlToError";
  /** The Route that failed. */
  readonly route: Route;
  /** The name of the failing Route's Route Set. */
  readonly routeSetName: string;

  constructor(route: Route, issues: readonly UrlToIssue[]) {
    super(
      `Invalid Route Parameters for Route ${JSON.stringify(route.name)} in Route Set ${JSON.stringify(route.routeSetName)}: ${issues
        .map(({ message, path }) => `${path.map(String).join(".")}: ${message}`)
        .join("; ")}`,
    );
    this.route = route;
    this.routeSetName = route.routeSetName;
    this.issues = issues;
  }
}
