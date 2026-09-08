import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { getCurrentUser } from "../lib/auth.ts";

export const saveConnection = mutation({
  args: {
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresAt: v.string(),
    googleEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const existing = await ctx.db
      .query("gscConnections")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        expiresAt: args.expiresAt,
        googleEmail: args.googleEmail,
      });
      return existing._id;
    } else {
      return ctx.db.insert("gscConnections", {
        userId: user._id,
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        expiresAt: args.expiresAt,
        googleEmail: args.googleEmail,
      });
    }
  },
});

export const updateTokens = mutation({
  args: {
    accessToken: v.string(),
    expiresAt: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const conn = await ctx.db
      .query("gscConnections")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (!conn) throw new ConvexError({ code: "NOT_FOUND", message: "GSC connection not found" });
    await ctx.db.patch(conn._id, {
      accessToken: args.accessToken,
      expiresAt: args.expiresAt,
    });
  },
});

export const setProjectProperty = mutation({
  args: {
    projectId: v.id("projects"),
    propertyUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const conn = await ctx.db
      .query("gscConnections")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (!conn) throw new ConvexError({ code: "NOT_FOUND", message: "GSC connection not found" });

    const existing = conn.selectedProperties ?? {};
    existing[args.projectId] = args.propertyUrl;
    await ctx.db.patch(conn._id, { selectedProperties: existing });
  },
});

export const disconnect = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const conn = await ctx.db
      .query("gscConnections")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (!conn) return;
    // Clear cache too
    const cacheEntries = await ctx.db
      .query("gscCache")
      .withIndex("by_project", (q) => q.eq("projectId", conn._id as never))
      .collect();
    for (const e of cacheEntries) await ctx.db.delete(e._id);
    await ctx.db.delete(conn._id);
  },
});

export const setCacheEntry = mutation({
  args: {
    projectId: v.id("projects"),
    cacheKey: v.string(),
    data: v.string(),
    ttlMinutes: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const existing = await ctx.db
      .query("gscCache")
      .withIndex("by_user_project_key", (q) =>
        q.eq("userId", user._id).eq("projectId", args.projectId).eq("cacheKey", args.cacheKey)
      )
      .unique();

    const now = new Date().toISOString();
    if (existing) {
      await ctx.db.patch(existing._id, {
        data: args.data,
        fetchedAt: now,
        ttlMinutes: args.ttlMinutes,
      });
    } else {
      await ctx.db.insert("gscCache", {
        userId: user._id,
        projectId: args.projectId,
        cacheKey: args.cacheKey,
        data: args.data,
        fetchedAt: now,
        ttlMinutes: args.ttlMinutes,
      });
    }
  },
});

export const clearProjectCache = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const entries = await ctx.db
      .query("gscCache")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const e of entries) await ctx.db.delete(e._id);
  },
});
