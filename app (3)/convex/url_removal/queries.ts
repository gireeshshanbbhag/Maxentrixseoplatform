import { query } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "../lib/auth.ts";

export const list = query({
  args: {
    projectId: v.id("projects"),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    let q = ctx.db
      .query("urlRemovalRequests")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId));

    const results = await q.order("desc").collect();

    if (args.status) {
      return results.filter((r) => r.status === args.status);
    }

    return results;
  },
});
