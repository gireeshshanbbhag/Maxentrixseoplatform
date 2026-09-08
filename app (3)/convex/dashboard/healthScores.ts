import { query } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "../lib/auth.ts";

type CategoryScores = {
  technical: number | null;
  content: number | null;
  indexation: number | null;
  links: number | null;
  keywords: number | null;
  performance: number | null;
  overall: number | null;
};

export const getHealthScores = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args): Promise<CategoryScores> => {
    const user = await getCurrentUser(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== user._id) {
      return { technical: null, content: null, indexation: null, links: null, keywords: null, performance: null, overall: null };
    }

    const nullScores: CategoryScores = { technical: null, content: null, indexation: null, links: null, keywords: null, performance: null, overall: null };

    // Get latest completed audit
    const latestAudit = await ctx.db
      .query("audits")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .filter((q) => q.eq(q.field("status"), "completed"))
      .first();

    if (!latestAudit) {
      // No audit yet — score keywords only if we have data
      const kwData = await ctx.db
        .query("keywords")
        .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
        .take(100);

      const tracked = kwData.filter((k) => k.status === "tracking");
      if (tracked.length === 0) return nullScores;

      const withRank = tracked.filter((k) => k.serpPosition !== undefined || k.gscPosition !== undefined);
      const ranked = withRank.filter((k) => {
        const pos = k.serpPosition ?? k.gscPosition;
        return pos !== undefined && pos <= 100;
      });
      const top10 = ranked.filter((k) => {
        const pos = k.serpPosition ?? k.gscPosition;
        return pos !== undefined && pos <= 10;
      });

      if (withRank.length === 0) return nullScores;

      // keywords score: weighted by position quality
      const avgPos = ranked.length > 0
        ? ranked.reduce((sum, k) => sum + (k.serpPosition ?? k.gscPosition ?? 100), 0) / ranked.length
        : 100;
      const coverageScore = Math.round((withRank.length / tracked.length) * 100);
      const posScore = Math.round(Math.max(0, 100 - (avgPos - 1) * 1.1));
      const top10Bonus = tracked.length > 0 ? Math.round((top10.length / tracked.length) * 20) : 0;
      const keywordsScore = Math.min(100, Math.round((coverageScore * 0.3) + (posScore * 0.5) + (top10Bonus * 0.2)));

      return { ...nullScores, keywords: keywordsScore };
    }

    const totalPages = latestAudit.pagesCrawled || 1;
    const critical = latestAudit.criticalCount;
    const high = latestAudit.highCount;
    const medium = latestAudit.mediumCount;

    // ── Technical score: penalise by critical/high issues relative to pages
    const techPenalty = Math.min(100, ((critical * 15) + (high * 5) + (medium * 1)) / totalPages * 100);
    const technical = Math.max(0, Math.round(100 - techPenalty));

    // ── Content score: from audit issues in content category
    const contentIssues = await ctx.db
      .query("auditIssues")
      .withIndex("by_audit_and_category", (q) => q.eq("auditId", latestAudit._id).eq("category", "content"))
      .filter((q) => q.neq(q.field("isResolved"), true))
      .take(500);
    const critContent = contentIssues.filter((i) => i.severity === "critical" || i.severity === "high").length;
    const medContent = contentIssues.filter((i) => i.severity === "medium").length;
    const contentPenalty = Math.min(100, ((critContent * 10) + (medContent * 3)) / totalPages * 100);
    const content = Math.max(0, Math.round(100 - contentPenalty));

    // ── Indexation score: from indexation category issues
    const indexIssues = await ctx.db
      .query("auditIssues")
      .withIndex("by_audit_and_category", (q) => q.eq("auditId", latestAudit._id).eq("category", "indexation"))
      .filter((q) => q.neq(q.field("isResolved"), true))
      .take(200);
    const critIndex = indexIssues.filter((i) => i.severity === "critical" || i.severity === "high").length;
    const medIndex = indexIssues.filter((i) => i.severity === "medium").length;
    const indexPenalty = Math.min(100, ((critIndex * 15) + (medIndex * 5)));
    const indexation = Math.max(0, Math.round(100 - indexPenalty));

    // ── Links score: from links category issues
    const linkIssues = await ctx.db
      .query("auditIssues")
      .withIndex("by_audit_and_category", (q) => q.eq("auditId", latestAudit._id).eq("category", "links"))
      .filter((q) => q.neq(q.field("isResolved"), true))
      .take(500);
    const critLinks = linkIssues.filter((i) => i.severity === "critical" || i.severity === "high").length;
    const medLinks = linkIssues.filter((i) => i.severity === "medium").length;
    const linksPenalty = Math.min(100, ((critLinks * 8) + (medLinks * 2)) / totalPages * 100);
    const links = Math.max(0, Math.round(100 - linksPenalty));

    // ── Keywords score: from tracked keywords with rankings
    const kwData = await ctx.db
      .query("keywords")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .take(200);
    const tracked = kwData.filter((k) => k.status === "tracking");
    let keywords: number | null = null;
    if (tracked.length > 0) {
      const withRank = tracked.filter((k) => k.serpPosition !== undefined || k.gscPosition !== undefined);
      const ranked = withRank.filter((k) => {
        const pos = k.serpPosition ?? k.gscPosition;
        return pos !== undefined && pos <= 100;
      });
      const top10 = ranked.filter((k) => {
        const pos = k.serpPosition ?? k.gscPosition;
        return pos !== undefined && pos <= 10;
      });
      if (withRank.length > 0) {
        const avgPos = ranked.length > 0
          ? ranked.reduce((sum, k) => sum + (k.serpPosition ?? k.gscPosition ?? 100), 0) / ranked.length
          : 100;
        const coverageScore = Math.round((withRank.length / tracked.length) * 100);
        const posScore = Math.round(Math.max(0, 100 - (avgPos - 1) * 1.1));
        const top10Bonus = Math.round((top10.length / tracked.length) * 20);
        keywords = Math.min(100, Math.round((coverageScore * 0.3) + (posScore * 0.5) + (top10Bonus * 0.2)));
      }
    }

    // ── Performance score: from audit overallScore or load time data
    let performance: number | null = null;
    if (latestAudit.overallScore !== undefined) {
      performance = latestAudit.overallScore;
    } else {
      // Estimate from average load times of crawled pages
      const pages = await ctx.db
        .query("auditPages")
        .withIndex("by_audit_and_status", (q) => q.eq("auditId", latestAudit._id).eq("crawlStatus", "crawled"))
        .take(50);
      const withTime = pages.filter((p) => p.loadTimeMs !== undefined);
      if (withTime.length > 0) {
        const avg = withTime.reduce((s, p) => s + (p.loadTimeMs ?? 0), 0) / withTime.length;
        // <1s = 90+, 1-2s = 70-90, 2-4s = 50-70, >4s = <50
        if (avg < 1000) performance = Math.round(90 + (1000 - avg) / 100);
        else if (avg < 2000) performance = Math.round(90 - ((avg - 1000) / 1000) * 20);
        else if (avg < 4000) performance = Math.round(70 - ((avg - 2000) / 2000) * 20);
        else performance = Math.max(10, Math.round(50 - ((avg - 4000) / 1000) * 5));
        performance = Math.min(100, Math.max(0, performance));
      }
    }

    // ── Overall: weighted average of available scores
    const WEIGHTS: Record<string, number> = {
      technical: 0.25, content: 0.20, indexation: 0.15,
      links: 0.15, keywords: 0.15, performance: 0.10,
    };
    const available: { score: number; weight: number }[] = [];
    const scoreMap: Record<string, number | null> = { technical, content, indexation, links, keywords, performance };
    for (const [cat, score] of Object.entries(scoreMap)) {
      if (score !== null) available.push({ score, weight: WEIGHTS[cat] });
    }
    let overall: number | null = null;
    if (available.length > 0) {
      const totalWeight = available.reduce((s, a) => s + a.weight, 0);
      overall = Math.round(available.reduce((s, a) => s + a.score * (a.weight / totalWeight), 0));
    }

    return { technical, content, indexation, links, keywords, performance, overall };
  },
});
