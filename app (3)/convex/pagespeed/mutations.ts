import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const saveResult = mutation({
  args: {
    projectId: v.id("projects"),
    url: v.string(),
    strategy: v.string(),
    data: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("pagespeedCache")
      .withIndex("by_project_url_strategy", (q) =>
        q.eq("projectId", args.projectId).eq("url", args.url).eq("strategy", args.strategy)
      )
      .unique();

    const now = new Date().toISOString();
    if (existing) {
      await ctx.db.patch(existing._id, { data: args.data, fetchedAt: now });
    } else {
      await ctx.db.insert("pagespeedCache", {
        projectId: args.projectId,
        url: args.url,
        strategy: args.strategy,
        data: args.data,
        fetchedAt: now,
      });
    }
  },
});
