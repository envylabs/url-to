# @envylabs/url-to

Typed, validated construction of known paths and URLs, for an application's own pages and for the external systems it links to.

Declare each destination once, as a **Route**: an [RFC 6570](https://www.rfc-editor.org/rfc/rfc6570) URI template plus an optional [Standard Schema](https://standardschema.dev) for its **Route Parameters**. Group Routes into a **Route Set**, then build paths and URLs from it:

- Route Parameter types are inferred from the template, so a missing or misspelled value is a compile error.
- Values are validated at runtime and URI-escaped by the template engine.
- Call sites pass Routes as values, not string names, so your editor's rename and Find All References work across every link.
- Error messages name the Route and the failing keys, and never include values.
- A Next.js integration checks every template against your app's real route patterns and returns Next's typed `Route`.

The package is ESM-only, tree-shakable, and has no runtime dependencies.

## Contents

- [Installation](#installation)
- [Quick start](#quick-start)
- [Routes and Route Sets](#routes-and-route-sets)
- [Templates](#templates)
- [Building paths: path-to](#building-paths-path-to)
- [Building URLs: url-to and Origins](#building-urls-url-to-and-origins)
- [Route Parameter schemas](#route-parameter-schemas)
- [meta](#meta)
- [Errors](#errors)
- [Reverse parsing](#reverse-parsing)
- [Next.js](#nextjs)
- [API summary](#api-summary)

## Installation

```sh
npm install @envylabs/url-to
```

Requirements:

- Node.js 22 or later (or any runtime with the standard `URL` and `URLSearchParams`).
- ESM. The package has no CommonJS build.
- TypeScript 5.5 or later, for the type-level checks.
- For the Next.js integration only: `next` 15.5 or later. It is an optional peer dependency, so non-Next projects never install or load it.

## Quick start

```ts
import {
  createPathTo,
  createUrlTo,
  defineRouteSet,
  route,
} from "@envylabs/url-to";

export const app = defineRouteSet("app", {
  Home: route("/"),
  Item: route("/items/{id}"),
  Search: route("/search{?q,page}"),
});

const pathTo = createPathTo(app);
const urlTo = createUrlTo(app, "https://www.example.com");

pathTo(app.Home); // "/"
pathTo(app.Item, { id: "a/b c" }); // "/items/a%2Fb%20c"
pathTo(app.Search, { q: "red shoes" }); // "/search?q=red%20shoes"
urlTo(app.Item, { id: "42" }); // "https://www.example.com/items/42"
```

## Routes and Route Sets

A **Route** is a named, known destination: a page, an API endpoint, or a file, in your app or in an external system. Declare it with `route(template, options?)`:

```ts
route("/orders/{orderId}");
```

A **Route Set** is a named collection of Routes that are served together, such as your app, a storefront, or an admin console. Declare it with `defineRouteSet(name, routes)`:

```ts
import { defineRouteSet, route } from "@envylabs/url-to";

export const app = defineRouteSet("app", {
  Home: route("/"),
  Order: route("/orders/{orderId}"),
});

app.Order.name; // "Order"
app.Order.routeSetName; // "app"
app.Order.template; // "/orders/{orderId}"
```

Each key becomes the Route's name, and every Route is branded with its Route Set. The Route Set's name must be a string literal, and should be unique within your application: it is what tells Route Sets apart at compile time, and it appears in error messages.

Because a Route is a value, typing `app.` lists every destination, renaming a key with your editor updates every call site, and Find All References shows everywhere that links to it. To move a page, change only its template.

Helpers built for one Route Set reject Routes from another, so you can never build an admin path against your storefront's Origin:

```ts
const admin = defineRouteSet("admin", { Home: route("/") });
const urlTo = createUrlTo(app, "https://www.example.com");

urlTo(admin.Home); // compile error: admin.Home belongs to the "admin" Route Set
```

A Route with only a template infers its Route Parameters from the template. `/items/{id}` alone requires an `id`, which can be a string, number, or boolean. Add a [schema](#route-parameter-schemas) when you need more than "a value is present".

## Templates

Templates use [RFC 6570](https://www.rfc-editor.org/rfc/rfc6570) level 4 syntax. Every operator and the explode modifier (`*`) are supported:

| Operator         | Example template                     | Route Parameters                                      | Result                                     |
| ---------------- | ------------------------------------ | ----------------------------------------------------- | ------------------------------------------ |
| Simple           | `/items/{id}`                        | `{ id: "a/b c" }`                                     | `/items/a%2Fb%20c`                         |
| Reserved `+`     | `/files/{+path}`                     | `{ path: "guides/getting started.pdf" }`              | `/files/guides/getting%20started.pdf`      |
| Label `.`        | `/reports/{id}{.format}`             | `{ id: "7", format: "csv" }`                          | `/reports/7.csv`                           |
| Path segment `/` | `/guide{/sections*}`                 | `{ sections: ["install", "next"] }`                   | `/guide/install/next`                      |
| Path-style `;`   | `/map{;lat,lng}`                     | `{ lat: 51.5, lng: -0.12 }`                           | `/map;lat=51.5;lng=-0.12`                  |
| Query `?`        | `/search{?q,tags*}`                  | `{ q: "lamp", tags: ["new", "sale"] }`                | `/search?q=lamp&tags=new&tags=sale`        |
| Continuation `&` | `/account.php?action=settings{&tab}` | `{ tab: "billing" }`                                  | `/account.php?action=settings&tab=billing` |
| Fragment `#`     | `/guide{/sections*}{#heading}`       | `{ sections: ["install", "next"], heading: "setup" }` | `/guide/install/next#setup`                |

Rules:

- **Templates start with `/`.** Every Route is rooted, so `route("items/{id}")` is a compile error and throws a `TypeError` at runtime.
- **No prefix modifiers.** `{id:3}` is rejected, because truncating a value after it has been validated would build a URL nobody checked.
- **Literal query strings and fragments are allowed**, mixed with expressions, so legacy and third-party URLs can be modelled exactly: `/account.php?action=settings{&tab}`.
- **Values** are strings, numbers, booleans, and, for exploded variables only, arrays and records. Passing an array or record to an expression that isn't exploded is a compile error:

  ```ts
  const docs = defineRouteSet("docs", {
    Filter: route("/items{?filter*}"),
    Search: route("/search{?q}"),
  });
  const pathTo = createPathTo(docs);

  pathTo(docs.Filter, { filter: { color: "red", size: "m" } }); // "/items?color=red&size=m"
  pathTo(docs.Search, { q: ["lamp", "desk"] }); // compile error: {?q} takes a single value
  ```

- **Every value is escaped** by its operator's rules. Reserved (`+`) and fragment (`#`) expressions keep reserved characters such as `/`; every other operator escapes them.

### Missing and empty values

- **Undefined optional values are left out cleanly** from query, continuation, path-segment, path-style, label, and fragment expressions, with no stray separators: `pathTo(docs.Search)` is `"/search"`, and `/account.php?action=settings{&tab}` with no `tab` is `"/account.php?action=settings"`.
- **A value in a simple or reserved expression can never be missing.** Leaving out `id` in `/items/{id}` would build `/items/`, which is almost always a bug, so an optional Route Parameter in a simple (`{id}`) or reserved (`{+path}`) expression is a compile error. This is deliberate. To model an optional path segment, use a path-segment expression with a schema that makes the value optional: `/items{/id}` with `id` optional builds `/items` or `/items/7`.
- **An empty string in a query value follows RFC 6570**: `pathTo(docs.Search, { q: "" })` is `"/search?q="`.
- **Template-only Routes reject empty path values at runtime.** Without a schema, variables in simple, reserved, label, path-segment, and path-style expressions are required and must not be empty strings, empty lists or records, or lists or records with an empty member. With a schema, emptiness is the schema's call.

## Building paths: path-to

`createPathTo(routeSet)` returns a path-to: a function that builds an escaped, validated, origin-less path for any Route in that Route Set. Use it for same-origin links.

```ts
const pathTo = createPathTo(app);

pathTo(app.Home); // a Route with no Route Parameters takes no second argument
pathTo(app.Item, { id: "42" }); // required Route Parameters require the argument
pathTo(app.Search); // every Route Parameter optional: the argument is optional
```

Passing Route Parameters to a Route that has none, leaving out a required one, or passing a key the template doesn't use is a compile error.

## Building URLs: url-to and Origins

`createUrlTo(routeSet, origin)` returns a url-to with the same call shape as a path-to. It builds a fully-qualified URL, returned as a plain `string`, ready for `href`, `fetch`, redirects, and emails.

An **Origin** is the scheme, host, and optional port a Route Set is served from. A Route Set carries no Origin, so one Route Set can be served from several:

```ts
const store = defineRouteSet("store", {
  Product: route("/products/{sku}"),
});

const publicUrlTo = createUrlTo(store, "https://store.example.com");
const internalUrlTo = createUrlTo(store, "http://store.internal:8080");

publicUrlTo(store.Product, { sku: "A-1" }); // "https://store.example.com/products/A-1"
internalUrlTo(store.Product, { sku: "A-1" }); // "http://store.internal:8080/products/A-1"
```

The Origin is validated when the url-to is created, and an invalid one throws a `TypeError`. It must be an absolute URL with a scheme and host, and may have a port and a bare trailing `/`. Anything else is rejected, so a misconfigured base URL can't silently drop a path prefix:

```ts
createUrlTo(store, "https://example.com/shop"); // TypeError: Invalid Origin: must not include a path
createUrlTo(store, "https://example.com?ref=1"); // TypeError: Invalid Origin: must not include a query
createUrlTo(store, "https://example.com#top"); // TypeError: Invalid Origin: must not include a fragment
createUrlTo(store, "https://user:pw@example.com"); // TypeError: Invalid Origin: must not include credentials
createUrlTo(store, "example.com"); // TypeError: Invalid Origin: must be an absolute URL with a scheme and host
```

The Origin is a static string. Read it from configuration once, at startup, and create one url-to per Origin.

## Route Parameter schemas

Attach any [Standard Schema](https://standardschema.dev) (Zod, Valibot, ArkType, and others) as `params` to enforce rules beyond "a value is present": non-empty strings, enums, formats, coercion, and transforms.

```ts
import { z } from "zod";

export const app = defineRouteSet("app", {
  Order: route("/orders/{orderId}", {
    params: z.object({ orderId: z.number().int().positive() }),
  }),
  Report: route("/reports/{day}", {
    params: z.object({
      day: z.date().transform((date) => date.toISOString().slice(0, 10)),
    }),
  }),
  Team: route("/teams/{slug}", {
    params: z.object({ slug: z.string().trim().toLowerCase().min(1) }),
  }),
});

const pathTo = createPathTo(app);

pathTo(app.Order, { orderId: 1001 }); // "/orders/1001"
pathTo(app.Report, { day: new Date("2026-03-01T12:00:00Z") }); // "/reports/2026-03-01"
pathTo(app.Team, { slug: "  Support " }); // "/teams/support"
pathTo(app.Order, { orderId: -1 }); // throws UrlToError
```

**Input vs output types.** The schema runs on every build:

- The argument is typed as the schema's **input** type, so you can pass values the schema coerces or transforms. `app.Report` takes `{ day: Date }`; passing a string is a compile error.
- The template is filled from the schema's **output**, so trimming, coercion, and formatting are reflected in the URL.
- The [reverse parser](#reverse-parsing) returns the schema's output type (`{ day: string }` for `app.Report`).

**The schema must match the template.** Its output keys must be exactly the template's variables, and this is checked at compile time:

```ts
route("/items/{itemId}", {
  params: z.object({ itemID: z.string() }), // compile error: the template's variable is itemId
});

route("/orders/{orderId}", {
  params: z.object({ orderId: z.string().optional() }), // compile error: a missing orderId would build "/orders/"
});
```

As a runtime safety net, an output key that isn't a template variable (for example, one a transform adds) throws a `UrlToError`, so keys left behind after moving a Route are caught.

**Schemas must validate synchronously.** Route Parameters are validated synchronously, both when building paths and URLs and when parsing, so a schema whose validation returns a Promise (for example, one with an async refinement) throws a `TypeError` naming the Route when it is used.

## meta

Attach arbitrary data to a Route with `meta`. It is kept with its literal type, so you can build app-specific features such as page titles, breadcrumbs, or analytics names on top of your Routes:

```ts
const app = defineRouteSet("app", {
  Orders: route("/orders", { meta: { title: "Orders" } }),
});

app.Orders.meta.title; // "Orders", typed as the literal "Orders"
```

## Errors

When Route Parameters fail validation, path-tos, url-tos, and `parseParamsOrThrow` throw a `UrlToError`. It exposes:

- `route`: the Route that failed.
- `routeSetName`: the name of its Route Set.
- `issues`: each failing Route Parameter, as `{ path, message }`, where `path` is the key path, such as `["token"]`.

Its message names the Route, the Route Set, and each failing key with its issue message. **Messages never include Route Parameter values**, so emails, tokens, and other sensitive data don't leak into logs or error trackers:

```ts
import { UrlToError } from "@envylabs/url-to";

const app = defineRouteSet("app", {
  Invite: route("/invites/{token}", {
    params: z.object({ token: z.string().length(32) }),
  }),
});

try {
  createPathTo(app)(app.Invite, { token: "secret-value" });
} catch (error) {
  if (error instanceof UrlToError) {
    error.message;
    // 'Invalid Route Parameters for Route "Invite" in Route Set "app": token: Too small: expected string to have exactly 32 characters'
    error.issues;
    // [{ path: ["token"], message: "Too small: expected string to have exactly 32 characters" }]
  }
}
```

The issue messages come from your schema (or, for template-only Routes, from this package). If your schema's own messages include the input value, those messages will too.

Configuration mistakes throw a `TypeError` instead: an invalid template, an invalid Origin or `basePath`, or an asynchronous schema.

## Reverse parsing

The same Route that builds a link can validate the incoming request. `parseParams(route, ...sources)` validates incoming route params and search params, and returns a result instead of throwing:

```ts
import { parseParams, parseParamsOrThrow } from "@envylabs/url-to";

export const app = defineRouteSet("app", {
  ItemSearch: route("/items/{id}{?q,tags*}"),
  Orders: route("/accounts/{accountId}/orders{?page}", {
    params: z.object({
      accountId: z.string().min(1),
      page: z.coerce.number().int().positive().optional(),
    }),
  }),
});

const result = parseParams(
  app.Orders,
  { accountId: "acct_1" },
  new URLSearchParams("page=2"),
);
// { success: true, data: { accountId: "acct_1", page: 2 } }

if (!result.success) {
  result.issues; // [{ path, message }, ...]
}
```

- **Sources** are plain records or `URLSearchParams`, merged left to right. A key repeated in `URLSearchParams` becomes an array.
- **With a schema**, the merged values are passed to it, and `data` has the schema's output type. Unknown keys are the schema's call.
- **Template-only Routes** are validated against their inferred Route Parameters: path-type variables must be present and non-empty (as must every member of a list), and keys that aren't template variables (such as tracking parameters) are ignored. Values are strings, or lists of strings for variables that are exploded everywhere they appear.

`parseParamsOrThrow` returns the data directly and throws a `UrlToError` when the input is invalid, for when invalid input is a programming error:

```ts
parseParamsOrThrow(
  app.ItemSearch,
  { id: "7" },
  new URLSearchParams("q=lamp&tags=new&tags=sale&utm_source=email"),
);
// { id: "7", q: "lamp", tags: ["new", "sale"] }
```

In a Next.js App Router page, pass the awaited `params` and `searchParams` records as they are: `parseParams(app.ItemSearch, await params, await searchParams)`. Undefined values are ignored.

## Next.js

The `@envylabs/url-to/next` entry point binds a Route Set to your app's Next.js route patterns. It supports the App Router and the Pages Router on Next.js 15.5 and later, and the core entry point never imports Next.

Once set up:

- Every template in a Next Route Set is checked against a known **Next route pattern** (a file-system route such as `/items/[id]`), including the segment names. Moving or deleting a page without updating its Route fails the build.
- The Next path-to returns Next's `Route` type, so its result is accepted by `Link`'s `href`, `router.push`, `redirect`, and `Form`'s `action` when `typedRoutes` is on.

### 1. Register your app's `ParamMap`

Next generates a `ParamMap` type, listing every route pattern in your app, into `.next/types/routes.d.ts`. Register it once, in a **`.ts` file** (for example `url-to.ts` at your project root) that your `tsconfig.json` includes:

```ts
// url-to.ts
import type { ParamMap } from "./.next/types/routes";

declare module "@envylabs/url-to/next" {
  interface Register {
    paramMap: ParamMap;
  }
}
```

Use a `.ts` file, not a `.d.ts` file. With `skipLibCheck` on (the Next default), a `.d.ts` file whose import can't be resolved silently turns `ParamMap` into `any`. In a `.ts` file, a missing `.next/types/routes` is a compile error you can see.

### 2. Generate the route types before type-checking

`.next/types/routes.d.ts` is written by `next dev`, `next build`, and `next typegen`. On a fresh checkout it doesn't exist yet, so the registration's import fails. In CI (and in any script that type-checks before building), run `next typegen` first:

```sh
npx next typegen
npx tsc --noEmit
```

On Next.js 16, `next dev` writes its types to `.next/dev/types` instead, so on a checkout that has only run `next dev`, run `next typegen` too. Always import from `.next/types/routes`.

`ParamMap` is generated whether or not `typedRoutes` is enabled.

### 3. Define a Next Route Set

`defineNextRouteSet` works like `defineRouteSet`, and also checks each Route against the registered `ParamMap`:

```ts
import { route } from "@envylabs/url-to";
import { defineNextRouteSet } from "@envylabs/url-to/next";

export const web = defineNextRouteSet("web", {
  Docs: route("/docs{/slug*}"), // app/docs/[...slug]/page.tsx
  Home: route("/"), // app/page.tsx
  Item: route("/items/{id}{?tab}"), // app/items/[id]/page.tsx
  Robots: route("/robots.txt", { next: false }), // not a Next route pattern
  UserPost: route("/users/{userId}/posts/{postId}"), // app/users/[userId]/posts/[postId]/page.tsx
});
```

The Next route pattern is derived from the template:

| Template                         | Next route pattern  |
| -------------------------------- | ------------------- |
| `/items/{id}`                    | `/items/[id]`       |
| `/docs{/slug*}`                  | `/docs/[...slug]`   |
| `/shop{/slug*}`, `slug` optional | `/shop/[[...slug]]` |
| `/items/{id}{?tab}#reviews`      | `/items/[id]`       |

- `{x}` maps to `[x]`, and the variable name must equal Next's segment name.
- An exploded path-segment expression `{/x*}` maps to a catch-all `[...x]`, or to an optional catch-all `[[...x]]` when `x` is optional (in its schema).
- Literal text is kept. Everything from the first query or fragment (literal, or a `{?…}`, `{&…}`, or `{#…}` expression) is ignored, so search params don't affect matching.

A template that matches no pattern, or matches one with different segment names, is a compile error on that Route:

```ts
defineNextRouteSet("web", {
  Item: route("/item/{id}"), // compile error: "/item/[id]" is not a known Next route pattern
});

defineNextRouteSet("web", {
  Item: route("/items/{itemId}"), // compile error: segment names differ from "/items/[id]"
});
```

**Opting out.** Destinations that aren't Next route patterns, such as `/robots.txt`, paths handled by middleware, or Pages Router API routes (`pages/api/*`, which aren't in `ParamMap`), can live in the same Route Set with `next: false`. They aren't checked, and their path is typed as a plain `string`, not Next's `Route`.

### 4. Build paths with `createNextPathTo`

```ts
import { createNextPathTo } from "@envylabs/url-to/next";

export const pathTo = createNextPathTo(web);

pathTo(web.Item, { id: "42", tab: "reviews" }); // "/items/42?tab=reviews", typed as Next's Route
pathTo(web.Docs, { slug: ["guides", "setup"] }); // "/docs/guides/setup"
pathTo(web.Robots); // "/robots.txt", typed as string
```

```tsx
import Link from "next/link";

<Link href={pathTo(web.Item, { id: "42" })}>Item 42</Link>;
```

**`typedRoutes`.** With [`typedRoutes`](https://nextjs.org/docs/app/api-reference/config/typescript#statically-typed-links) enabled in `next.config`, the path-to's result is typed as Next's `Route`, which `Link`, `router.push`, `redirect`, and `Form` accept. Without `typedRoutes`, Next's `Route` is effectively `string`, and the template checks still apply, so you get drift detection with untyped links too.

**`basePath`.** The Next path-to leaves your app's `basePath` out, because `Link`, the router, `Form`, and `redirect` add it themselves. Including it would prefix it twice.

### 5. Build URLs with `createNextUrlTo`

Fully-qualified URLs, for emails, redirects to other hosts, and server-to-server calls, need the `basePath`. Pass it to `createNextUrlTo`:

```ts
import { createNextUrlTo } from "@envylabs/url-to/next";

const urlTo = createNextUrlTo(web, "https://www.example.com", {
  basePath: "/shop",
});

urlTo(web.Item, { id: "42" }); // "https://www.example.com/shop/items/42"
urlTo(web.Home); // "https://www.example.com/shop"
```

The Origin follows the [same rules](#building-urls-url-to-and-origins) as `createUrlTo`. The `basePath` must match your `next.config`: empty or left out for none, otherwise starting with `/`, not ending with `/`, and with no query or fragment. As in Next, the root Route under a `basePath` is the `basePath` itself, with no trailing slash. The url-to returns a plain `string`.

### Next.js version notes

- On Next.js 15.5.0, the generated types don't accept App Router route handlers (`app/**/route.ts`) as a `Link` `href`, and `redirect` takes a plain `string`. Later 15.5 releases and Next.js 16 type both.
- `typedRoutes` types `next/link`, `next/navigation`, and `next/form`. It doesn't type the Pages Router's `next/router` methods.

## API summary

From `@envylabs/url-to`:

| Export                                       | Description                                                                                   |
| -------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `route(template, { params?, meta?, next? })` | Declares a Route.                                                                             |
| `defineRouteSet(name, routes)`               | Groups Routes into a named Route Set.                                                         |
| `createPathTo(routeSet)`                     | Creates a path-to: `(route, params?) => string`.                                              |
| `createUrlTo(routeSet, origin)`              | Creates a url-to: `(route, params?) => string`. Throws a `TypeError` for an invalid Origin.   |
| `parseParams(route, ...sources)`             | Validates incoming Route Parameters: `{ success: true, data } \| { success: false, issues }`. |
| `parseParamsOrThrow(route, ...sources)`      | Like `parseParams`, but returns the data and throws a `UrlToError`.                           |
| `UrlToError`                                 | Thrown for invalid Route Parameters; exposes `route`, `routeSetName`, and `issues`.           |

Types: `Route`, `RouteSet`, `RouteDefinition`, `RouteParameters`, `PathTo`, `UrlTo`, `ParamsSource`, `ParseParamsResult`, `UrlToIssue`.

From `@envylabs/url-to/next`:

| Export                                             | Description                                                                                           |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `Register`                                         | Augment with your app's `ParamMap`.                                                                   |
| `defineNextRouteSet(name, routes)`                 | Groups Routes into a Next Route Set, checked against the registered `ParamMap`.                       |
| `createNextPathTo(routeSet)`                       | Creates a Next path-to, returning Next's `Route` (or `string` for `next: false`), without `basePath`. |
| `createNextUrlTo(routeSet, origin, { basePath? })` | Creates a Next url-to, returning a `string`, with `basePath`.                                         |

Types: `NextRouteSet`, `NextPathTo`, `NextUrlTo`, `NextUrlToOptions`.

## License

[MIT](./LICENSE)
