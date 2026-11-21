Status: resolved

# Spec: `@envylabs/url-to`: typed, validated URL and path construction

## Problem Statement

Developers building TypeScript applications, especially Next.js apps, construct paths and URLs to their own pages and to the external systems they link to (storefronts, admin consoles, third-party dashboards). Those URLs usually get hand-written as string concatenations or template literals across the codebase. The result:

- Dynamic segments and query values often aren't URI-escaped, so a value with `/`, `?`, `&`, or a space produces a broken or wrong link.
- Nothing checks that required values were given, that optional ones are really optional, or that values are well-formed (non-empty, the right shape) before they go into a URL.
- Paths are scattered, so moving a page means a risky find-and-replace across many files, and links that were missed fail silently at runtime.
- A new developer has no single place to find out which destinations exist or what each one needs.
- In Next.js, a hand-built string has no tie to the app's real file-system routes, so a template and its Next route pattern can drift apart (a renamed segment, a moved page) with no compiler error.
- Teams that already solve this in-house end up copying near-identical helpers once per Origin, with inconsistent validation and error messages that leak sensitive values (emails, tokens) into logs.

## Solution

A public, MIT-licensed, ESM-only, tree-shakable npm package, `@envylabs/url-to`, with zero runtime dependencies.

Developers declare each known destination once, as a **Route** (a named RFC 6570 URI template plus an optional Standard Schema for its **Route Parameters**), and group Routes into a **Route Set**. From a Route Set they create helpers:

- a **path-to** that builds an escaped, validated path, and
- a **url-to** that builds a fully-qualified URL against a given **Origin**.

Call sites pass the Route as a value (not a string name), so the editor's rename and find-references work and typing the Route Set's name lists every destination. Route Parameter types are inferred from the template and checked against the schema at compile time. Values are validated at runtime and escaped by the template engine. A reverse parser validates incoming params and search params against a Route.

A separate entry point, `@envylabs/url-to/next`, binds a Route Set to the app's Next.js route patterns. Once the app registers its generated `ParamMap`, every template in a Next Route Set is checked against a known Next route pattern, including the segment parameter names, and its path-to returns Next's `Route` type so the result is accepted by `Link`'s `href` and the router methods when `typedRoutes` is on.

## User Stories

### Defining Routes and Route Sets

1. As an application developer, I want to declare each known destination once as a named Route, so that there is a single choke point for every path my app links to.
2. As an application developer, I want to group Routes into a named Route Set, so that destinations served together (my app, a storefront, an admin console) are organized and discoverable.
3. As an application developer, I want to define a Route with only a URI template, so that simple destinations take no ceremony.
4. As an application developer, I want a Route with only a template to infer its Route Parameters from the template, so that `/items/{id}` alone requires an `id` string with no schema.
5. As an application developer, I want to attach a Standard Schema to a Route's Route Parameters, so that I can enforce rules beyond "a string is present" (non-empty, enums, formats, coercion).
6. As an application developer using Zod, Valibot, or ArkType, I want to use my existing validator, so that I don't adopt a second validation library.
7. As an application developer, I want a compile error when my schema's keys don't match the template's variables, so that a typo like `{itemID}` against `itemId` is caught before runtime.
8. As an application developer, I want to attach arbitrary typed `meta` to a Route, so that I can build app-specific features (page titles, breadcrumbs, analytics names) on top of the Route.
9. As an application developer, I want each Route to know its own name and its Route Set, so that error messages identify exactly which destination failed.
10. As an application developer, I want to move a page by changing only its template, so that every call site follows automatically.
11. As an application developer, I want to rename a Route with my editor's rename refactor and have every call site update, so that renames are safe and complete.
12. As an application developer, I want Find All References on a Route to list every place that links to it, so that I can judge the impact of moving or removing it.
13. As a new developer, I want to type a Route Set's name and see every Route in autocomplete, so that I can find destinations without asking anyone.
14. As an application developer, I want templates that don't start with `/` rejected at compile time and at runtime, so that every Route is unambiguously rooted.
15. As an application developer, I want to include literal query strings in a template (e.g. `/account.php?action=address_book`), mixed with continuation expressions, so that I can model legacy and third-party URLs exactly.
16. As an application developer, I want to use fragments in templates, both literal and as expressions, so that I can link to sections of a page.
17. As an application developer, I want every RFC 6570 operator (simple, reserved, fragment, label, path segment, path-style parameter, query, query continuation) and the explode modifier, so that I can model any real-world URL shape.
18. As an application developer, I want prefix modifiers (`{var:3}`) rejected, so that values are never silently truncated after being validated.

