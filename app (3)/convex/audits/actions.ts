import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { getCurrentUser } from "../lib/auth.ts";
import { ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel.d.ts";

/** Start the crawl for a queued audit. Called from the frontend after create. */
export const startAudit = mutation({
  args: { auditId: v.id("audits") },
  handler: async (ctx, args): Promise<void> => {
    const user = await getCurrentUser(ctx);
    const audit = await ctx.db.get(args.auditId);
    if (!audit || audit.userId !== user._id) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Not your audit" });
    }
    if (audit.status !== "queued") {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Audit is not in queued state" });
    }
    // Schedule the crawler action
    await ctx.scheduler.runAfter(0, internal.audits.crawler.startCrawl, {
      auditId: args.auditId,
    });
  },
});

/** Resume a paused audit by re-scheduling the crawler. */
export const resumeAudit = mutation({
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
    await ctx.scheduler.runAfter(0, internal.audits.crawler.processBatch, {
      auditId: args.auditId,
    });
  },
});
