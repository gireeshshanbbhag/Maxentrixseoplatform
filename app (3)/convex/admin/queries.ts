import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "../users.ts";

// ─── Queries ───────────────────────────────────────────────────────────────────

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").collect();
    const projects = await ctx.db.query("projects").collect();
    const audits = await ctx.db.query("audits").collect();
    const keywords = await ctx.db.query("keywords").collect();
    const alerts = await ctx.db.query("alerts").collect();

    const adminCount = users.filter((u) => u.role === "admin").length;
    const plans = { free: 0, pro: 0, agency: 0 };
    for (const u of users) {
      const p = (u.plan ?? "free") as keyof typeof plans;
      if (p in plans) plans[p]++;
    }

    const activeAudits = audits.filter((a) =>
      a.status === "crawling" || a.status === "queued"
    ).length;
    const openAlerts = alerts.filter((a) => !a.isResolved).length;

    return {
      totalUsers: users.length,
      adminCount,
      plans,
      totalProjects: projects.length,
      totalAudits: audits.length,
      activeAudits,
      totalKeywords: keywords.length,
      openAlerts,
    };
  },
});

export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return ctx.db.query("users").collect();
  },
});

export const getFeatureFlags = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return ctx.db.query("featureFlags").collect();
  },
});

// ─── Mutations ─────────────────────────────────────────────────────────────────

export const upsertFeatureFlag = mutation({
  args: {
    key: v.string(),
    label: v.string(),
    description: v.optional(v.string()),
    enabled: v.boolean(),
    rolloutPercent: v.optional(v.number()),
    enabledForRoles: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const existing = await ctx.db
      .query("featureFlags")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    const now = new Date().toISOString();
    if (existing) {
      await ctx.db.patch(existing._id, {
        label: args.label,
        description: args.description,
        enabled: args.enabled,
        rolloutPercent: args.rolloutPercent,
        enabledForRoles: args.enabledForRoles,
        updatedAt: now,
        updatedBy: admin._id,
      });
    } else {
      await ctx.db.insert("featureFlags", {
        key: args.key,
        label: args.label,
        description: args.description,
        enabled: args.enabled,
        rolloutPercent: args.rolloutPercent,
        enabledForRoles: args.enabledForRoles,
        updatedAt: now,
        updatedBy: admin._id,
      });
    }
  },
});

export const deleteFeatureFlag = mutation({
  args: { id: v.id("featureFlags") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});
