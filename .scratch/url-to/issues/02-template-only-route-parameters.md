# 02: Template-only Route Parameters (simple expressions)

**What to build:** A developer can define `route("/items/{id}")` with no schema and call `pathTo(set.Item, { id })`. The required Route Parameters are inferred from the template and values are URI-escaped. Bad input throws a `UrlToError` that never includes values. This adds the internal RFC 6570 engine and template type parser, for simple expressions only (ADR-0002).

**Blocked by:** 01

**Status:** resolved

- [ ] Simple `{x}` expressions are expanded and escaped per RFC 6570, including values containing `/`, `?`, `&`, `#`, spaces and non-ASCII characters
- [ ] Route Parameters are inferred from the template as required strings. The params argument is required when the Route has variables and absent when it has none
- [ ] Missing or extra keys are compile errors
- [ ] For a template-only Route, an empty string in a path-type position throws at runtime
- [ ] `UrlToError` is exported. Its message names the Route, the Route Set and the failing keys, and never contains Route Parameter values. It exposes the Route
- [ ] Tests go through the public root entry point only

## Comments

- 2026-11-21: Resolved on `feat/url-to` in 8a3f8b2; code-review fixes up to 9295748.
