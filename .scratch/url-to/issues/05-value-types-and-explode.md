# 05: Value types and explode

**What to build:** A developer can pass numbers, booleans, arrays and records as Route Parameters, and use explode (`{?tags*}`, `{/path*}`) for multi-valued parts. The compiler rejects a list or map where the operator can't represent it.

**Blocked by:** 04

**Status:** ready-for-agent

- [ ] Numbers and booleans are turned into strings and escaped
- [ ] Arrays and records expand per RFC 6570, both exploded and not exploded, for every operator
- [ ] Passing an array or record where it isn't allowed is a compile error
- [ ] RFC 6570 level 4 list and map examples pass (prefix modifiers excluded)
