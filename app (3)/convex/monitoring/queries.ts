import { query } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "../lib/auth.ts";

export const listAlerts = query({
  args: {
    projectId: v.id("projects"),
    onlyUnread: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await getCurrentUser(ctx);
    if (args.onlyUnread) {
      return await ctx.db
        .query("alerts")
        .withIndex("by_project_and_read", (q) =>
          q.eq("projectId", args.projectId).eq("isRead", false)
        )
        .order("desc")
        .take(100);
    }
    return await ctx.db
      .query("alerts")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .take(200);
  },
});

export const listExperiments = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    await getCurrentUser(ctx);
    return await ctx.db
      .query("seoExperiments")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .take(100);
  },
});

export const listChanges = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    await getCurrentUser(ctx);
    return await ctx.db
      .query("seoChanges")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .take(200);
  },
});

export const unreadAlertCount = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    await getCurrentUser(ctx);
    const unread = await ctx.db
      .query("alerts")
      .withIndex("by_project_and_read", (q) =>
        q.eq("projectId", args.projectId).eq("isRead", false)
      )
      .collect();
    return unread.length;
  },
});
