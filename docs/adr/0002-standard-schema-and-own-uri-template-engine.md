# Standard Schema and our own URI template engine, with no runtime dependencies

Route Parameters are validated through the [Standard Schema](https://standardschema.dev) interface, not a specific validator, and URI templates are expanded by a small RFC 6570 implementation inside the package, not a third-party library. This keeps the package free of runtime dependencies, ESM-only and tree-shakable, and lets Zod, Valibot or ArkType users adopt it without being tied to one validator's major versions. Owning the engine also means the type-level template parser (which infers Route Parameters and checks them against schema keys) matches what the runtime supports exactly.

Prefix modifiers (`{var:3}`) are deliberately not supported: they silently truncate values, which works against validation.

## Considered Options

- **Zod as a peer dependency**: simpler types, but tied to one validator and its major versions.
- **`uri-templates`**: CommonJS and unmaintained.
- **`url-template`**: maintained ESM, but its runtime behavior could drift from our type-level parser.
