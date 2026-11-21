import { defineRouteSet, route } from "../../src/index.js";

export const values = defineRouteSet("values", {
  Docs: route("/docs{/path*}"),
  Item: route("/items/{id}"),
  Search: route("/search{?q,tags*}"),
});
