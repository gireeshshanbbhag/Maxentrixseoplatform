import { query } from "../_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import type { QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel.d.ts";

async function getCurrentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
}

// Flat list for internal use (e.g. competitor analysis action)
export const getKeywords = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return ctx.db
      .query("keywords")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .take(200);
  },
});

export const listKeywords = query({
  args: {
    projectId: v.id("projects"),
    status: v.optional(v.string()),
    intent: v.optional(v.string()),
    priority: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { page: [], isDone: true, continueCursor: "" };

    let query;
    if (args.status) {
      query = ctx.db
        .query("keywords")
        .withIndex("by_project_and_status", (q) =>
          q.eq("projectId", args.projectId).eq("status", args.status!)
        );
    } else {
      query = ctx.db
        .query("keywords")
        .withIndex("by_project", (q) => q.eq("projectId", args.projectId));
    }

    const result = await query.order("desc").paginate(args.paginationOpts);

    // Apply additional filters after pagination
    const filtered = result.page.filter((kw) => {
      if (args.intent && kw.intent !== args.intent) return false;
      if (args.priority && kw.priority !== args.priority) return false;
      return true;
    });

    return { ...result, page: filtered };
  },
});

export const getKeyword = query({
  args: { keywordId: v.id("keywords") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    return ctx.db.get(args.keywordId);
  },
});

export const getKeywordStats = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args): Promise<{
    total: number;
    tracking: number;
    top3: number;
    top10: number;
    top20: number;
    top50: number;
    top100: number;
    notRanked: number;
  }> => {
    const user = await getCurrentUser(ctx);
    if (!user) return { total: 0, tracking: 0, top3: 0, top10: 0, top20: 0, top50: 0, top100: 0, notRanked: 0 };

    const all = await ctx.db
      .query("keywords")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const tracking = all.filter((k) => k.status !== "archived" && k.status !== "paused");
    const top3 = tracking.filter((k) => k.serpPosition !== undefined && k.serpPosition <= 3).length;
    const top10 = tracking.filter((k) => k.serpPosition !== undefined && k.serpPosition <= 10).length;
    const top20 = tracking.filter((k) => k.serpPosition !== undefined && k.serpPosition <= 20).length;
    const top50 = tracking.filter((k) => k.serpPosition !== undefined && k.serpPosition <= 50).length;
    const top100 = tracking.filter((k) => k.serpPosition !== undefined && k.serpPosition <= 100).length;
    const notRanked = tracking.filter((k) => k.serpPosition === undefined).length;

    return {
      total: all.length,
      tracking: tracking.length,
      top3,
      top10,
      top20,
      top50,
      top100,
      notRanked,
    };
  },
});

export const getRankHistory = query({
  args: {
    keywordId: v.id("keywords"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const limit = args.limit ?? 30;
    return ctx.db
      .query("rankSnapshots")
      .withIndex("by_keyword_and_date", (q) => q.eq("keywordId", args.keywordId))
      .order("desc")
      .take(limit);
  },
});

export const listAllForSync = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    return ctx.db
      .query("keywords")
      .withIndex("by_project_and_status", (q) =>
        q.eq("projectId", args.projectId).eq("status", "tracking")
      )
      .collect();
  },
});

export const getRecentMovers = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args): Promise<{
    gainers: Array<{ keyword: string; keywordId: Id<"keywords">; change: number; position: number }>;
    losers: Array<{ keyword: string; keywordId: Id<"keywords">; change: number; position: number }>;
    newEntries: Array<{ keyword: string; keywordId: Id<"keywords">; position: number }>;
  }> => {
    const user = await getCurrentUser(ctx);
    if (!user) return { gainers: [], losers: [], newEntries: [] };

    const keywords = await ctx.db
      .query("keywords")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const gainers: Array<{ keyword: string; keywordId: Id<"keywords">; change: number; position: number }> = [];
    const losers: Array<{ keyword: string; keywordId: Id<"keywords">; change: number; position: number }> = [];
    const newEntries: Array<{ keyword: string; keywordId: Id<"keywords">; position: number }> = [];

    for (const kw of keywords) {
      if (kw.status === "archived") continue;
      if (kw.latestPosition === undefined) continue;

      if (kw.previousPosition === undefined) {
        newEntries.push({ keyword: kw.keyword, keywordId: kw._id, position: kw.latestPosition });
      } else {
        const change = kw.previousPosition - kw.latestPosition; // positive = improved
        if (change > 0) {
          gainers.push({ keyword: kw.keyword, keywordId: kw._id, change, position: kw.latestPosition });
        } else if (change < 0) {
          losers.push({ keyword: kw.keyword, keywordId: kw._id, change, position: kw.latestPosition });
        }
      }
    }

    gainers.sort((a, b) => b.change - a.change);
    losers.sort((a, b) => a.change - b.change);

    return {
      gainers: gainers.slice(0, 10),
      losers: losers.slice(0, 10),
      newEntries: newEntries.slice(0, 10),
    };
  },
});
