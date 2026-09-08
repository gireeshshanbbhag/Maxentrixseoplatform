"use node";
import { action } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { api } from "../_generated/api.js";

const PSI_API = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

export type CwvMetric = {
  id: string;
  title: string;
  displayValue: string;
  score: number | null; // 0–1
  numericValue?: number;
};

export type PageSpeedResult = {
  url: string;
  strategy: string;
  performanceScore: number | null;
  metrics: CwvMetric[];
  opportunities: Array<{
    id: string;
    title: string;
    description: string;
    displayValue?: string;
    score: number | null;
    savings?: number; // estimated ms savings
  }>;
  fetchedAt: string;
};

export const runPageSpeed = action({
  args: {
    projectId: v.id("projects"),
    url: v.string(),
    strategy: v.string(), // "mobile" | "desktop"
    forceRefresh: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<PageSpeedResult> => {
    // Check cache (24h TTL)
    if (!args.forceRefresh) {
      const cached = await ctx.runQuery(api.pagespeed.queries.getCachedResult, {
        projectId: args.projectId,
        url: args.url,
        strategy: args.strategy,
      });
      if (cached) {
        return JSON.parse(cached.data) as PageSpeedResult;
      }
    }

    const params = new URLSearchParams({
      url: args.url,
      strategy: args.strategy.toUpperCase(),
      category: "performance",
    });

    // API key is optional — raises quota limits but not required
    const apiKey = process.env.PAGESPEED_API_KEY;
    if (apiKey) {
      params.set("key", apiKey);
    }

    let res = await fetch(`${PSI_API}?${params.toString()}`);

    // If the key is expired/invalid, retry without it
    if (!res.ok && apiKey) {
      const errText = await res.text();
      const isKeyError = errText.includes("API_KEY_INVALID") || errText.includes("API key expired") || errText.includes("badRequest");
      if (isKeyError) {
        const paramsNoKey = new URLSearchParams({
          url: args.url,
          strategy: args.strategy.toUpperCase(),
          category: "performance",
        });
        res = await fetch(`${PSI_API}?${paramsNoKey.toString()}`);
        if (!res.ok) {
          const err2 = await res.text();
          throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: `PageSpeed API error: ${err2}` });
        }
      } else {
        throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: `PageSpeed API error: ${errText}` });
      }
    } else if (!res.ok) {
      const err = await res.text();
      throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: `PageSpeed API error: ${err}` });
    }

    const data = await res.json() as {
      lighthouseResult?: {
        categories?: { performance?: { score?: number } };
        audits?: Record<string, {
          id: string;
          title: string;
          description?: string;
          displayValue?: string;
          score?: number | null;
          numericValue?: number;
          details?: { type?: string; overallSavingsMs?: number };
        }>;
      };
    };

    const lr = data.lighthouseResult;
    const audits = lr?.audits ?? {};
    const perfScore = lr?.categories?.performance?.score ?? null;

    const CWV_METRICS = [
      "first-contentful-paint",
      "largest-contentful-paint",
      "total-blocking-time",
      "cumulative-layout-shift",
      "speed-index",
      "interactive",
    ];

    const metrics: CwvMetric[] = CWV_METRICS
      .filter((id) => audits[id])
      .map((id) => {
        const audit = audits[id];
        return {
          id,
          title: audit.title,
          displayValue: audit.displayValue ?? "",
          score: audit.score ?? null,
          numericValue: audit.numericValue,
        };
      });

    const OPPORTUNITY_IDS = [
      "render-blocking-resources",
      "unused-javascript",
      "unused-css-rules",
      "uses-optimized-images",
      "uses-webp-images",
      "uses-text-compression",
      "server-response-time",
      "redirects",
      "uses-long-cache-ttl",
    ];

    const opportunities = OPPORTUNITY_IDS
      .filter((id) => audits[id] && (audits[id].score ?? 1) < 0.9)
      .map((id) => {
        const audit = audits[id];
        return {
          id,
          title: audit.title,
          description: audit.description ?? "",
          displayValue: audit.displayValue,
          score: audit.score ?? null,
          savings: audit.details?.overallSavingsMs,
        };
      })
      .sort((a, b) => (b.savings ?? 0) - (a.savings ?? 0));

    const result: PageSpeedResult = {
      url: args.url,
      strategy: args.strategy,
      performanceScore: perfScore !== null ? Math.round(perfScore * 100) : null,
      metrics,
      opportunities,
      fetchedAt: new Date().toISOString(),
    };

    await ctx.runMutation(api.pagespeed.mutations.saveResult, {
      projectId: args.projectId,
      url: args.url,
      strategy: args.strategy,
      data: JSON.stringify(result),
    });

    return result;
  },
});
