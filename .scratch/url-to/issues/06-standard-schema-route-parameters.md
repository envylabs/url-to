# 06: Standard Schema Route Parameters + meta

**What to build:** A developer can attach any Standard Schema (Zod, Valibot, ArkType) to a Route through `params`. Values are validated and transformed before the template is filled, and schema/template drift is caught at compile time. Routes can also carry typed `meta` for app-specific features.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] `route(template, { params, meta })`. Both options are optional
- [ ] The params argument uses the schema's input type, and the template is filled from the schema's output (e.g. coercion and transforms are visible in the URL)
- [ ] A compile error when the schema's keys don't match the template's variables
- [ ] Validation failures throw `UrlToError` with structured `issues` (key path + message). The message lists keys and messages, never values
- [ ] Throws when the schema's output has keys the template doesn't use
- [ ] Throws a clear error naming the Route when validation returns a Promise
- [ ] `meta` keeps its literal type on the Route
- [ ] Tested with Zod 4 and at least one other Standard Schema library (dev dependencies only; no runtime dependency)
