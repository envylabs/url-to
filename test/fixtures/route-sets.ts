import { defineRouteSet, route } from "../../src/index.js";

export const app = defineRouteSet("app", {
  About: route("/about/team"),
  Home: route("/"),
  Item: route("/items/{id}"),
  ItemReview: route("/items/{itemId}/reviews/{reviewId}"),
});

export const admin = defineRouteSet("admin", {
  Dashboard: route("/dashboard"),
  Home: route("/"),
});

export const shapes = defineRouteSet("shapes", {
  Names: route("/{item.id}/{_owner_1}"),
  Size: route("/size/{x,y}"),
});
