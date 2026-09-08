import { query } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "../lib/auth.ts";

export const list = query({
  args: {
    projectId: v.id("projects"),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await getCurrentUser(ctx);
    if (args.status) {
      return ctx.db
        .query("contentPieces")
        .withIndex("by_project_and_status", (q) =>
          q.eq("projectId", args.projectId).eq("status", args.status!)
        )
        .order("desc")
        .collect();
    }
    return ctx.db
      .query("contentPieces")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("contentPieces") },
  handler: async (ctx, args) => {
    await getCurrentUser(ctx);
    return ctx.db.get(args.id);
  },
});

export const getCalendar = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    await getCurrentUser(ctx);
    // Return all pieces with scheduledAt or publishedAt within a reasonable window
    return ctx.db
      .query("contentPieces")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});
