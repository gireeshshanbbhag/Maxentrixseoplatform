import { internalQuery } from "../_generated/server";
import { getCurrentUser } from "../lib/auth.ts";

/** Internal query to get full connection including tokens (for server-side use only) */
export const getFullConnection = internalQuery({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    return ctx.db
      .query("gscConnections")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
  },
});
