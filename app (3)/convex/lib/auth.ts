import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel.d.ts";
import type { QueryCtx } from "../_generated/server";

/** Retrieve the current authenticated user or throw. Shared by all backend modules. */
export async function getCurrentUser(ctx: QueryCtx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError({
      code: "UNAUTHENTICATED",
      message: "User not logged in",
    });
  }
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier),
    )
    .unique();
  if (!user) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "User profile not found",
    });
  }
  return user;
}
