import { query } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "../lib/auth.ts";
import type { ActionPriority, HealthCategoryId } from "../../src/lib/seo-health.ts";

// Mirrors SEOAction type but defined here to avoid importing from frontend
type Action = {
  id: string;
  title: string;
  description: string;
  priority: ActionPriority;
  category: HealthCategoryId;
  impact: number;
  confidence: number;
  difficulty: number;
  affectedPages?: number;
  source: "heuristic" | "google_data" | "ai_suggestion";
};

export const getTopActions = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args): Promise<Action[]> => {
    const user = await getCurrentUser(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== user._id) return [];

    const actions: Action[] = [];

    // ── Audit state ─────────────────────────────────────────────
    const latestAudit = await ctx.db
      .query("audits")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .first();

    const completedAudit = await ctx.db
      .query("audits")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .filter((q) => q.eq(q.field("status"), "completed"))
      .first();

    const hasCompletedAudit = completedAudit !== null;
    const isAuditRunning = latestAudit?.status === "crawling" || latestAudit?.status === "queued";

    if (!hasCompletedAudit && !isAuditRunning) {
      actions.push({
        id: "run-first-audit",
        title: "Run your first site audit",
        description: "Crawl your website to discover technical SEO issues, broken links, missing meta tags, and more.",
        priority: "fix_now",
        category: "technical",
        impact: 10, confidence: 10, difficulty: 1,
        source: "heuristic",
      });
    }

    if (isAuditRunning) {
      actions.push({
        id: "audit-in-progress",
        title: "Site audit is in progress",
        description: `Your audit is currently running (${latestAudit?.pagesCrawled ?? 0} pages crawled). Check the Audit & Technical section to monitor progress.`,
        priority: "review",
        category: "technical",
        impact: 9, confidence: 10, difficulty: 1,
        source: "heuristic",
      });
    }

    // ── Issue-based actions (only when audit exists) ─────────────
    if (completedAudit) {
      const { criticalCount, highCount, mediumCount, pagesCrawled } = completedAudit;

      if (criticalCount > 0) {
        actions.push({
          id: "fix-critical-issues",
          title: `Fix ${criticalCount} critical SEO issue${criticalCount !== 1 ? "s" : ""}`,
          description: "Critical issues are actively hurting your search rankings and crawlability. These must be resolved immediately.",
          priority: "fix_now",
          category: "technical",
          impact: 10, confidence: 10, difficulty: 4,
          affectedPages: criticalCount,
          source: "heuristic",
        });
      }

      if (highCount > 0) {
        actions.push({
          id: "fix-high-issues",
          title: `Resolve ${highCount} high-severity issue${highCount !== 1 ? "s" : ""}`,
          description: "High-severity issues significantly impact your visibility and user experience. Address these after critical issues.",
          priority: "fix_now",
          category: "technical",
          impact: 8, confidence: 9, difficulty: 4,
          affectedPages: highCount,
          source: "heuristic",
        });
      }

      if (mediumCount > 0 && criticalCount === 0 && highCount === 0) {
        actions.push({
          id: "fix-medium-issues",
          title: `Review ${mediumCount} medium-severity issue${mediumCount !== 1 ? "s" : ""}`,
          description: "Medium issues represent missed optimisation opportunities. Resolving them will improve rankings over time.",
          priority: "review",
          category: "technical",
          impact: 6, confidence: 8, difficulty: 3,
          affectedPages: mediumCount,
          source: "heuristic",
        });
      }

      // Category-specific top issues
      const contentIssues = await ctx.db
        .query("auditIssues")
        .withIndex("by_audit_and_category", (q) => q.eq("auditId", completedAudit._id).eq("category", "content"))
        .filter((q) => q.neq(q.field("isResolved"), true))
        .take(200);
      const critContent = contentIssues.filter((i) => i.severity === "critical" || i.severity === "high").length;
      if (critContent > 0) {
        actions.push({
          id: "fix-content-issues",
          title: `Fix ${critContent} content issue${critContent !== 1 ? "s" : ""} (titles, meta, headings)`,
          description: "Content issues like missing meta descriptions, duplicate titles, and improper heading structure reduce CTR and rankings.",
          priority: critContent > 5 ? "fix_now" : "review",
          category: "content",
          impact: 8, confidence: 9, difficulty: 3,
          affectedPages: critContent,
          source: "heuristic",
        });
      }

      const linkIssues = await ctx.db
        .query("auditIssues")
        .withIndex("by_audit_and_category", (q) => q.eq("auditId", completedAudit._id).eq("category", "links"))
        .filter((q) => q.neq(q.field("isResolved"), true))
        .take(200);
      const critLinks = linkIssues.filter((i) => i.severity === "critical" || i.severity === "high").length;
      if (critLinks > 0) {
        actions.push({
          id: "fix-link-issues",
          title: `Resolve ${critLinks} broken or problematic link${critLinks !== 1 ? "s" : ""}`,
          description: "Broken links waste crawl budget, hurt UX, and signal poor site maintenance to Google.",
          priority: critLinks > 3 ? "fix_now" : "review",
          category: "links",
          impact: 7, confidence: 9, difficulty: 3,
          affectedPages: critLinks,
          source: "heuristic",
        });
      }

      const indexIssues = await ctx.db
        .query("auditIssues")
        .withIndex("by_audit_and_category", (q) => q.eq("auditId", completedAudit._id).eq("category", "indexation"))
        .filter((q) => q.neq(q.field("isResolved"), true))
        .take(100);
      const critIndex = indexIssues.filter((i) => i.severity === "critical" || i.severity === "high").length;
      if (critIndex > 0) {
        actions.push({
          id: "fix-indexation-issues",
          title: `Fix ${critIndex} indexation issue${critIndex !== 1 ? "s" : ""} (sitemap, robots, canonicals)`,
          description: "Indexation issues prevent Google from properly discovering and ranking your pages.",
          priority: "fix_now",
          category: "indexation",
          impact: 9, confidence: 9, difficulty: 3,
          affectedPages: critIndex,
          source: "heuristic",
        });
      }

      // Re-audit suggestion if last audit is old
      if (completedAudit.completedAt) {
        const daysSince = (Date.now() - new Date(completedAudit.completedAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince > 14) {
          actions.push({
            id: "re-run-audit",
            title: `Re-run site audit (last run ${Math.round(daysSince)} days ago)`,
            description: "Regular audits catch new issues introduced by site changes, CMS updates, or content edits. Run one at least every 2 weeks.",
            priority: daysSince > 30 ? "fix_now" : "review",
            category: "technical",
            impact: 7, confidence: 9, difficulty: 1,
            affectedPages: pagesCrawled,
            source: "heuristic",
          });
        }
      }
    }

    // ── GSC connection ───────────────────────────────────────────
    const gscConnection = await ctx.db
      .query("gscConnections")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!gscConnection) {
      actions.push({
        id: "connect-gsc",
        title: "Connect Google Search Console",
        description: "Import real search data: queries, clicks, impressions, CTR, and average position for your site.",
        priority: "fix_now",
        category: "keywords",
        impact: 9, confidence: 10, difficulty: 2,
        source: "heuristic",
      });
    }

    // ── Keyword tracking ─────────────────────────────────────────
    const keywords = await ctx.db
      .query("keywords")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .take(200);

    const tracked = keywords.filter((k) => k.status === "tracking");
    const unranked = tracked.filter((k) => k.serpPosition === undefined && k.gscPosition === undefined);

    if (tracked.length === 0) {
      actions.push({
        id: "add-keywords",
        title: "Add target keywords to track",
        description: "Define the keywords you want to rank for to start tracking positions and spotting opportunities.",
        priority: "review",
        category: "keywords",
        impact: 8, confidence: 9, difficulty: 2,
        source: "heuristic",
      });
    } else if (unranked.length > 0 && unranked.length === tracked.length) {
      actions.push({
        id: "check-keyword-rankings",
        title: `Check rankings for ${unranked.length} unverified keyword${unranked.length !== 1 ? "s" : ""}`,
        description: "You have tracked keywords with no rank data yet. Use the SERP Rank checker to verify your current positions.",
        priority: "review",
        category: "keywords",
        impact: 7, confidence: 9, difficulty: 2,
        affectedPages: unranked.length,
        source: "heuristic",
      });
    } else {
      // Check for keywords outside top 20 that may need attention
      const outside20 = tracked.filter((k) => {
        const pos = k.serpPosition ?? k.gscPosition;
        return pos !== undefined && pos > 20;
      });
      if (outside20.length > 0) {
        actions.push({
          id: "improve-low-rankings",
          title: `Improve ${outside20.length} keyword${outside20.length !== 1 ? "s" : ""} ranking outside top 20`,
          description: "Keywords beyond position 20 receive minimal clicks. Focus on content improvements and internal linking to move them up.",
          priority: "optimize",
          category: "keywords",
          impact: 7, confidence: 7, difficulty: 6,
          affectedPages: outside20.length,
          source: "heuristic",
        });
      }
    }

    // ── Generic optimise actions only if nothing more specific ───
    if (hasCompletedAudit && actions.length < 3) {
      actions.push({
        id: "review-meta-tags",
        title: "Review page titles and meta descriptions",
        description: "Check that every page has a unique, compelling title and description within character limits to maximise CTR.",
        priority: "optimize",
        category: "content",
        impact: 7, confidence: 8, difficulty: 3,
        source: "heuristic",
      });
      actions.push({
        id: "check-internal-links",
        title: "Optimise your internal link structure",
        description: "Identify orphaned pages and add internal links to spread authority to your most important pages.",
        priority: "optimize",
        category: "links",
        impact: 6, confidence: 7, difficulty: 4,
        source: "heuristic",
      });
    }

    // Sort: fix_now first, then review, then optimize; within each group by impact desc
    const priorityOrder: Record<ActionPriority, number> = { fix_now: 0, review: 1, optimize: 2 };
    actions.sort((a, b) => {
      const pd = priorityOrder[a.priority] - priorityOrder[b.priority];
      return pd !== 0 ? pd : b.impact - a.impact;
    });

    return actions.slice(0, 10);
  },
});
