# 09: Next url-to with basePath

**What to build:** A Next.js developer using `basePath` can build fully-qualified URLs for a Next Route Set that include the basePath, while the Next path-to keeps leaving it out.

**Blocked by:** 03, 08

**Status:** resolved

- [ ] `createNextUrlTo(routeSet, origin, { basePath? })` returns a string that includes the basePath
- [ ] The same strict Origin rules as the core url-to
- [ ] Works without a basePath
- [ ] Validation, escaping and errors match the core helpers

## Comments

- 2026-11-21: Resolved on `feat/url-to` in 614b1cc, fee7ddb; code-review fixes up to 9295748.
