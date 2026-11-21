# 01: Package scaffold + static Route tracer bullet

**What to build:** A publishable, empty-but-working `@envylabs/url-to` package. A developer can define a Route Set of Routes with no variables and build their paths with a path-to. Everything is linted, type-checked, tested and packaging-checked in CI. Mirror the structure and automation of the `eslint-config-envylabs` package where it applies. See the spec at `.scratch/url-to/spec.md` (Packaging and tooling) and ADR-0001.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [ ] Package metadata: name `@envylabs/url-to`, version `0.0.0`, ESM-only (`type: module`), `sideEffects: false`, `engines.node` `>=22`, public `publishConfig.access`, repository `github.com/envylabs/url-to`, author `Envy Labs (envylabs.com)`, license MIT, `allowScripts`
- [ ] A `LICENSE` file (MIT, "Copyright (c) 2026 Envy Labs") included in the published package
- [ ] `.tool-versions` pins `nodejs 26.13.1`
- [ ] Two export entry points: the root, and `/next` (a stub for now). Each has type declarations
- [ ] Built with plain `tsc` using a build config that includes only the source directory. Output is one ESM file plus declarations per source file
- [ ] Base tsconfig: NodeNext, `rewriteRelativeImportExtensions`, strict, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `isolatedModules`, `noFallthroughCasesInSwitch`, `noUncheckedSideEffectImports`, ES2022
- [ ] `eslint.config.ts` and `prettier.config.ts` (loaded via jiti) on ESLint 10: `@eslint/js` recommended, `eslint-config-envylabs` `full`, typescript-eslint `strictTypeChecked` and `stylisticTypeChecked`. Prettier from `eslint-config-envylabs/prettier`
- [ ] Vitest set up for runtime tests and type tests (`expectTypeOf`, `@ts-expect-error`) in a top-level test directory with a fixtures subdirectory
- [ ] npm scripts like eslint-config-envylabs (build, clean, lint, lint:fix, test, typecheck, prepack), plus packaging checks
- [ ] GitHub Actions CI on push and pull_request: `npm ci --ignore-scripts`, lint, typecheck, build, `publint`, `@arethetypeswrong/cli`, tests on Node 22, 24 and 26, and a type-check of the type tests on TypeScript 5.5
- [ ] Dependabot: weekly npm (`increase-if-necessary`) and weekly GitHub Actions updates
- [ ] `route(template)` and `defineRouteSet(...)` exist. The Route Set has a name, each Route gets its key as its name, and each Route is branded with its Route Set
- [ ] `createPathTo(routeSet)` returns a function that takes a Route with no variables and no second argument, and returns its path
- [ ] A template that doesn't start with `/` is rejected at compile time and at runtime
- [ ] Passing a Route from another Route Set to a path-to is a compile error
- [ ] Tests go through the public root entry point only

## Comments

- 2026-11-21: Resolved on `feat/url-to` in 0d48002, c4f6e43; code-review fixes up to 9295748.
