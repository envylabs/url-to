# The Origin is strict and kept separate from the Route Set

A Route Set has no Origin. It is passed to `createUrlTo(routeSet, origin)`, so one Route Set can be served from several Origins (for example, a public hostname and an internal one). An Origin is strictly scheme, host and port: one that includes a path, query or fragment is rejected, because `new URL("/x", "https://a.com/app")` silently drops `/app`, and every template starts with `/`.

Next.js `basePath` is handled only by the Next module: its path-to leaves the basePath out (Next's `Link` adds it automatically), and its url-to includes it.
