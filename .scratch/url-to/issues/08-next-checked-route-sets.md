# 08: Next: Register + checked Next Route Sets + Next path-to

**What to build:** A Next.js developer can import `@envylabs/url-to/next`, register the app's generated `ParamMap` once, and define Next Route Sets. Every template in them is checked against a Next route pattern, including segment names. The Next path-to returns Next's `Route` type, so the result can be used in `Link` `href` and the router methods.

**Blocked by:** 04, 06

**Status:** ready-for-agent

- [ ] `next` (≥ 15.5) is declared as an optional peer dependency. The core entry point never imports it
- [ ] A `Register` interface the app augments with its `ParamMap` type
- [ ] `defineNextRouteSet` gives a compile error when a template's derived pattern isn't a known Next route pattern, or when its variable names differ from Next's segment names
- [ ] Mapping: `{x}` → `[x]`; required exploded `{/x*}` → `[...x]`; optional → `[[...x]]`; query, continuation and fragment expressions are ignored
- [ ] A per-Route `next: false` opt-out skips checking
- [ ] `createNextPathTo` returns Next's `Route` type for checked Routes and `string` for opted-out ones, and leaves out `basePath`
- [ ] Works whether or not `typedRoutes` is enabled
- [ ] A test-only fixture `ParamMap` covers static, dynamic, catch-all, optional catch-all and route-handler patterns
- [ ] Verified that a checked Route's result is accepted by `Link`'s `href` with `typedRoutes` on, Next ≥ 15.5 (record how it was verified)
