import { defineRouteSet, route } from "../../src/index.js";

export const operators = defineRouteSet("operators", {
  AddressBook: route("/account.php?action=address_book{&page,sort}"),
  File: route("/files{+path}"),
  Label: route("/report{.format}"),
  Matrix: route("/items{;id,mode}"),
  Mixed: route("/items/{id}{?q}"),
  Results: route("/search{?q,page}"),
  Section: route("/guide{#section}"),
  Segments: route("/docs{/section,page}"),
  Shared: route("/search/{q}{?q}"),
});
