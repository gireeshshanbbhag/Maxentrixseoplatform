import { query } from "../_generated/server";
import { getCurrentUser } from "../lib/auth.ts";

export const getConnection = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return null;

    const conn = await ctx.db
      .query("ga4Connections")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (!conn) return null;

    // Return connection info without tokens
    return {
      _id: conn._id,
      googleEmail: conn.googleEmail,
      expiresAt: conn.expiresAt,
      selectedProperties: conn.selectedProperties,
    };
  },
});
