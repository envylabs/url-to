import { z } from "zod";

import { route } from "../../src/index.js";
import { defineNextRouteSet } from "../../src/next.js";

import "./next-param-map.js";

export const web = defineNextRouteSet("web", {
  About: route("/about"),
  Docs: route("/docs{/slug*}"),
  Health: route("/api/health"),
  Home: route("/"),
  Item: route("/items/{id}"),
  ItemSearch: route("/items/{id}{?q,page}#reviews"),
  Robots: route("/robots.txt", { next: false }),
  Shop: route("/shop{/slug*}", {
    params: z.object({ slug: z.array(z.string()).optional() }),
  }),
  UserPost: route("/users/{userId}/posts/{postId}"),
});
