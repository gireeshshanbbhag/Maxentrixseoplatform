import { query } from "../_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { getCurrentUser } from "../lib/auth.ts";
import type { Doc } from "../_generated/dataModel.d.ts";

/** Get the latest audit pages for a project — used by Technical SEO and Pages modules. */
export const getLatestAuditPages = query({
  args: {
    projectId: v.id("projects"),
    paginationOpts: paginationOptsValidator,
    statusFilter: v.optional(v.string()),
    searchQuery: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== user._id) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    // Get the latest audit
    const latestAudit = await ctx.db
      .query("audits")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .first();
    if (!latestAudit || latestAudit.status !== "completed") {
      return { page: [], isDone: true, continueCursor: "" };
    }

    let result;
    if (args.statusFilter) {
      result = await ctx.db
        .query("auditPages")
        .withIndex("by_audit_and_status", (q) =>
          q.eq("auditId", latestAudit._id).eq("crawlStatus", args.statusFilter as string)
        )
        .order("desc")
        .paginate(args.paginationOpts);
    } else {
      result = await ctx.db
        .query("auditPages")
        .withIndex("by_audit", (q) => q.eq("auditId", latestAudit._id))
        .order("desc")
        .paginate(args.paginationOpts);
    }

    return {
      ...result,
      auditId: latestAudit._id,
      page: result.page.filter((p) => {
        if (!args.searchQuery) return true;
        const q = args.searchQuery.toLowerCase();
        return (
          p.url.toLowerCase().includes(q) ||
          (p.title ?? "").toLowerCase().includes(q)
        );
      }),
    };
  },
});

/** Get a flat list of recent audit pages for use in internal link analysis. */
export const getAuditPagesFlat = query({
  args: {
    projectId: v.id("projects"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== user._id) return [];

    const latestAudit = await ctx.db
      .query("audits")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .first();
    if (!latestAudit || latestAudit.status !== "completed") return [];

    const pages = await ctx.db
      .query("auditPages")
      .withIndex("by_audit", (q) => q.eq("auditId", latestAudit._id))
      .take(args.limit ?? 200);

    return pages.map((p) => ({ url: p.url, title: p.title ?? p.url, type: "page" }));
  },
});
type CheckType =
  | "missing_titles"
  | "missing_meta"
  | "missing_h1"
  | "broken_pages"
  | "redirect_pages"
  | "canonical_issues"
  | "robots_blocked"
  | "slow_pages"
  | "images_without_alt";

