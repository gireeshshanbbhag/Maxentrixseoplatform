import { internalQuery } from "../_generated/server";
import { v } from "convex/values";

/** Get keywords for AI analysis (up to 200 most recent). */
export const getKeywordsForAnalysis = internalQuery({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("keywords")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .take(200);
  },
});

/** Get crawled audit pages from the latest audit. */
export const getAuditPagesForAnalysis = internalQuery({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const audit = await ctx.db
      .query("audits")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .first();
    if (!audit) return { pages: [], auditId: null as null };
    const pages = await ctx.db
      .query("auditPages")
      .withIndex("by_audit_and_status", (q) =>
        q.eq("auditId", audit._id).eq("crawlStatus", "crawled")
      )
      .take(300);
    return { pages, auditId: audit._id };
  },
});

/** Get content pieces for analysis. */
export const getContentForAnalysis = internalQuery({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("contentPieces")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .take(100);
  },
});

/** Get rank history (last 90 days) for decay analysis. */
export const getRankHistoryForAnalysis = internalQuery({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    return ctx.db
      .query("rankSnapshots")
      .withIndex("by_project_and_date", (q) =>
        q.eq("projectId", args.projectId).gte("snapshotDate", cutoffStr)
      )
      .take(2000);
  },
});
