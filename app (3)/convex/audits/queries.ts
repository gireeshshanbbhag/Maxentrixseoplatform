import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { paginationOptsValidator } from "convex/server";
import { getCurrentUser } from "../lib/auth.ts";
import type { Doc, Id } from "../_generated/dataModel.d.ts";

// ── Queries ────────────────────────────────────────────────────

/** List all audits for a project, newest first. */
export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args): Promise<Doc<"audits">[]> => {
    const user = await getCurrentUser(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== user._id) return [];
    return await ctx.db
      .query("audits")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .take(50);
  },
});

/** Get a single audit by ID (with ownership check). */
export const getById = query({
  args: { auditId: v.id("audits") },
  handler: async (ctx, args): Promise<Doc<"audits"> | null> => {
    const user = await getCurrentUser(ctx);
    const audit = await ctx.db.get(args.auditId);
    if (!audit || audit.userId !== user._id) return null;
    return audit;
  },
});

/** Get the latest audit for a project. */
export const getLatest = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args): Promise<Doc<"audits"> | null> => {
    const user = await getCurrentUser(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== user._id) return null;
    return await ctx.db
      .query("audits")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .first();
  },
});

/** Paginated pages for an audit. */
export const listPages = query({
  args: {
    auditId: v.id("audits"),
    paginationOpts: paginationOptsValidator,
    statusFilter: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const audit = await ctx.db.get(args.auditId);
    if (!audit || audit.userId !== user._id) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    if (args.statusFilter) {
      return await ctx.db
        .query("auditPages")
        .withIndex("by_audit_and_status", (q) =>
          q.eq("auditId", args.auditId).eq("crawlStatus", args.statusFilter as string),
        )
        .order("desc")
        .paginate(args.paginationOpts);
    }

    return await ctx.db
      .query("auditPages")
      .withIndex("by_audit", (q) => q.eq("auditId", args.auditId))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

/** Paginated issues for an audit. */
export const listIssues = query({
  args: {
    auditId: v.id("audits"),
    paginationOpts: paginationOptsValidator,
    severityFilter: v.optional(v.string()),
    categoryFilter: v.optional(v.string()),
    showResolved: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const audit = await ctx.db.get(args.auditId);
    if (!audit || audit.userId !== user._id) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    let baseQuery;
    if (args.severityFilter) {
      baseQuery = ctx.db
        .query("auditIssues")
        .withIndex("by_audit_and_severity", (q) =>
          q.eq("auditId", args.auditId).eq("severity", args.severityFilter as string),
        );
    } else if (args.categoryFilter) {
      baseQuery = ctx.db
        .query("auditIssues")
        .withIndex("by_audit_and_category", (q) =>
          q.eq("auditId", args.auditId).eq("category", args.categoryFilter as string),
        );
    } else {
      baseQuery = ctx.db
        .query("auditIssues")
        .withIndex("by_audit", (q) => q.eq("auditId", args.auditId));
    }

    const result = await baseQuery.order("desc").paginate(args.paginationOpts);

    // Client-side filter for resolved toggle since it's not indexed
    if (args.showResolved === false) {
      return {
        ...result,
        page: result.page.filter((i) => !i.isResolved),
      };
    }
    return result;
  },
});

/** Issues for a specific page URL within an audit. */
export const listPageIssues = query({
  args: {
    auditId: v.id("audits"),
    pageUrl: v.string(),
  },
  handler: async (ctx, args): Promise<Doc<"auditIssues">[]> => {
    const user = await getCurrentUser(ctx);
    const audit = await ctx.db.get(args.auditId);
    if (!audit || audit.userId !== user._id) return [];
    return await ctx.db
      .query("auditIssues")
      .withIndex("by_audit_and_page_url", (q) =>
        q.eq("auditId", args.auditId).eq("pageUrl", args.pageUrl),
      )
      .collect();
  },
});

// ── Mutations ──────────────────────────────────────────────────

/** Create a new audit and kick off the crawl. */
export const create = mutation({
  args: {
    projectId: v.id("projects"),
    maxPages: v.number(),
    maxDepth: v.number(),
    includePaths: v.array(v.string()),
    excludePaths: v.array(v.string()),
    respectRobotsTxt: v.boolean(),
  },
  handler: async (ctx, args): Promise<Id<"audits">> => {
    const user = await getCurrentUser(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== user._id) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "You do not have access to this project",
      });
    }

    const auditId = await ctx.db.insert("audits", {
      projectId: args.projectId,
      userId: user._id,
      status: "queued",
      maxPages: Math.min(args.maxPages, 500),
      maxDepth: Math.min(args.maxDepth, 10),
      includePaths: args.includePaths,
      excludePaths: args.excludePaths,
      respectRobotsTxt: args.respectRobotsTxt,
      pagesCrawled: 0,
      pagesFound: 0,
      issuesFound: 0,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      infoCount: 0,
    });

    // Insert the seed page
    await ctx.db.insert("auditPages", {
      auditId,
      url: project.websiteUrl.replace(/\/$/, ""),
      crawlStatus: "queued",
      depth: 0,
    });

    return auditId;
  },
});

/** Cancel or pause a running audit. */
export const updateStatus = mutation({
  args: {
    auditId: v.id("audits"),
    status: v.union(v.literal("paused"), v.literal("cancelled")),
  },
  handler: async (ctx, args): Promise<void> => {
    const user = await getCurrentUser(ctx);
    const audit = await ctx.db.get(args.auditId);
    if (!audit || audit.userId !== user._id) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Not your audit" });
    }
    if (audit.status !== "crawling" && audit.status !== "queued" && audit.status !== "paused") {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Cannot change status of a completed or failed audit" });
    }
    await ctx.db.patch(args.auditId, { status: args.status });
  },
});

/** Resume a paused audit. */
export const resume = mutation({
  args: { auditId: v.id("audits") },
  handler: async (ctx, args): Promise<void> => {
    const user = await getCurrentUser(ctx);
    const audit = await ctx.db.get(args.auditId);
    if (!audit || audit.userId !== user._id) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Not your audit" });
    }
    if (audit.status !== "paused") {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Audit is not paused" });
    }
    await ctx.db.patch(args.auditId, { status: "crawling" });
  },
});

/** Toggle an issue as resolved/unresolved. */
export const toggleIssueResolved = mutation({
  args: { issueId: v.id("auditIssues") },
  handler: async (ctx, args): Promise<void> => {
    const user = await getCurrentUser(ctx);
    const issue = await ctx.db.get(args.issueId);
    if (!issue) throw new ConvexError({ code: "NOT_FOUND", message: "Issue not found" });
    const audit = await ctx.db.get(issue.auditId);
    if (!audit || audit.userId !== user._id) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Not your audit" });
    }
    await ctx.db.patch(args.issueId, {
      isResolved: !issue.isResolved,
      resolvedAt: !issue.isResolved ? new Date().toISOString() : undefined,
    });
  },
});
