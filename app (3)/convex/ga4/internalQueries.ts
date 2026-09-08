import { internalQuery } from "../_generated/server";
import { getCurrentUser } from "../lib/auth.ts";

export const getFullConnection = internalQuery({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    return ctx.db
      .query("ga4Connections")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
  },
});
