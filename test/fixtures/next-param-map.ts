// A hand-written stand-in for the `ParamMap` that `next typegen` writes to
// `.next/types/routes.d.ts`, registered the way an app registers its own.
// Next writes `{}` for a pattern with no segments.
/* eslint-disable @typescript-eslint/no-empty-object-type */

interface ParamMap {
  "/": {};
  "/about": {};
  "/api/health": {};
  "/docs/[...slug]": { slug: string[] };
  "/help/[[...slug]]": { slug?: string[] };
  "/items": {};
  "/items/[id]": { id: string };
  "/users/[userId]": { userId: string };
  "/users/[userId]/posts/[postId]": { postId: string; userId: string };
}

declare module "../../src/next.js" {
  interface Register {
    paramMap: ParamMap;
  }
}
