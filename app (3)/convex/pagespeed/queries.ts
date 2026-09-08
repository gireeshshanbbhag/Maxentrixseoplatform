import { query } from "../_generated/server";
import { v } from "convex/values";

export const getCachedResult = query({
  args: {
    projectId: v.id("projects"),
    url: v.string(),
    strategy: v.string(),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query("pagespeedCache")
      .withIndex("by_project_url_strategy", (q) =>
        q.eq("projectId", args.projectId).eq("url", args.url).eq("strategy", args.strategy)
      )
      .unique();

    if (!entry) return null;

    // Return null if older than 24h
    const age = Date.now() - new Date(entry.fetchedAt).getTime();
    if (age > 24 * 60 * 60 * 1000) return null;

    return entry;
  },
});

export const getProjectResults = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("pagespeedCache")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});
