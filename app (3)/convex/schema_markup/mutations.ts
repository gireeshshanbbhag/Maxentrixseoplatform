import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { getCurrentUser } from "../lib/auth.ts";

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    schemaType: v.string(),
    jsonld: v.string(),
    targetUrl: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const now = new Date().toISOString();
    return ctx.db.insert("schemaMarkups", {
      ...args,
      userId: user._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("schemaMarkups"),
    name: v.optional(v.string()),
    schemaType: v.optional(v.string()),
    jsonld: v.optional(v.string()),
    targetUrl: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const markup = await ctx.db.get(args.id);
    if (!markup) throw new ConvexError({ code: "NOT_FOUND", message: "Schema markup not found" });
    if (markup.userId !== user._id) throw new ConvexError({ code: "FORBIDDEN", message: "Not your schema" });
    const { id, ...updates } = args;
    await ctx.db.patch(id, { ...updates, updatedAt: new Date().toISOString() });
  },
});

export const remove = mutation({
  args: { id: v.id("schemaMarkups") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const markup = await ctx.db.get(args.id);
    if (!markup) return;
    if (markup.userId !== user._id) throw new ConvexError({ code: "FORBIDDEN", message: "Not your schema" });
    await ctx.db.delete(args.id);
  },
});
