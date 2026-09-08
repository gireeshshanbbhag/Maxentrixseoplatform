"use node";
import { action } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { api, internal } from "../_generated/api.js";
import type { ActionCtx } from "../_generated/server";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const GA4_API_BASE = "https://analyticsdata.googleapis.com/v1beta";
const GA4_ADMIN_BASE = "https://analyticsadmin.googleapis.com/v1beta";

async function getFreshToken(ctx: ActionCtx): Promise<string> {
  const conn = await ctx.runQuery(api.ga4.queries.getConnection, {});
  if (!conn) throw new ConvexError({ code: "NOT_FOUND", message: "GA4 not connected" });

  const expiresAt = new Date(conn.expiresAt).getTime();
  if (Date.now() < expiresAt - 5 * 60 * 1000) {
    const fullConn = await ctx.runQuery(internal.ga4.internalQueries.getFullConnection, {});
    if (!fullConn) throw new ConvexError({ code: "NOT_FOUND", message: "GA4 connection not found" });
    return fullConn.accessToken;
  }

  const fullConn = await ctx.runQuery(internal.ga4.internalQueries.getFullConnection, {});
  if (!fullConn) throw new ConvexError({ code: "NOT_FOUND", message: "GA4 connection not found" });

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;

  const params = new URLSearchParams({
    refresh_token: fullConn.refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: "Failed to refresh GA4 token. Please reconnect." });
  }

  const data = await res.json() as { access_token: string; expires_in: number };
  const newExpiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

  await ctx.runMutation(api.ga4.mutations.updateTokens, {
    accessToken: data.access_token,
    expiresAt: newExpiresAt,
  });

  return data.access_token;
}

export const exchangeCode = action({
  args: { code: v.string(), redirectUri: v.string() },
  handler: async (ctx, args): Promise<{ email: string }> => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Google OAuth not configured." });
    }

    const params = new URLSearchParams({
      code: args.code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: args.redirectUri,
      grant_type: "authorization_code",
    });

    const tokenRes = await fetch(TOKEN_URL, {
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
      throw new ConvexError({ code: "BAD_REQUEST", message: "No refresh token returned." });
    }

    const userRes = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo = await userRes.json() as { email?: string };

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
    await ctx.runMutation(api.ga4.mutations.saveConnection, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
      googleEmail: userInfo.email,
    });

    return { email: userInfo.email ?? "Unknown" };
  },
});

export type GA4Property = {
  name: string; // "properties/123456789"
  displayName: string;
  websiteUrl?: string;
};

export const listProperties = action({
  args: {},
  handler: async (ctx): Promise<GA4Property[]> => {
    const token = await getFreshToken(ctx);

    const res = await fetch(`${GA4_ADMIN_BASE}/accountSummaries`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: `Failed to list GA4 properties: ${err}` });
    }

    const data = await res.json() as {
      accountSummaries?: Array<{
        propertySummaries?: Array<{
          property: string;
          displayName: string;
        }>;
      }>;
    };

    const properties: GA4Property[] = [];
    for (const account of data.accountSummaries ?? []) {
      for (const prop of account.propertySummaries ?? []) {
        properties.push({
          name: prop.property,
          displayName: prop.displayName,
        });
      }
    }
    return properties;
  },
});

export type GA4ReportRow = {
  dimensionValues: string[];
  metricValues: string[];
};

export type GA4ReportResult = {
  rows: GA4ReportRow[];
  dimensionHeaders: string[];
  metricHeaders: string[];
};

export const runReport = action({
  args: {
    propertyId: v.string(), // "properties/123456789"
    startDate: v.string(),
    endDate: v.string(),
    dimensions: v.array(v.string()),
    metrics: v.array(v.string()),
    dimensionFilter: v.optional(v.string()), // JSON-encoded filter
    limit: v.optional(v.number()),
    orderBy: v.optional(v.string()), // JSON-encoded orderBy
  },
  handler: async (ctx, args): Promise<GA4ReportResult> => {
    const token = await getFreshToken(ctx);

    const body: Record<string, unknown> = {
      dateRanges: [{ startDate: args.startDate, endDate: args.endDate }],
      dimensions: args.dimensions.map((d) => ({ name: d })),
      metrics: args.metrics.map((m) => ({ name: m })),
      limit: args.limit ?? 100,
    };

    if (args.dimensionFilter) {
      body.dimensionFilter = JSON.parse(args.dimensionFilter) as unknown;
    }
    if (args.orderBy) {
      body.orderBys = JSON.parse(args.orderBy) as unknown;
    }

    const propId = args.propertyId.replace("properties/", "");
    const res = await fetch(`${GA4_API_BASE}/properties/${propId}:runReport`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: `GA4 API error: ${err}` });
    }

    const data = await res.json() as {
      rows?: Array<{
        dimensionValues: Array<{ value: string }>;
        metricValues: Array<{ value: string }>;
      }>;
      dimensionHeaders?: Array<{ name: string }>;
      metricHeaders?: Array<{ name: string }>;
    };

    return {
      rows: (data.rows ?? []).map((r) => ({
        dimensionValues: (r.dimensionValues ?? []).map((v) => v.value),
        metricValues: (r.metricValues ?? []).map((v) => v.value),
      })),
      dimensionHeaders: (data.dimensionHeaders ?? []).map((h) => h.name),
      metricHeaders: (data.metricHeaders ?? []).map((h) => h.name),
    };
  },
});
