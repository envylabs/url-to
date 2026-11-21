import { UrlToError, type UrlToIssue } from "./errors.js";
import type { Route } from "./route-set.js";
import { expandTemplate, parseTemplate } from "./template/engine.js";

/**
 * Validates Route Parameters against a Route and expands its template.
 * Shared by every path-to and url-to. Throws {@link UrlToError}.
 */
export function buildPath(
  route: Route,
  params: Readonly<Record<string, unknown>> | undefined,
): string {
  const parsed = parseTemplate(route.template);
  const values: Record<string, string> = {};
  const issues: UrlToIssue[] = [];
  const names = new Set<string>();

  for (const { name, operator } of parsed.variables) {
    if (names.has(name)) {
      continue;
    }
    names.add(name);

    const value = params?.[name];
    if (value === undefined) {
      if (operator.pathType) {
        issues.push({ message: "is required", path: [name] });
      }
    } else if (typeof value !== "string") {
      issues.push({ message: "must be a string", path: [name] });
    } else if (value === "" && operator.pathType) {
      issues.push({ message: "must not be empty", path: [name] });
    } else {
      values[name] = value;
    }
  }

  for (const key of Object.keys(params ?? {})) {
    if (!names.has(key)) {
      issues.push({
        message: "is not a variable in the template",
        path: [key],
      });
    }
  }

  if (issues.length > 0) {
    throw new UrlToError(route, issues);
  }

  return expandTemplate(parsed, values);
}
