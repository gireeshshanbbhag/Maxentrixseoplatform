import { query, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "../lib/auth.ts";
import type { Id } from "../_generated/dataModel.d.ts";

export const listConnections = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    return ctx.db
      .query("cmsConnections")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

export const getConnection = query({
  args: { id: v.id("cmsConnections") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.id);
  },
});

/** Internal: used by the WordPress webhook HTTP handler to look up + verify a connection */
export const getConnectionByProjectAndPlatform = internalQuery({
  args: {
    projectId: v.id("projects"),
    platform: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("cmsConnections")
      .withIndex("by_project_and_platform", (q) =>
        q.eq("projectId", args.projectId).eq("platform", args.platform)
      )
      .first();
  },
});
