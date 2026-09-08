import { mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { getCurrentUser } from "../lib/auth.ts";

export const saveConnection = mutation({
  args: {
    projectId: v.id("projects"),
    platform: v.string(),
    label: v.optional(v.string()),
    siteUrl: v.string(),
    credentials: v.string(),
    authMethod: v.optional(v.string()), // "app_password" | "admin_login" | "webhook"
    webhookSecret: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const now = new Date().toISOString();

    // Upsert: one connection per project+platform
    const existing = await ctx.db
      .query("cmsConnections")
      .withIndex("by_project_and_platform", (q) =>
        q.eq("projectId", args.projectId).eq("platform", args.platform)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        label: args.label,
        siteUrl: args.siteUrl.replace(/\/$/, ""),
        credentials: args.credentials,
        authMethod: args.authMethod ?? existing.authMethod,
        webhookSecret: args.webhookSecret ?? existing.webhookSecret,
        status: "active",
        lastErrorMessage: undefined,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("cmsConnections", {
      projectId: args.projectId,
      userId: user._id,
      platform: args.platform,
      label: args.label,
      siteUrl: args.siteUrl.replace(/\/$/, ""),
      credentials: args.credentials,
      authMethod: args.authMethod,
      webhookSecret: args.webhookSecret,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateConnectionStatus = mutation({
  args: {
    id: v.id("cmsConnections"),
    status: v.string(),
    lastErrorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: args.status,
      lastTestedAt: new Date().toISOString(),
      lastErrorMessage: args.lastErrorMessage,
      updatedAt: new Date().toISOString(),
    });
  },
});

export const deleteConnection = mutation({
  args: { id: v.id("cmsConnections") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const conn = await ctx.db.get(args.id);
    if (!conn) throw new ConvexError({ code: "NOT_FOUND", message: "Connection not found" });
    if (conn.userId !== user._id) throw new ConvexError({ code: "FORBIDDEN", message: "Not your connection" });
    await ctx.db.delete(args.id);
  },
});

/** Called by the webhook HTTP action to record that WP sent an event */
export const recordWebhookEvent = internalMutation({
  args: {
    projectId: v.id("projects"),
    platform: v.string(),
    eventType: v.string(),
    payload: v.string(), // JSON stringified
  },
  handler: async (ctx, args) => {
    const conn = await ctx.db
      .query("cmsConnections")
      .withIndex("by_project_and_platform", (q) =>
        q.eq("projectId", args.projectId).eq("platform", args.platform)
      )
      .first();

    if (!conn) return;

    const now = new Date().toISOString();
    await ctx.db.patch(conn._id, {
      webhookLastReceivedAt: now,
      webhookTotalEvents: (conn.webhookTotalEvents ?? 0) + 1,
      status: "active",
      lastErrorMessage: undefined,
      updatedAt: now,
    });
  },
});
