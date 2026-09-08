import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { getCurrentUser } from "../lib/auth.ts";
import type { Id } from "../_generated/dataModel.d.ts";

export const addRequests = mutation({
  args: {
    projectId: v.id("projects"),
    urls: v.array(v.string()),
    reason: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });

    const now = new Date().toISOString();
    const ids: Id<"urlRemovalRequests">[] = [];

    for (const url of args.urls) {
      // Skip duplicates that are already queued/submitted
      const existing = await ctx.db
        .query("urlRemovalRequests")
        .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
        .filter((q) => q.eq(q.field("url"), url))
        .first();

      if (existing && (existing.status === "queued" || existing.status === "submitted")) {
        continue;
      }

      const id = await ctx.db.insert("urlRemovalRequests", {
        projectId: args.projectId,
        userId: user._id,
        url,
        reason: args.reason,
        notes: args.notes,
        status: "queued",
        createdAt: now,
      });
      ids.push(id);
    }

    return { added: ids.length, skipped: args.urls.length - ids.length };
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("urlRemovalRequests"),
    status: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });

    const req = await ctx.db.get(args.id);
    if (!req) throw new ConvexError({ code: "NOT_FOUND", message: "Request not found" });

    const now = new Date().toISOString();
    const patch: Record<string, string | undefined> = { status: args.status };
    if (args.notes !== undefined) patch.notes = args.notes;
    if (args.status === "submitted") patch.submittedAt = now;
    if (args.status === "removed" || args.status === "denied") patch.resolvedAt = now;

    await ctx.db.patch(args.id, patch);
  },
});

export const markSubmitted = mutation({
  args: {
    ids: v.array(v.id("urlRemovalRequests")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });
    const now = new Date().toISOString();
    for (const id of args.ids) {
      await ctx.db.patch(id, { status: "submitted", submittedAt: now });
    }
  },
});

export const deleteRequest = mutation({
  args: { id: v.id("urlRemovalRequests") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });
    await ctx.db.delete(args.id);
  },
});
