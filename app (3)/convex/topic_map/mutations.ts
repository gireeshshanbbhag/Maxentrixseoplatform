import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

const clusterPageValidator = v.object({
  keyword: v.string(),
  intent: v.string(),
  pageUrl: v.optional(v.string()),
  status: v.string(),
  notes: v.optional(v.string()),
});

export const createCluster = mutation({
  args: {
    projectId: v.id("projects"),
    pillarTopic: v.string(),
    pillarKeyword: v.string(),
    description: v.optional(v.string()),
    pillarPageUrl: v.optional(v.string()),
    clusterPages: v.array(clusterPageValidator),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    return ctx.db.insert("topicClusters", {
      projectId: args.projectId,
      pillarTopic: args.pillarTopic,
      pillarKeyword: args.pillarKeyword,
      description: args.description,
      pillarPageUrl: args.pillarPageUrl,
      clusterPages: args.clusterPages,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateCluster = mutation({
  args: {
    id: v.id("topicClusters"),
    pillarTopic: v.optional(v.string()),
    pillarKeyword: v.optional(v.string()),
    description: v.optional(v.string()),
    pillarPageUrl: v.optional(v.string()),
    clusterPages: v.optional(v.array(clusterPageValidator)),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const cluster = await ctx.db.get(id);
    if (!cluster) throw new ConvexError({ code: "NOT_FOUND", message: "Cluster not found" });
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (fields.pillarTopic !== undefined) updates.pillarTopic = fields.pillarTopic;
    if (fields.pillarKeyword !== undefined) updates.pillarKeyword = fields.pillarKeyword;
    if (fields.description !== undefined) updates.description = fields.description;
    if (fields.pillarPageUrl !== undefined) updates.pillarPageUrl = fields.pillarPageUrl;
    if (fields.clusterPages !== undefined) updates.clusterPages = fields.clusterPages;
    if (fields.status !== undefined) updates.status = fields.status;
    await ctx.db.patch(id, updates);
  },
});

export const deleteCluster = mutation({
  args: { id: v.id("topicClusters") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
