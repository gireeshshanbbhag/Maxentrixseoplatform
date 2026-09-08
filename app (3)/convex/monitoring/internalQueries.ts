import { internalQuery } from "../_generated/server";
import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel.d.ts";

export const getProjectData = internalQuery({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args): Promise<{
    project: Doc<"projects"> | null;
    keywords: Doc<"keywords">[];
    rankSnapshots: Doc<"rankSnapshots">[];
    audits: Doc<"audits">[];
    contentPieces: Doc<"contentPieces">[];
  }> => {
    const project = await ctx.db.get(args.projectId);
    const keywords = await ctx.db
      .query("keywords")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .take(200);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const rankSnapshots = await ctx.db
      .query("rankSnapshots")
      .withIndex("by_project_and_date", (q) =>
        q.eq("projectId", args.projectId).gte("snapshotDate", thirtyDaysAgo)
      )
      .take(500);
    const audits = await ctx.db
      .query("audits")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .take(5);
    const contentPieces = await ctx.db
      .query("contentPieces")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .take(100);
    return { project, keywords, rankSnapshots, audits, contentPieces };
  },
});
