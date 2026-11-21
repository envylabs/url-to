# 04: All RFC 6570 operators

**What to build:** A developer can model any real-world URL shape: reserved, fragment, label, path-segment, path-style parameter, query and query-continuation expressions, plus literal query strings and fragments in the template. Optional Route Parameters are dropped cleanly wherever the operator allows it and rejected at compile time wherever a missing value would produce a broken path.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] The `+ # . / ; ? &` operators expand and escape per RFC 6570, and the type parser supports the same syntax
- [ ] Literal query strings mixed with continuation expressions (e.g. `/account.php?action=address_book{&x}`) and literal fragments work
- [ ] Undefined optional values are left out with no stray separators in `{?}` `{&}` `{/}` `{;}` `{#}` `{.}`
- [ ] Empty strings in query expressions produce `name=`
- [ ] Template-only variables in query, continuation and fragment expressions are inferred as optional. Those in path-type positions are inferred as required
- [ ] An optional variable in a simple or reserved expression is a compile error
- [ ] Prefix modifiers (`{var:3}`) are rejected at compile time and at runtime
- [ ] RFC 6570 examples for these operators pass (string values)
