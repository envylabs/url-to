import { defineRouteSet, route } from "../../src/index.js";

export const app = defineRouteSet("app", {
  About: route("/about/team"),
  Home: route("/"),
});

export const store = defineRouteSet("store", {
  Cart: route("/cart"),
  Home: route("/"),
});
