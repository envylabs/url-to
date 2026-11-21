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

## Comments

**Verification: a checked Route's result is accepted by `Link`'s `href` with `typedRoutes` on (2026-11-21).**

- Packed the built package (`npm pack`) and installed the tarball (`npm install --no-save --ignore-scripts <tgz>`) into copies of the research apps (`scratchpad/v08-app15`, `v08-app1529`, `v08-app16`). These run next 15.5.0, 15.5.29 and 16.4.6 with typescript 5.9.3, `typedRoutes: true` and `basePath: '/base'`, and use the App Router and Pages Router side by side.
- Registered the generated map from a `.ts` file (`url-to-register.ts`: `import type { ParamMap } from './.next/types/routes'` plus `declare module '@envylabs/url-to/next' { interface Register { paramMap: ParamMap } }`).
- The probe `app/check-url-to.tsx` (master copy `scratchpad/v08-probe/check-url-to.tsx`) defines a Next Route Set with static, dynamic, two-segment, Pages Router (`/legacy/{pid}`), route-handler, catch-all (`/docs{/slug*}`), optional catch-all (schema `slug?: string[]`, `/shop{/slug*}`), query/fragment and `next: false` Routes. It passes `createNextPathTo` results to `<Link href>`, `router.push`, `router.replace`, `<Form action>` and `redirect`, and assigns one to `Route`.
- The probe also has `@ts-expect-error` negatives: an unknown pattern, a segment-name mismatch, a template-only `{/slug*}` against `[[...slug]]`, a `pages/api` route, and an opted-out Route's `string` passed to `Link`.
- Ran `npx next typegen && npx tsc --noEmit -p .` in each app with `scratchpad/v08-probe/verify.sh`. There were no errors in the probe on any of the three versions. All the `@ts-expect-error` directives were used, so `Link` rejected the plain `string` and typedRoutes was active.
- Ran `typedRoutes: false` on 16.4.6 with `scratchpad/v08-probe/verify-off.sh`. `link.d.ts` isn't generated. The only probe error is the unused `@ts-expect-error` on the opted-out `string` `Link`, which is expected because `href` accepts any string there. Pattern checking still rejects the bad definitions.
- Registration guard: when the registration is a `.d.ts` whose `ParamMap` import doesn't resolve (`skipLibCheck`), the import becomes the error type and would accept every template. `defineNextRouteSet` now rejects every checked Route with "The registered ParamMap has no literal Next route patterns…". Verified in v08-app16 with `scratchpad/v08-probe/any-check.sh`. If nothing is registered, every checked Route is rejected with a "Register the app's ParamMap…" error.
