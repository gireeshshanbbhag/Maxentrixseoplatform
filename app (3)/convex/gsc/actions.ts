"use node";
import { action, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { api, internal } from "../_generated/api.js";
import type { ActionCtx } from "../_generated/server";

const GSC_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GSC_API_BASE = "https://searchconsole.googleapis.com";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

/** Exchange OAuth code for tokens */
export const exchangeCode = action({
  args: {
    code: v.string(),
    redirectUri: v.string(),
  },
  handler: async (ctx, args): Promise<{ email: string }> => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Google OAuth not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your Secrets." });
    }

    const params = new URLSearchParams({
      code: args.code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: args.redirectUri,
      grant_type: "authorization_code",
    });

    const tokenRes = await fetch(GSC_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      throw new ConvexError({ code: "BAD_REQUEST", message: `Token exchange failed: ${err}` });
    }

    const tokens = await tokenRes.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    if (!tokens.refresh_token) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "No refresh token returned. Ensure access_type=offline and prompt=consent are set." });
    }

    // Fetch user info
    const userRes = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo = await userRes.json() as { email?: string };

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
    await ctx.runMutation(api.gsc.mutations.saveConnection, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
      googleEmail: userInfo.email,
    });

    return { email: userInfo.email ?? "Unknown" };
  },
});

/** Get a fresh access token, refreshing if expired */
async function getFreshToken(ctx: ActionCtx): Promise<string> {
  const conn = await ctx.runQuery(api.gsc.queries.getConnection, {});
  if (!conn) throw new ConvexError({ code: "NOT_FOUND", message: "GSC not connected" });

  // Check if token is about to expire (within 5 min)
  const expiresAt = new Date(conn.expiresAt).getTime();
  if (Date.now() < expiresAt - 5 * 60 * 1000) {
    // Need to get the actual token from db - re-query via action
    const fullConn = await ctx.runQuery(internal.gsc.internalQueries.getFullConnection, {});
    if (!fullConn) throw new ConvexError({ code: "NOT_FOUND", message: "GSC connection not found" });
    return fullConn.accessToken;
  }

  // Refresh
  const fullConn = await ctx.runQuery(internal.gsc.internalQueries.getFullConnection, {});
  if (!fullConn) throw new ConvexError({ code: "NOT_FOUND", message: "GSC connection not found" });

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
    throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: "Failed to refresh GSC token. Please reconnect." });
  }

  const data = await res.json() as { access_token: string; expires_in: number };
  const newExpiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

  await ctx.runMutation(api.gsc.mutations.updateTokens, {
    accessToken: data.access_token,
    expiresAt: newExpiresAt,
  });

  return data.access_token;
}

/** List all GSC properties the user has access to */
export const listProperties = action({
  args: {},
  handler: async (ctx): Promise<Array<{ siteUrl: string; permissionLevel: string }>> => {
    const token = await getFreshToken(ctx);

    const res = await fetch(`${GSC_API_BASE}/webmasters/v3/sites`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: `Failed to list properties: ${err}` });
    }

    const data = await res.json() as { siteEntry?: Array<{ siteUrl: string; permissionLevel: string }> };
    return data.siteEntry ?? [];
  },
});

export type GscRow = {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type GscSearchAnalyticsResult = {
  rows: GscRow[];
  totalClicks: number;
  totalImpressions: number;
  avgCtr: number;
  avgPosition: number;
};

/** Fetch search analytics data */
export const fetchSearchAnalytics = action({
  args: {
    projectId: v.id("projects"),
    propertyUrl: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    dimensions: v.array(v.string()),
    rowLimit: v.optional(v.number()),
    cacheKey: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<GscSearchAnalyticsResult> => {
    // Check cache
    if (args.cacheKey) {
      const cached = await ctx.runQuery(api.gsc.queries.getCacheEntry, {
        projectId: args.projectId,
        cacheKey: args.cacheKey,
      });
      if (cached) {
        return JSON.parse(cached.data) as GscSearchAnalyticsResult;
      }
    }

    const token = await getFreshToken(ctx);
    const siteUrl = encodeURIComponent(args.propertyUrl);

    const body = {
      startDate: args.startDate,
      endDate: args.endDate,
      dimensions: args.dimensions,
      rowLimit: args.rowLimit ?? 500,
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

    const totalClicks = rows.reduce((s, r) => s + r.clicks, 0);
    const totalImpressions = rows.reduce((s, r) => s + r.impressions, 0);
    const avgCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
    const avgPosition = rows.length > 0
      ? rows.reduce((s, r) => s + r.position, 0) / rows.length
      : 0;

    const result: GscSearchAnalyticsResult = { rows, totalClicks, totalImpressions, avgCtr, avgPosition };

    // Cache for 60 minutes
    if (args.cacheKey) {
      await ctx.runMutation(api.gsc.mutations.setCacheEntry, {
        projectId: args.projectId,
        cacheKey: args.cacheKey,
        data: JSON.stringify(result),
        ttlMinutes: 60,
      });
    }

    return result;
  },
});

/** URL Inspection API */
export const inspectUrl = action({
  args: {
    siteUrl: v.string(),
    inspectionUrl: v.string(),
  },
  handler: async (ctx, args): Promise<unknown> => {
    const token = await getFreshToken(ctx);

    const res = await fetch(`${GSC_API_BASE}/v1/urlInspection/index:inspect`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inspectionUrl: args.inspectionUrl,
        siteUrl: args.siteUrl,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: `URL inspection failed: ${err}` });
    }

    return res.json();
  },
});

/** List sitemaps */
export const listSitemaps = action({
  args: { siteUrl: v.string() },
  handler: async (ctx, args): Promise<unknown> => {
    const token = await getFreshToken(ctx);
    const encodedSite = encodeURIComponent(args.siteUrl);

    const res = await fetch(
      `${GSC_API_BASE}/webmasters/v3/sites/${encodedSite}/sitemaps`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: `Failed to list sitemaps: ${err}` });
    }

    return res.json();
  },
});

/** Submit sitemap */
export const submitSitemap = action({
  args: {
    siteUrl: v.string(),
    feedpath: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    const token = await getFreshToken(ctx);
    const encodedSite = encodeURIComponent(args.siteUrl);
    const encodedFeed = encodeURIComponent(args.feedpath);

    const res = await fetch(
      `${GSC_API_BASE}/webmasters/v3/sites/${encodedSite}/sitemaps/${encodedFeed}`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: `Failed to submit sitemap: ${err}` });
    }
  },
});

/** Delete sitemap */
export const deleteSitemap = action({
  args: {
    siteUrl: v.string(),
    feedpath: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    const token = await getFreshToken(ctx);
    const encodedSite = encodeURIComponent(args.siteUrl);
    const encodedFeed = encodeURIComponent(args.feedpath);

    await fetch(
      `${GSC_API_BASE}/webmasters/v3/sites/${encodedSite}/sitemaps/${encodedFeed}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
  },
});
