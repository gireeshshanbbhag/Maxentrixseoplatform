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
      .query("ga4Connections")
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
      return ctx.db.insert("ga4Connections", {
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
  args: { accessToken: v.string(), expiresAt: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const conn = await ctx.db
      .query("ga4Connections")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (!conn) throw new ConvexError({ code: "NOT_FOUND", message: "GA4 connection not found" });
    await ctx.db.patch(conn._id, { accessToken: args.accessToken, expiresAt: args.expiresAt });
  },
});

export const setProjectProperty = mutation({
  args: { projectId: v.id("projects"), propertyId: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const conn = await ctx.db
      .query("ga4Connections")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (!conn) throw new ConvexError({ code: "NOT_FOUND", message: "GA4 connection not found" });

    const existing = conn.selectedProperties ?? {};
    existing[args.projectId] = args.propertyId;
    await ctx.db.patch(conn._id, { selectedProperties: existing });
  },
});

export const disconnect = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const conn = await ctx.db
      .query("ga4Connections")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (!conn) return;
    await ctx.db.delete(conn._id);
  },
});
