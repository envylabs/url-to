# 03: url-to with strict Origin

**What to build:** A developer can create `createUrlTo(routeSet, origin)` and build fully-qualified URL strings. One Route Set can be served from several Origins. A misconfigured Origin fails as soon as the url-to is created (ADR-0003).

**Blocked by:** 02

**Status:** resolved

- [ ] `createUrlTo(routeSet, origin)` returns a function with the same call shape as path-to, returning a string
- [ ] An Origin is scheme + host + optional port. One with a path (other than a bare `/`), query or fragment throws when the factory is called
- [ ] Two url-tos built from one Route Set with different Origins produce the matching URLs
- [ ] Passing a Route from another Route Set is a compile error
- [ ] Validation and escaping behave exactly as in path-to

## Comments

- 2026-11-21: Resolved on `feat/url-to` in 8e3ae7e; code-review fixes up to 9295748.
