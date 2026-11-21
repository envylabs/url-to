import * as v from "valibot";
import { z } from "zod";

import { defineRouteSet, route } from "../../src/index.js";

export const catalog = defineRouteSet("catalog", {
  Item: route("/items/{id}", {
    params: z.object({ id: z.number().int().positive().transform(String) }),
  }),
  ItemReview: route("/items/{itemId}/reviews/{reviewId}", {
    meta: { title: "Item review" },
    params: v.object({
      itemId: v.pipe(v.string(), v.trim(), v.minLength(1)),
      reviewId: v.pipe(v.number(), v.transform(String)),
    }),
  }),
  Search: route("/search/{term}", {
    params: z.object({ term: z.string().trim().min(1) }),
  }),
  User: route("/users/{userId}", {
    meta: { section: "users", title: "User" },
  }),
});