/** Get affected pages for a specific technical check. */
export const getCheckAffectedPages = query({
  args: {
    projectId: v.id("projects"),
    checkType: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== user._id) return [];

    const audit = await ctx.db
      .query("audits")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .filter((q) => q.eq(q.field("status"), "completed"))
      .first();
    if (!audit) return [];

    const pages = await ctx.db
      .query("auditPages")
      .withIndex("by_audit", (q) => q.eq("auditId", audit._id))
      .take(500);

    const ct = args.checkType as CheckType;

    type PageDetail = {
      url: string;
      title?: string;
      detail: string;
    };

    let filtered: PageDetail[] = [];

    if (ct === "missing_titles") {
      filtered = pages
        .filter((p) => !p.title && p.crawlStatus === "crawled")
        .map((p) => ({ url: p.url, detail: "No <title> tag found on this page" }));
    } else if (ct === "missing_meta") {
      filtered = pages
        .filter((p) => !p.metaDescription && p.crawlStatus === "crawled")
        .map((p) => ({ url: p.url, title: p.title, detail: "No meta description tag found" }));
    } else if (ct === "missing_h1") {
      filtered = pages
        .filter((p) => p.crawlStatus === "crawled" && (!p.h1Count || p.h1Count === 0))
        .map((p) => ({ url: p.url, title: p.title, detail: "No H1 heading found on this page" }));
    } else if (ct === "broken_pages") {
      filtered = pages
        .filter((p) => p.statusCode !== undefined && p.statusCode >= 400)
        .map((p) => ({ url: p.url, title: p.title, detail: `HTTP ${p.statusCode} — page returns an error response` }));
    } else if (ct === "redirect_pages") {
      filtered = pages
        .filter((p) => p.statusCode !== undefined && p.statusCode >= 300 && p.statusCode < 400)
        .map((p) => ({
          url: p.url, title: p.title,
          detail: `HTTP ${p.statusCode} → redirects to: ${p.redirectUrl ?? "unknown destination"}`,
        }));
    } else if (ct === "canonical_issues") {
      filtered = pages
        .filter((p) => p.canonical && p.canonical !== p.url && p.crawlStatus === "crawled")
        .map((p) => ({
          url: p.url, title: p.title,
          detail: `Canonical points to: ${p.canonical}`,
        }));
    } else if (ct === "robots_blocked") {
      filtered = pages
        .filter((p) => p.robotsDirective && p.robotsDirective !== "index,follow")
        .map((p) => ({
          url: p.url, title: p.title,
          detail: `robots directive: ${p.robotsDirective}`,
        }));
    } else if (ct === "slow_pages") {
      filtered = pages
        .filter((p) => p.loadTimeMs !== undefined && p.loadTimeMs > 3000)
        .sort((a, b) => (b.loadTimeMs ?? 0) - (a.loadTimeMs ?? 0))
        .map((p) => ({
          url: p.url, title: p.title,
          detail: `Load time: ${((p.loadTimeMs ?? 0) / 1000).toFixed(2)}s — exceeds 3s threshold`,
        }));
    } else if (ct === "images_without_alt") {
      filtered = pages
        .filter((p) => (p.imagesWithoutAlt ?? 0) > 0 && p.crawlStatus === "crawled")
        .sort((a, b) => (b.imagesWithoutAlt ?? 0) - (a.imagesWithoutAlt ?? 0))
        .map((p) => ({
          url: p.url, title: p.title,
          detail: `${p.imagesWithoutAlt} image${(p.imagesWithoutAlt ?? 0) !== 1 ? "s" : ""} missing alt text`,
        }));
    }

    return filtered.slice(0, 50);
  },
});

/** Get technical SEO summary from the latest audit. */
export const getTechnicalSeoSummary = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args): Promise<{
    audit: Doc<"audits"> | null;
    robotsIssues: number;
    canonicalIssues: number;
    redirectPages: number;
    missingTitles: number;
    missingMeta: number;
    missingH1: number;
    slowPages: number;
    imagesWithoutAlt: number;
    brokenPages: number;
  }> => {
    const user = await getCurrentUser(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== user._id) {
      return {
        audit: null, robotsIssues: 0, canonicalIssues: 0, redirectPages: 0,
        missingTitles: 0, missingMeta: 0, missingH1: 0, slowPages: 0,
        imagesWithoutAlt: 0, brokenPages: 0,
      };
    }
    const audit = await ctx.db
      .query("audits")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .first();
    if (!audit || audit.status !== "completed") {
      return {
        audit, robotsIssues: 0, canonicalIssues: 0, redirectPages: 0,
        missingTitles: 0, missingMeta: 0, missingH1: 0, slowPages: 0,
        imagesWithoutAlt: 0, brokenPages: 0,
      };
    }

    // Sample up to 500 pages for stats
    const pages = await ctx.db
      .query("auditPages")
      .withIndex("by_audit", (q) => q.eq("auditId", audit._id))
      .take(500);

    return {
      audit,
      robotsIssues: pages.filter((p) => p.robotsDirective && p.robotsDirective !== "index,follow").length,
      canonicalIssues: pages.filter((p) => p.canonical && p.canonical !== p.url).length,
      redirectPages: pages.filter((p) => p.statusCode && p.statusCode >= 300 && p.statusCode < 400).length,
      missingTitles: pages.filter((p) => !p.title).length,
      missingMeta: pages.filter((p) => !p.metaDescription).length,
      missingH1: pages.filter((p) => !p.h1Count || p.h1Count === 0).length,
      slowPages: pages.filter((p) => p.loadTimeMs && p.loadTimeMs > 3000).length,
      imagesWithoutAlt: pages.filter((p) => (p.imagesWithoutAlt ?? 0) > 0).length,
      brokenPages: pages.filter((p) => p.statusCode && (p.statusCode >= 400)).length,
    };
  },
});