### Building paths and URLs

19. As an application developer, I want to create a path-to for a Route Set, so that I can build origin-less paths for same-origin links.
20. As an application developer, I want to create a url-to for a Route Set and an Origin, so that I can build fully-qualified URLs for emails, redirects, external links, and server-to-server calls.
21. As an application developer, I want to create several url-tos for one Route Set with different Origins, so that the same Routes can produce public and internal URLs.
22. As an application developer, I want a Route with no Route Parameters to take no second argument, so that call sites stay terse.
23. As an application developer, I want a Route with required Route Parameters to require the argument, so that I can't forget them.
24. As an application developer, I want the argument typed as the schema's input type, so that I can pass values the schema will coerce or transform (numbers, dates).
25. As an application developer, I want the template filled from the schema's parsed output, so that transforms (trimming, coercion, ISO formatting) are reflected in the URL.
26. As an application developer, I want every dynamic value URI-escaped by the operator's rules, so that values containing reserved characters produce correct URLs.
27. As an application developer, I want to pass numbers and booleans as Route Parameters, so that I don't have to stringify them by hand.
28. As an application developer, I want to pass arrays and records to explode-capable expressions (e.g. `{?tags*}`), so that multi-valued query parameters work.
29. As an application developer, I want a compile error when I pass an array or record to an expression that can't represent it, so that I don't produce malformed URLs.
30. As an application developer, I want undefined optional values left out cleanly from query, continuation, path-segment, path-style, label, and fragment expressions, so that optional parameters don't leave stray separators.
31. As an application developer, I want a compile error when an optional Route Parameter appears in a simple or reserved expression (e.g. a bare `{id}` path segment), so that a missing value can never produce a path like `/items/`.
32. As an application developer, I want an empty string in a query value to follow RFC 6570 (producing `?email=`), so that the behaviour is predictable and documented.
33. As an application developer, I want template-only Routes to reject empty strings for path-type variables at runtime, so that inferred parameters still give known-good URLs without a schema.
34. As an application developer, I want url-to to return a plain string, so that the result drops into `href`, `fetch`, `redirect`, and string interpolation with no conversion.
35. As an application developer, I want an Origin with a path, query, or fragment rejected when the url-to is created, so that a misconfigured base URL can't silently drop a path prefix.
36. As an application developer, I want passing a Route from a different Route Set to a helper to be a compile error, so that I can never build a storefront path against my app's Origin.

### Errors

37. As an application developer, I want a typed error when Route Parameters fail validation, so that I can tell URL-building failures apart from other errors.
38. As an application developer, I want the error to name the Route and Route Set and list each failing key with its issue message, so that I can fix the call site quickly.
39. As a security-conscious developer, I want error messages never to include Route Parameter values, so that emails, tokens, and other sensitive data don't leak into logs or error trackers.
40. As an application developer, I want the error object to expose the Route and the structured issues, so that I can handle or report failures programmatically.
41. As an application developer, I want an error when the schema's parsed output contains keys the template doesn't use, so that stale keys left behind after moving a Route are caught.
42. As an application developer, I want a clear error if my schema validates asynchronously, so that I understand why it can't be used to build URLs synchronously.

### Reverse parsing

43. As an application developer, I want to validate incoming route params and search params against a Route, so that request handlers and pages get typed, validated inputs from the same definition used to build links.
44. As an application developer, I want to pass several sources (plain records and `URLSearchParams`) merged left to right, so that I can combine Next's awaited `params` and `searchParams` in one call.
45. As an application developer, I want the parser to return a success/failure result with the schema's output type, so that I can handle invalid input without try/catch.
46. As an application developer, I want a throwing variant of the parser, so that I can opt into exceptions where invalid input is a programming error.
47. As an application developer, I want the parser to validate template-only Routes against their inferred Route Parameters, so that I don't need a schema to get presence checks.

### Next.js integration

