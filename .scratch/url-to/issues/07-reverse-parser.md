# 07: Reverse parser

**What to build:** A developer can validate incoming route params and search params against the same Route used to build links. For example, merging a page's awaited `params` and `searchParams` gives typed data or structured issues.

**Blocked by:** 06

**Status:** ready-for-agent

- [ ] `parseParams(route, ...sources)` accepts plain records and `URLSearchParams`, merged left to right
- [ ] Repeated `URLSearchParams` keys become arrays
- [ ] Returns `{ success: true, data }` typed with the schema's output, or `{ success: false, issues }`
- [ ] Template-only Routes are validated against their inferred Route Parameters (presence, non-empty path-type values)
- [ ] `parseParamsOrThrow` throws `UrlToError`. Its message has no values
- [ ] Async schemas produce the same clear error as in building
