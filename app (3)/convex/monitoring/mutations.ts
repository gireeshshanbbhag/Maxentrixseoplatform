import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "../lib/auth.ts";

export const createAlert = mutation({
  args: {
    projectId: v.id("projects"),
    type: v.string(),
    severity: v.string(),
    title: v.string(),
    description: v.string(),
    metric: v.optional(v.string()),
    threshold: v.optional(v.number()),
    currentValue: v.optional(v.number()),
    previousValue: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    return await ctx.db.insert("alerts", {
      ...args,
      userId: user._id,
      isRead: false,
      isResolved: false,
      createdAt: new Date().toISOString(),
    });
  },
});

export const markAlertRead = mutation({
  args: { alertId: v.id("alerts") },
  handler: async (ctx, args) => {
    await getCurrentUser(ctx);
    await ctx.db.patch(args.alertId, { isRead: true });
  },
});

export const resolveAlert = mutation({
  args: { alertId: v.id("alerts") },
  handler: async (ctx, args) => {
    await getCurrentUser(ctx);
    await ctx.db.patch(args.alertId, {
      isResolved: true,
      isRead: true,
      resolvedAt: new Date().toISOString(),
    });
  },
});

export const deleteAlert = mutation({
  args: { alertId: v.id("alerts") },
  handler: async (ctx, args) => {
    await getCurrentUser(ctx);
    await ctx.db.delete(args.alertId);
  },
});

export const markAllRead = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    await getCurrentUser(ctx);
    const unread = await ctx.db
      .query("alerts")
      .withIndex("by_project_and_read", (q) =>
        q.eq("projectId", args.projectId).eq("isRead", false)
      )
      .collect();
    await Promise.all(unread.map((a) => ctx.db.patch(a._id, { isRead: true })));
  },
});

// ── Experiments ────────────────────────────────────────────────────

export const createExperiment = mutation({
  args: {
    projectId: v.id("projects"),
    title: v.string(),
    hypothesis: v.string(),
    changeDescription: v.string(),
    targetUrl: v.optional(v.string()),
    targetKeyword: v.optional(v.string()),
    baselinePosition: v.optional(v.number()),
    baselineClicks: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const now = new Date().toISOString();
    return await ctx.db.insert("seoExperiments", {
      ...args,
      userId: user._id,
      status: "planned",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateExperiment = mutation({
  args: {
    experimentId: v.id("seoExperiments"),
    status: v.optional(v.string()),
    currentPosition: v.optional(v.number()),
    currentClicks: v.optional(v.number()),
    result: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await getCurrentUser(ctx);
    const { experimentId, ...updates } = args;
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { ...updates, updatedAt: now };
    if (updates.status === "running") patch.startedAt = now;
    if (updates.status === "completed" || updates.status === "abandoned") patch.completedAt = now;
    await ctx.db.patch(experimentId, patch);
  },
});

export const deleteExperiment = mutation({
  args: { experimentId: v.id("seoExperiments") },
  handler: async (ctx, args) => {
    await getCurrentUser(ctx);
    await ctx.db.delete(args.experimentId);
  },
});

// ── Change History ─────────────────────────────────────────────────

export const logChange = mutation({
  args: {
    projectId: v.id("projects"),
    changeType: v.string(),
    title: v.string(),
    description: v.string(),
    url: v.optional(v.string()),
    impactExpected: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    return await ctx.db.insert("seoChanges", {
      ...args,
      userId: user._id,
      createdAt: new Date().toISOString(),
    });
  },
});

export const updateChangeImpact = mutation({
  args: {
    changeId: v.id("seoChanges"),
    impactActual: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await getCurrentUser(ctx);
    await ctx.db.patch(args.changeId, {
      impactActual: args.impactActual,
      notes: args.notes,
    });
  },
});

export const deleteChange = mutation({
  args: { changeId: v.id("seoChanges") },
  handler: async (ctx, args) => {
    await getCurrentUser(ctx);
    await ctx.db.delete(args.changeId);
  },
});
