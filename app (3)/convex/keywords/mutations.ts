import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import type { MutationCtx } from "../_generated/server";

async function getCurrentUser(ctx: MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
}

export const addKeyword = mutation({
  args: {
    projectId: v.id("projects"),
    keyword: v.string(),
    country: v.optional(v.string()),
    state: v.optional(v.string()),
    district: v.optional(v.string()),
    city: v.optional(v.string()),
    intent: v.optional(v.string()),
    priority: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    targetUrl: v.optional(v.string()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });

    // Check for duplicate
    const existing = await ctx.db
      .query("keywords")
      .withIndex("by_project_and_keyword", (q) =>
        q.eq("projectId", args.projectId).eq("keyword", args.keyword.toLowerCase().trim())
      )
      .unique();

    if (existing) {
      throw new ConvexError({ message: "This keyword is already being tracked", code: "CONFLICT" });
    }

    return ctx.db.insert("keywords", {
      projectId: args.projectId,
      userId: user._id,
      keyword: args.keyword.toLowerCase().trim(),
      country: args.country,
      state: args.state,
      district: args.district,
      city: args.city,
      intent: args.intent,
      priority: args.priority ?? "medium",
      status: "tracking",
      tags: args.tags ?? [],
      notes: args.notes,
      targetUrl: args.targetUrl,
      source: args.source ?? "manual",
      addedAt: new Date().toISOString(),
    });
  },
});

export const addKeywordsBulk = mutation({
  args: {
    projectId: v.id("projects"),
    keywords: v.array(v.object({
      keyword: v.string(),
      intent: v.optional(v.string()),
      priority: v.optional(v.string()),
      targetUrl: v.optional(v.string()),
    })),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });

    const now = new Date().toISOString();
    let added = 0;
    let skipped = 0;

    for (const kw of args.keywords) {
      const normalized = kw.keyword.toLowerCase().trim();
      if (!normalized) continue;

      const existing = await ctx.db
        .query("keywords")
        .withIndex("by_project_and_keyword", (q) =>
          q.eq("projectId", args.projectId).eq("keyword", normalized)
        )
        .unique();

      if (existing) {
        skipped++;
        continue;
      }

      await ctx.db.insert("keywords", {
        projectId: args.projectId,
        userId: user._id,
        keyword: normalized,
        intent: kw.intent,
        priority: kw.priority ?? "medium",
        status: "tracking",
        tags: [],
        targetUrl: kw.targetUrl,
        source: args.source ?? "manual",
        addedAt: now,
      });
      added++;
    }

    return { added, skipped };
  },
});

export const updateKeyword = mutation({
  args: {
    keywordId: v.id("keywords"),
    intent: v.optional(v.string()),
    priority: v.optional(v.string()),
    status: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    targetUrl: v.optional(v.string()),
    country: v.optional(v.string()),
    state: v.optional(v.string()),
    district: v.optional(v.string()),
    city: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });

    const { keywordId, ...updates } = args;
    // Remove undefined values
    const patch = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );

    await ctx.db.patch(keywordId, patch);
  },
});

export const deleteKeyword = mutation({
  args: { keywordId: v.id("keywords") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });

    // Delete all rank snapshots for this keyword
    const snapshots = await ctx.db
      .query("rankSnapshots")
      .withIndex("by_keyword", (q) => q.eq("keywordId", args.keywordId))
      .collect();
    for (const s of snapshots) {
      await ctx.db.delete(s._id);
    }
    await ctx.db.delete(args.keywordId);
  },
});

export const addRankSnapshot = mutation({
  args: {
    keywordId: v.id("keywords"),
    snapshotDate: v.string(),
    position: v.optional(v.number()),
    url: v.optional(v.string()),
    source: v.string(),
    clicks: v.optional(v.number()),
    impressions: v.optional(v.number()),
    ctr: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });

    const keyword = await ctx.db.get(args.keywordId);
    if (!keyword) throw new ConvexError({ message: "Keyword not found", code: "NOT_FOUND" });

    // Check for duplicate snapshot on this date
    const existing = await ctx.db
      .query("rankSnapshots")
      .withIndex("by_keyword_and_date", (q) =>
        q.eq("keywordId", args.keywordId).eq("snapshotDate", args.snapshotDate)
      )
      .unique();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        position: args.position,
        url: args.url,
        source: args.source,
        clicks: args.clicks,
        impressions: args.impressions,
        ctr: args.ctr,
        notes: args.notes,
      });
    } else {
      await ctx.db.insert("rankSnapshots", {
        keywordId: args.keywordId,
        projectId: keyword.projectId,
        snapshotDate: args.snapshotDate,
        position: args.position,
        url: args.url,
        source: args.source,
        clicks: args.clicks,
        impressions: args.impressions,
        ctr: args.ctr,
        notes: args.notes,
      });
    }

    // latestPosition tracks SERP rank only — GSC syncs must not overwrite it
    const isGsc = args.source === "gsc";

    // Build source-specific position patch
    const sourcePatch: Record<string, number | undefined> = {};
    if (isGsc) {
      sourcePatch.gscPreviousPosition = keyword.gscPosition;
      sourcePatch.gscPosition = args.position;
    } else {
      sourcePatch.serpPreviousPosition = keyword.serpPosition;
      sourcePatch.serpPosition = args.position;
    }

    if (isGsc) {
      // GSC: only update gsc-specific fields, leave latestPosition untouched
      await ctx.db.patch(args.keywordId, { ...sourcePatch });
    } else {
      // SERP: update latestPosition + best
      const previousPosition = keyword.latestPosition;
      const newBest =
        args.position !== undefined
          ? keyword.bestPosition === undefined
            ? args.position
            : Math.min(keyword.bestPosition, args.position)
          : keyword.bestPosition;
      await ctx.db.patch(args.keywordId, {
        latestPosition: args.position,
        latestPositionDate: args.snapshotDate,
        previousPosition,
        bestPosition: newBest,
        ...sourcePatch,
      });
    }
  },
});

export const deleteKeywordsBulk = mutation({
  args: { keywordIds: v.array(v.id("keywords")) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });

    for (const keywordId of args.keywordIds) {
      const snapshots = await ctx.db
        .query("rankSnapshots")
        .withIndex("by_keyword", (q) => q.eq("keywordId", keywordId))
        .collect();
      for (const s of snapshots) {
        await ctx.db.delete(s._id);
      }
      await ctx.db.delete(keywordId);
    }
    return { deleted: args.keywordIds.length };
  },
});
