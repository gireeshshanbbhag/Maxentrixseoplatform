import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { calculateAuditScore } from "../lib/auditRules.ts";
import type { Doc, Id } from "../_generated/dataModel.d.ts";

/** Read an audit without ownership check (for internal use). */
export const getAuditRaw = internalQuery({
  args: { auditId: v.id("audits") },
  handler: async (ctx, args): Promise<Doc<"audits"> | null> => {
    return await ctx.db.get(args.auditId);
  },
});

/** Read a project without ownership check (for internal use). */
export const getProjectRaw = internalQuery({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args): Promise<Doc<"projects"> | null> => {
    return await ctx.db.get(args.projectId);
  },
});

/** Get a batch of queued pages for an audit. */
export const getQueuedPages = internalQuery({
  args: { auditId: v.id("audits"), limit: v.number() },
  handler: async (ctx, args): Promise<Doc<"auditPages">[]> => {
    return await ctx.db
      .query("auditPages")
      .withIndex("by_audit_and_status", (q) =>
        q.eq("auditId", args.auditId).eq("crawlStatus", "queued"),
      )
      .take(args.limit);
  },
});

/** Patch arbitrary fields on an audit. */
export const patchAudit = internalMutation({
  args: {
    auditId: v.id("audits"),
    patch: v.object({
      status: v.optional(v.string()),
      startedAt: v.optional(v.string()),
      completedAt: v.optional(v.string()),
      robotsTxtContent: v.optional(v.string()),
      overallScore: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args): Promise<void> => {
    const patchData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(args.patch)) {
      if (value !== undefined) patchData[key] = value;
    }
    if (Object.keys(patchData).length > 0) {
      await ctx.db.patch(args.auditId, patchData);
    }
  },
});

/** Update a page result after crawling. */
export const updatePageResult = internalMutation({
  args: {
    pageId: v.id("auditPages"),
    auditId: v.id("audits"),
    crawlStatus: v.string(),
    statusCode: v.optional(v.number()),
    redirectUrl: v.optional(v.string()),
    contentType: v.optional(v.string()),
    loadTimeMs: v.optional(v.number()),
    title: v.optional(v.string()),
    metaDescription: v.optional(v.string()),
    canonical: v.optional(v.string()),
    h1Count: v.optional(v.number()),
    h1Text: v.optional(v.string()),
    wordCount: v.optional(v.number()),
    internalLinksCount: v.optional(v.number()),
    externalLinksCount: v.optional(v.number()),
    imagesCount: v.optional(v.number()),
    imagesWithoutAlt: v.optional(v.number()),
    robotsDirective: v.optional(v.string()),
    hasSchemaMarkup: v.optional(v.boolean()),
    issueCount: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    const { pageId, auditId, ...pagePatch } = args;
    const patchData: Record<string, unknown> = {
      crawledAt: new Date().toISOString(),
    };
    for (const [key, value] of Object.entries(pagePatch)) {
      if (value !== undefined) patchData[key] = value;
    }
    await ctx.db.patch(pageId, patchData);

    // Increment audit counters
    if (args.crawlStatus === "crawled" || args.crawlStatus === "failed") {
      const audit = await ctx.db.get(auditId);
      if (audit) {
        await ctx.db.patch(auditId, {
          pagesCrawled: audit.pagesCrawled + 1,
        });
      }
    }
  },
});

/** Insert detected issues for a page and update audit counters. */
export const insertIssues = internalMutation({
  args: {
    auditId: v.id("audits"),
    pageId: v.id("auditPages"),
    pageUrl: v.string(),
    issues: v.array(
      v.object({
        issueType: v.string(),
        severity: v.string(),
        category: v.string(),
        title: v.string(),
        description: v.string(),
        why: v.string(),
        recommendation: v.string(),
        developerNote: v.optional(v.string()),
        contentNote: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args): Promise<void> => {
    let critical = 0;
    let high = 0;
    let medium = 0;
    let low = 0;
    let info = 0;

    for (const issue of args.issues) {
      await ctx.db.insert("auditIssues", {
        auditId: args.auditId,
        pageId: args.pageId,
        pageUrl: args.pageUrl,
        issueType: issue.issueType,
        severity: issue.severity,
        category: issue.category,
        title: issue.title,
        description: issue.description,
        why: issue.why,
        recommendation: issue.recommendation,
        developerNote: issue.developerNote,
        contentNote: issue.contentNote,
        isResolved: false,
      });
      switch (issue.severity) {
        case "critical":
          critical++;
          break;
        case "high":
          high++;
          break;
        case "medium":
          medium++;
          break;
        case "low":
          low++;
          break;
        case "info":
          info++;
          break;
      }
    }

    // Update audit issue counters
    const audit = await ctx.db.get(args.auditId);
    if (audit) {
      await ctx.db.patch(args.auditId, {
        issuesFound: audit.issuesFound + args.issues.length,
        criticalCount: audit.criticalCount + critical,
        highCount: audit.highCount + high,
        mediumCount: audit.mediumCount + medium,
        lowCount: audit.lowCount + low,
        infoCount: audit.infoCount + info,
      });
    }
  },
});

/** Enqueue newly discovered URLs if they don't already exist. */
export const enqueuePages = internalMutation({
  args: {
    auditId: v.id("audits"),
    urls: v.array(v.string()),
    depth: v.number(),
    maxPages: v.number(),
  },
  handler: async (ctx, args): Promise<void> => {
    const audit = await ctx.db.get(args.auditId);
    if (!audit) return;

    let currentFound = audit.pagesFound;

    for (const url of args.urls) {
      if (currentFound >= args.maxPages) break;

      // Check if URL already exists in this audit
      const existing = await ctx.db
        .query("auditPages")
        .withIndex("by_audit_and_url", (q) =>
          q.eq("auditId", args.auditId).eq("url", url),
        )
        .first();

      if (!existing) {
        await ctx.db.insert("auditPages", {
          auditId: args.auditId,
          url,
          crawlStatus: "queued",
          depth: args.depth,
        });
        currentFound++;
      }
    }

    await ctx.db.patch(args.auditId, { pagesFound: currentFound });
  },
});

/** Mark an audit as complete and calculate the overall score. */
export const completeAudit = internalMutation({
  args: { auditId: v.id("audits") },
  handler: async (ctx, args): Promise<void> => {
    const audit = await ctx.db.get(args.auditId);
    if (!audit) return;
    if (audit.status === "completed" || audit.status === "cancelled") return;

    const score = calculateAuditScore(
      audit.criticalCount,
      audit.highCount,
      audit.mediumCount,
      audit.lowCount,
    );

    await ctx.db.patch(args.auditId, {
      status: "completed",
      completedAt: new Date().toISOString(),
      overallScore: score,
    });
  },
});
