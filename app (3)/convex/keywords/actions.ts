"use node";
import { action } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { api, internal } from "../_generated/api.js";
import type { ActionCtx } from "../_generated/server";

const GSC_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GSC_API_BASE = "https://searchconsole.googleapis.com";

async function getFreshGscToken(ctx: ActionCtx): Promise<string> {
  const conn = await ctx.runQuery(api.gsc.queries.getConnection, {});
  if (!conn) throw new ConvexError({ code: "NOT_FOUND", message: "Google Search Console is not connected. Connect GSC first to sync rankings." });

  const fullConn = await ctx.runQuery(internal.gsc.internalQueries.getFullConnection, {});
  if (!fullConn) throw new ConvexError({ code: "NOT_FOUND", message: "GSC connection not found." });

  const expiresAt = new Date(conn.expiresAt).getTime();
  if (Date.now() < expiresAt - 5 * 60 * 1000) {
    return fullConn.accessToken;
  }

  // Refresh token
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;

  const params = new URLSearchParams({
    refresh_token: fullConn.refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  });

  const res = await fetch(GSC_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: "Failed to refresh GSC token. Please reconnect Search Console." });
  }

  const data = await res.json() as { access_token: string; expires_in: number };
  const newExpiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
  await ctx.runMutation(api.gsc.mutations.updateTokens, { accessToken: data.access_token, expiresAt: newExpiresAt });
  return data.access_token;
}

type GscRow = {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

/**
 * Sync keyword rankings from GSC search analytics.
 * Queries GSC for each keyword in the project and stores rank snapshots.
 */
export const syncRankings = action({
  args: {
    projectId: v.id("projects"),
    propertyUrl: v.string(),
  },
  handler: async (ctx, args): Promise<{ synced: number; notFound: number; total: number }> => {
    const token = await getFreshGscToken(ctx);

    // Fetch all keywords for this project
    const keywords = await ctx.runQuery(api.keywords.queries.listAllForSync, {
      projectId: args.projectId,
    });

    if (keywords.length === 0) {
      return { synced: 0, notFound: 0, total: 0 };
    }

    const today = new Date().toISOString().slice(0, 10);
    // Use last 7 days for rank data
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const siteUrl = encodeURIComponent(args.propertyUrl);

    // Build a set of tracked keywords for fast lookup
    const trackedKeywords = new Set(keywords.map((kw) => kw.keyword.toLowerCase().trim()));
    const rankMap = new Map<string, { position: number; clicks: number; impressions: number; ctr: number; url: string }>();

    // Fetch top queries from GSC without dimensionFilterGroups.
    // The GSC API does not support groupType "or" — instead we fetch a broad
    // result set (up to 25000 rows) and match tracked keywords in memory.
    let startRow = 0;
    const PAGE_SIZE = 5000;
    let hasMore = true;

    while (hasMore) {
      const body = {
        startDate,
        endDate: today,
        dimensions: ["query", "page"],
        rowLimit: PAGE_SIZE,
        startRow,
        dataState: "final",
      };

      const res = await fetch(
        `${GSC_API_BASE}/webmasters/v3/sites/${siteUrl}/searchAnalytics/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        const err = await res.text();
        throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: `GSC API error: ${err}` });
      }

      const data = await res.json() as { rows?: GscRow[] };
      const rows = data.rows ?? [];

      // Match returned rows against tracked keywords, keeping best (lowest) position
      for (const row of rows) {
        const query = row.keys[0]?.toLowerCase().trim();
        const url = row.keys[1] ?? "";
        if (!query || !trackedKeywords.has(query)) continue;

        const existing = rankMap.get(query);
        if (!existing || row.position < existing.position) {
          rankMap.set(query, {
            position: Math.round(row.position),
            clicks: row.clicks,
            impressions: row.impressions,
            ctr: row.ctr,
            url,
          });
        }
      }

      // Stop if we've already matched all tracked keywords or no more rows
      if (rows.length < PAGE_SIZE || rankMap.size >= trackedKeywords.size) {
        hasMore = false;
      } else {
        startRow += PAGE_SIZE;
        // Cap at 25k rows to avoid runaway loops
        if (startRow >= 25000) hasMore = false;
      }
    }

    // Save rank snapshots for each keyword
    let synced = 0;
    let notFound = 0;

    for (const kw of keywords) {
      const rank = rankMap.get(kw.keyword.toLowerCase().trim());

      await ctx.runMutation(api.keywords.mutations.addRankSnapshot, {
        keywordId: kw._id,
        snapshotDate: today,
        position: rank?.position,
        url: rank?.url,
        source: "gsc",
        clicks: rank?.clicks,
        impressions: rank?.impressions,
        ctr: rank?.ctr,
      });

      if (rank) {
        synced++;
      } else {
        notFound++;
      }
    }

    return { synced, notFound, total: keywords.length };
  },
});
