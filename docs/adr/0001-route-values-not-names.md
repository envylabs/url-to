# Call sites take Route values, not string names

Helpers are called with a Route value (`urlTo(store.ManageOrder, { orderId })`), not a string or enum name (`urlTo("ManageOrder", ...)`). The TypeScript language service does not link a string-literal argument to the object key it names: renaming the key leaves call sites untouched, and Find All References misses them. Referencing the Route as a value keeps rename and find-references working, which matters because moving or renaming destinations is the main reason the package exists. It also makes Routes first-class, so they can be stored, passed as typed destinations, given to the reverse parser, and checked one by one against Next route patterns.

## Considered Options

- **String names**: the most compact, but rename and find-references don't work, and a name that matches its path tempts people to hand-write paths.
- **Enums**: rename works, but they add a second table to keep in sync, report numeric values in errors, and tree-shake poorly.
- **Methods on each Route** (`store.ManageOrder.url(...)`): every Route would carry every helper, and Origins would get bound to Route Sets.

## Consequences

`defineRouteSet` brands each Route with its Route Set, so passing a Route to a helper built for a different Route Set is a compile error.