48. As a Next.js developer, I want to import Next-specific helpers from a separate entry point, so that non-Next projects never load or depend on Next.
49. As a non-Next developer, I want `next` to be an optional peer dependency, so that installing the package doesn't pull in or warn about Next.
50. As a Next.js developer, I want to register my app's generated `ParamMap` once, so that every Next Route Set is checked against my real route patterns with no per-definition boilerplate.
51. As a Next.js developer, I want a compile error when a Route's template doesn't match any Next route pattern, so that moving or deleting a page without updating its Route fails the build.
52. As a Next.js developer, I want a compile error when a template's variable names don't match the Next route pattern's segment names, so that `{itemId}` against `[id]` is caught.
53. As a Next.js developer, I want catch-all and optional catch-all segments supported (exploded path-segment expressions map to `[...x]` and `[[...x]]`), so that every Next route shape can be modelled.
54. As a Next.js developer, I want query and fragment expressions ignored when matching against Next route patterns, so that search params don't affect pattern matching.
55. As a Next.js developer, I want the Next path-to to return Next's `Route` type, so that the result is accepted by `Link`'s `href`, `router.push`, `redirect`, and `Form`'s `action` when `typedRoutes` is on.
56. As a Next.js developer without `typedRoutes`, I want the integration to still check templates against my route patterns, so that I get drift detection even with untyped links.
57. As a Next.js developer, I want to opt a single Route out of pattern checking (e.g. `/robots.txt`, middleware-handled paths), so that non-route destinations can live in the same Route Set.
58. As a Next.js developer, I want an opted-out Route not to be typed as Next's `Route`, so that the type system doesn't claim Next knows about it.
59. As a Next.js developer using `basePath`, I want the Next path-to to leave the basePath out, so that `Link` doesn't prefix it twice.
60. As a Next.js developer using `basePath`, I want the Next url-to to include the basePath, so that fully-qualified URLs are correct.
61. As a Next.js developer, I want support for both the App Router and the Pages Router on Next ≥ 15.5, so that the integration works regardless of router.
62. As a Next.js developer, I want documented guidance to run `next typegen` before type-checking in CI, so that the registered `ParamMap` resolves on fresh checkouts.

### Packaging, compatibility, and release

63. As a library consumer, I want an ESM-only package with `sideEffects: false` and per-entry-point exports, so that bundlers tree-shake everything I don't use.
64. As a library consumer, I want zero runtime dependencies, so that the package adds no transitive supply-chain risk or bundle weight.
65. As a library consumer, I want correct bundled type declarations for every entry point, so that types resolve under modern `moduleResolution` settings.
66. As a library consumer on TypeScript ≥ 5.5, I want the type-level inference to work, so that I don't have to be on the latest compiler.
67. As a library consumer on Node 22+, I want the package to run without polyfills, so that it works in current LTS runtimes and edge runtimes.
68. As a library consumer, I want an MIT license, so that I can use the package in commercial projects.
69. As a library consumer, I want a README covering Route definitions, path-to, url-to, the reverse parser, errors, and Next setup (registration, `typedRoutes`, `basePath`, `next typegen`), so that I can adopt the package without reading source.
70. As a maintainer, I want release-please to manage versions, the changelog, GitHub Releases, and npm publishing from Conventional Commits, so that releases are automated and auditable.
71. As a maintainer, I want npm provenance on published versions, so that consumers can verify where builds came from.
72. As a maintainer, I want CI to run lint, type-check, tests, build, `publint`, and `@arethetypeswrong/cli` on every change, so that broken packaging or types never ship.
73. As a maintainer, I want tests run on every supported Node major (22, 24, 26) and the type tests checked on TypeScript 5.5, so that the declared `engines` and minimum TypeScript are actually verified.
74. As a maintainer, I want Dependabot to propose weekly npm and GitHub Actions updates, so that dependencies stay current without manual tracking.
75. As a maintainer, I want releases published from CI through npm trusted publishing, so that no long-lived npm token ever exists.

## Implementation Decisions

### Modules

