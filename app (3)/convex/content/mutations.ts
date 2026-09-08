import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { getCurrentUser } from "../lib/auth.ts";

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    title: v.string(),
    contentType: v.string(),
    status: v.optional(v.string()),
    targetKeyword: v.optional(v.string()),
    secondaryKeywords: v.optional(v.array(v.string())),
    content: v.optional(v.string()),
    metaTitle: v.optional(v.string()),
    metaDescription: v.optional(v.string()),
    targetUrl: v.optional(v.string()),
    scheduledAt: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const now = new Date().toISOString();
    return ctx.db.insert("contentPieces", {
      ...args,
      status: args.status ?? "idea",
      userId: user._id,
      wordCount: args.content ? args.content.split(/\s+/).length : 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("contentPieces"),
    title: v.optional(v.string()),
    status: v.optional(v.string()),
    content: v.optional(v.string()),
    metaTitle: v.optional(v.string()),
    metaDescription: v.optional(v.string()),
    targetKeyword: v.optional(v.string()),
    secondaryKeywords: v.optional(v.array(v.string())),
    targetUrl: v.optional(v.string()),
    scheduledAt: v.optional(v.string()),
    publishedAt: v.optional(v.string()),
    notes: v.optional(v.string()),
    qualityScore: v.optional(v.number()),
    qualityFlags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const piece = await ctx.db.get(args.id);
    if (!piece) throw new ConvexError({ code: "NOT_FOUND", message: "Content piece not found" });
    if (piece.userId !== user._id) throw new ConvexError({ code: "FORBIDDEN", message: "Not your content" });

    const { id, ...updates } = args;
    const wordCount = updates.content ? updates.content.split(/\s+/).length : piece.wordCount;
    await ctx.db.patch(id, { ...updates, wordCount, updatedAt: new Date().toISOString() });
  },
});

export const remove = mutation({
  args: { id: v.id("contentPieces") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const piece = await ctx.db.get(args.id);
    if (!piece) return;
    if (piece.userId !== user._id) throw new ConvexError({ code: "FORBIDDEN", message: "Not your content" });
    await ctx.db.delete(args.id);
  },
});
