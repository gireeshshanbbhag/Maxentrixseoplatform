import { ConvexError, v } from "convex/values";
import { query, mutation } from "../_generated/server";
import type { Doc } from "../_generated/dataModel.d.ts";

// Simple password check — set SERP_ADMIN_PASSWORD in Secrets
function checkPassword(password: string) {
  const expected = process.env.SERP_ADMIN_PASSWORD;
  if (!expected) throw new ConvexError({ code: "FORBIDDEN", message: "SERP_ADMIN_PASSWORD secret not set" });
  if (password !== expected) throw new ConvexError({ code: "FORBIDDEN", message: "Invalid admin password" });
}

// List all projects across all users with their user info
export const listAllProjects = query({
  args: { password: v.string() },
  handler: async (ctx, args): Promise<Array<Doc<"projects"> & { userName?: string; userEmail?: string }>> => {
    checkPassword(args.password);
    const projects = await ctx.db.query("projects").collect();
    return await Promise.all(
      projects.map(async (p) => {
        const user = await ctx.db.get(p.userId);
        return {
          ...p,
          userName: user?.name,
          userEmail: user?.email,
        };
      })
    );
  },
});

// Set or clear the spySerpProjectId for any project
export const setProjectSerpId = mutation({
  args: {
    password: v.string(),
    projectId: v.id("projects"),
    spySerpProjectId: v.union(v.number(), v.null()),
  },
  handler: async (ctx, args): Promise<void> => {
    checkPassword(args.password);
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new ConvexError({ code: "NOT_FOUND", message: "Project not found" });
    await ctx.db.patch(args.projectId, {
      spySerpProjectId: args.spySerpProjectId ?? undefined,
    });
  },
});

// List keywords for a project (for admin view)
export const listProjectKeywords = query({
  args: { password: v.string(), projectId: v.id("projects") },
  handler: async (ctx, args) => {
    checkPassword(args.password);
    return await ctx.db
      .query("keywords")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .take(200);
  },
});
