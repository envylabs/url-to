# 11: README

**What to build:** A generic public README that lets a developer adopt the package without reading the source. It must not reference any private codebase.

**Blocked by:** 03, 05, 07, 09

**Status:** ready-for-agent

- [ ] Covers installation, Routes and Route Sets, template rules (supported operators, no prefix modifiers, leading `/`), path-to, url-to and Origins
- [ ] Covers Standard Schema params (input vs output types), `meta`, errors (no values in messages) and the reverse parser
- [ ] Next section: registering `ParamMap`, `defineNextRouteSet`, the `next: false` opt-out, `typedRoutes`, `basePath`, and running `next typegen` before type-checking in CI
- [ ] Uses the glossary vocabulary, and the examples compile against the current API
