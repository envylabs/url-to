# url-to

Typed, validated construction of known paths and URLs, for an application's own pages and for the external systems it links to.

## Language

**Route**:
A named, known destination: a URI template plus an optional schema for the values that fill it. It may be a page, an API endpoint, or a file, local or external.
_Avoid_: Page, Destination, Endpoint, Path definition

**Route Parameters**:
The values that fill a Route's template, covering both path segments and query values.
_Avoid_: Path parameters, Template arguments, Args

**Route Set**:
A named collection of Routes that are served together. It carries no Origin, so it can be served from more than one.
_Avoid_: Pages, Route table, Site

**Origin**:
The scheme, host, and port a Route Set is served from, e.g. `https://store.example.com`.
_Avoid_: Base URL, Domain, Host, Site URL

**Next route pattern**:
A Next.js file-system route, written with bracketed segments, e.g. `/pets/[patientId]`. It is distinct from a Route, which may be bound to one.
_Avoid_: Next route (unqualified), Page route
