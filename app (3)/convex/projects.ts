import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel.d.ts";
import { getCurrentUser } from "./lib/auth.ts";

export const list = query({
  args: {},
  handler: async (ctx): Promise<Doc<"projects">[]> => {
    const user = await getCurrentUser(ctx);
    return await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const getById = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args): Promise<Doc<"projects"> | null> => {
    const user = await getCurrentUser(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== user._id) {
      return null;
    }
    return project;
  },
});

export const getLocations = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args): Promise<Doc<"projectLocations">[]> => {
    const user = await getCurrentUser(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== user._id) {
      return [];
    }
    return await ctx.db
      .query("projectLocations")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    websiteUrl: v.string(),
    websiteType: v.string(),
    businessName: v.optional(v.string()),
    businessCategory: v.optional(v.string()),
    country: v.optional(v.string()),
    state: v.optional(v.string()),
    district: v.optional(v.string()),
    city: v.optional(v.string()),
    primaryLanguage: v.optional(v.string()),
    secondaryLanguages: v.optional(v.array(v.string())),
    businessDescription: v.optional(v.string()),
    primaryServices: v.optional(v.string()),
    products: v.optional(v.string()),
    primaryAudience: v.optional(v.string()),
    primaryConversionGoal: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    notes: v.optional(v.string()),
    // Target locations
    targetLocations: v.optional(
      v.array(
        v.object({
          country: v.string(),
          state: v.optional(v.string()),
          district: v.optional(v.string()),
          city: v.optional(v.string()),
          isPrimary: v.boolean(),
        }),
      ),
    ),
  },
  handler: async (ctx, args): Promise<Id<"projects">> => {
    const user = await getCurrentUser(ctx);

    // Prevent duplicate: same URL for the same user (non-archived)
    const existing = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const duplicate = existing.find(
      (p) => p.websiteUrl === args.websiteUrl && p.status !== "archived"
    );
    if (duplicate) {
      throw new ConvexError({
        code: "CONFLICT",
        message: `A project for "${args.websiteUrl}" already exists. Edit the existing project or use a different URL.`,
      });
    }

    const { targetLocations, ...projectData } = args;

    const projectId = await ctx.db.insert("projects", {
      ...projectData,
      userId: user._id,
      status: "active",
    });

    // Insert target locations
    if (targetLocations && targetLocations.length > 0) {
      for (const loc of targetLocations) {
        await ctx.db.insert("projectLocations", {
          projectId,
          country: loc.country,
          state: loc.state,
          district: loc.district,
          city: loc.city,
          isPrimary: loc.isPrimary,
        });
      }
    }

    return projectId;
  },
});

export const update = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    websiteType: v.optional(v.string()),
    businessName: v.optional(v.string()),
    businessCategory: v.optional(v.string()),
    country: v.optional(v.string()),
    state: v.optional(v.string()),
    district: v.optional(v.string()),
    city: v.optional(v.string()),
    primaryLanguage: v.optional(v.string()),
    secondaryLanguages: v.optional(v.array(v.string())),
    businessDescription: v.optional(v.string()),
    primaryServices: v.optional(v.string()),
    products: v.optional(v.string()),
    primaryAudience: v.optional(v.string()),
    primaryConversionGoal: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.optional(v.string()),
    gscPropertyUrl: v.optional(v.string()),
    ga4PropertyId: v.optional(v.string()),
    gbpStatus: v.optional(v.string()),
    pagespeedApiKey: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    spySerpProjectId: v.optional(v.number()),
    spySerpDomainId: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<void> => {
    const user = await getCurrentUser(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== user._id) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "You do not have access to this project",
      });
    }

    const { projectId, ...updates } = args;
    // Filter out undefined values to only patch what was provided
    const patchData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        patchData[key] = value;
      }
    }
    if (Object.keys(patchData).length > 0) {
      await ctx.db.patch(projectId, patchData);
    }
  },
});

export const remove = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args): Promise<void> => {
    const user = await getCurrentUser(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== user._id) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "You do not have access to this project",
      });
    }

    // Delete associated target locations
    const locations = await ctx.db
      .query("projectLocations")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const loc of locations) {
      await ctx.db.delete(loc._id);
    }

    await ctx.db.delete(args.projectId);
  },
});

// Add a target location to a project
export const addLocation = mutation({
  args: {
    projectId: v.id("projects"),
    country: v.string(),
    state: v.optional(v.string()),
    district: v.optional(v.string()),
    city: v.optional(v.string()),
    isPrimary: v.boolean(),
  },
  handler: async (ctx, args): Promise<Id<"projectLocations">> => {
    const user = await getCurrentUser(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== user._id) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "You do not have access to this project",
      });
    }
    const { projectId, ...locationData } = args;
    return await ctx.db.insert("projectLocations", {
      projectId,
      ...locationData,
    });
  },
});

// Remove a target location
export const removeLocation = mutation({
  args: { locationId: v.id("projectLocations") },
  handler: async (ctx, args): Promise<void> => {
    const user = await getCurrentUser(ctx);
    const location = await ctx.db.get(args.locationId);
    if (!location) return;

    const project = await ctx.db.get(location.projectId);
    if (!project || project.userId !== user._id) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "You do not have access to this project",
      });
    }
    await ctx.db.delete(args.locationId);
  },
});
