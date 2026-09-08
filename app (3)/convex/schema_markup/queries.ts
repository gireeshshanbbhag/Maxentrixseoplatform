import { query } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "../lib/auth.ts";

export const list = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    await getCurrentUser(ctx);
    return ctx.db
      .query("schemaMarkups")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .take(100);
  },
});

export const getById = query({
  args: { id: v.id("schemaMarkups") },
  handler: async (ctx, args) => {
    await getCurrentUser(ctx);
    return ctx.db.get(args.id);
  },
});
