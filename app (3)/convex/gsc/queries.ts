import { query } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "../lib/auth.ts";
import type { QueryCtx } from "../_generated/server";

async function getUser(ctx: QueryCtx) {
  try {
    return await getCurrentUser(ctx);
  } catch {
    return null;
  }
}

export const getConnection = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUser(ctx);
    if (!user) return null;
    const conn = await ctx.db
      .query("gscConnections")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (!conn) return null;
    // Don't expose tokens to the client
    return {
      _id: conn._id,
      googleEmail: conn.googleEmail,
      expiresAt: conn.expiresAt,
      selectedProperties: conn.selectedProperties,
    };
  },
});

export const getCacheEntry = query({
  args: {
    projectId: v.id("projects"),
    cacheKey: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getUser(ctx);
    if (!user) return null;

    const entry = await ctx.db
      .query("gscCache")
      .withIndex("by_user_project_key", (q) =>
        q.eq("userId", user._id).eq("projectId", args.projectId).eq("cacheKey", args.cacheKey)
      )
      .unique();

    if (!entry) return null;

    // Check if cache is still fresh
    const fetchedAt = new Date(entry.fetchedAt).getTime();
    const ageMinutes = (Date.now() - fetchedAt) / 60000;
    if (ageMinutes > entry.ttlMinutes) return null;

    return entry;
  },
});