- **Template engine (internal).** A small RFC 6570 level 4 expander: every operator and explode, no prefix modifiers. It accepts strings, numbers, booleans, arrays, and records. It is not a public entry point (see ADR-0002).
- **Template type parser (internal, type-level).** Parses a template string literal into its variables, each with its operator and explode flag. Used to: infer Route Parameters for template-only Routes, check schema keys against template variables, forbid optional keys in simple/reserved expressions, forbid arrays and records where the operator can't represent them, reject templates that don't start with `/`, reject prefix modifiers, and derive the Next route pattern for a template. The runtime engine and the type parser must accept exactly the same syntax.
- **Route definition.** `route(template, options?)`, where `options` has optional `params` (any Standard Schema) and optional `meta` (arbitrary, preserved as a literal type). A Route value exposes its template, schema, meta, name, and Route Set brand.
- **Route Set definition.** `defineRouteSet(record)` takes a string-keyed record of Routes, writes each key into its Route as the name, and brands every Route with the Route Set so that helpers reject foreign Routes at compile time (see ADR-0001). The Route Set's own name, used in error messages, comes from a required option or argument; the exact signature is up to the implementer.
- **path-to factory.** `createPathTo(routeSet)` returns a function `(route, params?) => string`. The params argument is required exactly when the Route has required Route Parameters and absent when it has none.
- **url-to factory.** `createUrlTo(routeSet, origin)` returns a function with the same call shape returning a fully-qualified URL string. The Origin is a static string, validated when the factory is called as scheme + host + optional port only; anything else throws (see ADR-0003).
- **Reverse parser.** `parseParams(route, ...sources)` returns a `{ success: true, data } | { success: false, issues }` result typed with the schema's output (or the inferred Route Parameters for template-only Routes). `parseParamsOrThrow` throws the package's error. Sources are plain records or `URLSearchParams`, merged left to right; repeated `URLSearchParams` keys become arrays.
- **Error type.** `UrlToError` exposes the Route, the Route Set name, and structured issues (key path + message). Its message lists the Route, the Route Set, and the failing keys with their messages, and never includes values.
- **Next module.** `defineNextRouteSet(record)` checks every Route that hasn't opted out against the registered `ParamMap`. A Route opts out with a `next: false` route option. `createNextPathTo(routeSet)` returns Next's `Route` type for checked Routes and `string` for opted-out Routes, and leaves out `basePath`. `createNextUrlTo(routeSet, origin, { basePath? })` returns a string and includes `basePath`. Registration happens through module augmentation of a `Register` interface in the Next module, carrying the app's `ParamMap` type.

### Behavioural contracts

- Building always runs the schema when present. Arguments are typed with the schema's input type, and the template is filled from the schema's output.
- If the schema's validate returns a Promise, building throws a clear error naming the Route.
- After validation, any output key that isn't a template variable throws.
- Template-only Routes: path-type variables (simple, reserved, path-segment, label, path-style) must be non-empty strings at runtime. Query, continuation, and fragment variables follow plain RFC 6570.
- Empty strings in query expressions produce `name=`, per RFC 6570.
- Undefined optional values are left out per RFC 6570.
- Template → Next route pattern mapping: `{x}` → `[x]`; non-exploded path-segment `{/x}` → `/[x]` when required, and a compile error when optional (Next has no optional single segment; use `next: false` or `{/x*}`); exploded path-segment `{/x*}` → `[...x]` when required, `[[...x]]` when optional; query, continuation, and fragment expressions are dropped; literal text is kept. Variable names must equal Next's segment names in `ParamMap`.
- The Next module works whether or not `typedRoutes` is enabled. Without it, Next's `Route` type is effectively `string`.

### Packaging and tooling

Structure and automation mirror the `eslint-config-envylabs` package where they apply.

- Package name `@envylabs/url-to`. Public access, ESM-only, `sideEffects: false`. Repository `github.com/envylabs/url-to`, author `Envy Labs (envylabs.com)`.
- MIT license, declared in package metadata and shipped as a `LICENSE` file ("Copyright (c) 2026 Envy Labs").
- Entry points: the root (core) and `/next`. No other public subpaths.
- `next` (≥ 15.5) is an optional peer dependency (declared in peer dependency metadata as optional). The core never imports it.
- Node: `engines` is `>=22`. Development and CI's main job are pinned with `.tool-versions` (`nodejs 26.13.1`) through `node-version-file`. Tests run on Node 22, 24, and 26.
- TypeScript: developed on TypeScript 6; consumer support is TypeScript ≥ 5.5.
- npm as the package manager, with `allowScripts` in package metadata and installs in CI using `--ignore-scripts`.
- Build: plain `tsc` with a build config that includes only the source directory, emitting one ESM file plus declarations per source file. No bundler.
- TypeScript config: NodeNext module and resolution, `rewriteRelativeImportExtensions`, strict, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `isolatedModules`, `noFallthroughCasesInSwitch`, `noUncheckedSideEffectImports`, ES2022 target. No `isolatedDeclarations`.
- Lint and format config written in TypeScript (loaded via jiti), on ESLint 10: `@eslint/js` recommended, `eslint-config-envylabs` `full`, typescript-eslint `strictTypeChecked` and `stylisticTypeChecked`. Prettier via `eslint-config-envylabs/prettier`. No Next, Storybook, or boundaries plugins.
- Vitest for tests, in a top-level test directory with a fixtures subdirectory, kept out of the build.
- CI on GitHub Actions, on push and pull_request: install, lint, type-check, test (Node matrix), build, `publint`, `@arethetypeswrong/cli`, and a type-check of the type tests on TypeScript 5.5. No commit-message check.
- Dependabot: weekly npm updates (`increase-if-necessary`) and weekly GitHub Actions updates.
- Releases: release-please GitHub Action (config and manifest under `.github/`, `release-type: node`, `bump-minor-pre-major`) manages versions, the changelog, and GitHub Releases. The manifest and package version start at `0.0.0`, so the first `feat` release is `0.1.0`. A separate deploy job runs `npm publish` with `id-token: write` through npm trusted publishing, which adds provenance automatically.
- Because npm trusted publishing requires the package to exist, a maintainer publishes a `0.0.0` placeholder by hand once and then attaches the trusted publisher for the repository. Every later release goes through CI.

### ADRs respected

- ADR-0001: call sites take Route values, not string names; Routes are branded by Route Set.
- ADR-0002: Standard Schema plus our own RFC 6570 engine, no runtime dependencies, no prefix modifiers.
- ADR-0003: a strict Origin kept separate from the Route Set; basePath handled only by the Next module.

## Testing Decisions

- **What makes a good test:** it exercises only public behaviour through the two entry points. It asserts on the produced strings, results, thrown errors, and compile-time types, never on internal helpers, intermediate structures, or how the template is parsed. A refactor of internals that keeps behaviour should break no test.
- **Seams (confirmed):** exactly two, the public exports of `@envylabs/url-to` and `@envylabs/url-to/next`. The template engine and type parser are tested only through Route definitions and helpers.
- **Runtime tests (Vitest):** escaping across every operator, explode with arrays and records, numbers and booleans, optional omission, empty-string behaviour, literal query strings and fragments, schema coercion and transforms, unknown output keys, async-schema rejection, Origin validation, multiple Origins per Route Set, error message content (no values present), reverse parsing with merged record and `URLSearchParams` sources, Next path-to and url-to with and without `basePath`.
- **Type tests (Vitest `expectTypeOf` plus `@ts-expect-error`):** parameter inference from templates, input vs. output types, required vs. absent params argument, schema/template key mismatch errors, optional keys in simple expressions rejected, arrays and records rejected in non-explode positions, a non-`/` template rejected, prefix modifier rejected, foreign Route Set rejected, Next pattern mismatch and segment-name mismatch rejected, opted-out Route typed as `string`, checked Route typed as Next's `Route`.
- **Next test fixture:** a test-only type declaration registers a hand-written fixture `ParamMap` covering static, dynamic, catch-all, optional catch-all, and route-handler patterns.
- **Packaging** is verified by `publint` and `@arethetypeswrong/cli` in CI, not by a dist-consumer test.
- **Compatibility:** runtime tests run on Node 22, 24, and 26. Type tests are also type-checked with TypeScript 5.5.
- **Prior art:** none in this repo (greenfield). Follow the `eslint-config-envylabs` layout: tests in a top-level test directory, fixtures in a subdirectory, importing the public entry points.

## Out of Scope

- Matching a full URL or path string against templates (true reverse routing).
- Async variants of path-to and url-to.
- Returning `URL` objects.
- Origins resolved lazily from functions, or supplied per call.
- Exposing the template engine as a public entry point.
- Built-in page titles, i18n, or other metadata features (apps build them from `meta`).
- An asset-URL helper.
- RFC 6570 prefix modifiers.
- Generated API documentation (TypeDoc) and migration guides from any specific codebase.
- Integrations for frameworks other than Next.js.
- Treating TypeScript 7 as the development compiler.

## Further Notes

- The domain vocabulary (Route, Route Parameters, Route Set, Origin, Next route pattern) is defined in the root glossary and should be used consistently in code, docs, and errors.
- The Next `Register` type points at the app's generated route types. Until `next dev`, `next build`, or `next typegen` has run, that import doesn't resolve; the README must call this out.
- The README and all public material must be generic and must not reference any private codebase.
- Whether Next's `Route` (its default type parameter) satisfies `Link`'s inferred `href` generic should be verified early in implementation against a real Next ≥ 15.5 project with `typedRoutes` enabled.
