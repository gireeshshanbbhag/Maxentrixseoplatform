"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

/**
 * Fetch and parse robots.txt for a given domain.
 */
export const fetchRobotsTxt = action({
  args: { websiteUrl: v.string() },
  handler: async (_ctx, args): Promise<{
    content: string;
    hasDisallowAll: boolean;
    sitemapUrls: string[];
    disallowedPaths: string[];
    crawlDelay: number | null;
    fetchedAt: string;
  }> => {
    let base = args.websiteUrl.replace(/\/$/, "");
    if (!base.startsWith("http")) base = "https://" + base;
    const url = `${base}/robots.txt`;

    let content = "";
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      content = await res.text();
    } catch (e) {
      throw new ConvexError({
        code: "EXTERNAL_SERVICE_ERROR",
        message: `Could not fetch robots.txt: ${(e as Error).message}`,
      });
    }

    const lines = content.split("\n").map((l) => l.trim());
    const sitemapUrls: string[] = [];
    const disallowedPaths: string[] = [];
    let hasDisallowAll = false;
    let crawlDelay: number | null = null;

    let inUserAgentAll = false;
    for (const line of lines) {
      if (line.toLowerCase().startsWith("user-agent:")) {
        const agent = line.split(":")[1]?.trim();
        inUserAgentAll = agent === "*";
      }
      if (line.toLowerCase().startsWith("sitemap:")) {
        const sm = line.split(/sitemap:/i)[1]?.trim();
        if (sm) sitemapUrls.push(sm);
      }
      if (inUserAgentAll && line.toLowerCase().startsWith("disallow:")) {
        const path = line.split(":")[1]?.trim();
        if (path === "/") hasDisallowAll = true;
        if (path) disallowedPaths.push(path);
      }
      if (inUserAgentAll && line.toLowerCase().startsWith("crawl-delay:")) {
        const delay = parseFloat(line.split(":")[1]?.trim() ?? "");
        if (!isNaN(delay)) crawlDelay = delay;
      }
    }

    return {
      content,
      hasDisallowAll,
      sitemapUrls,
      disallowedPaths,
      crawlDelay,
      fetchedAt: new Date().toISOString(),
    };
  },
});

/**
 * Fetch and parse an XML sitemap.
 */
export const fetchSitemap = action({
  args: { sitemapUrl: v.string() },
  handler: async (_ctx, args): Promise<{
    urls: Array<{ loc: string; lastmod?: string; changefreq?: string; priority?: string }>;
    sitemapIndexUrls: string[];
    totalCount: number;
    isSitemapIndex: boolean;
    fetchedAt: string;
  }> => {
    let content = "";
    try {
      const res = await fetch(args.sitemapUrl, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      content = await res.text();
    } catch (e) {
      throw new ConvexError({
        code: "EXTERNAL_SERVICE_ERROR",
        message: `Could not fetch sitemap: ${(e as Error).message}`,
      });
    }

    const isSitemapIndex = content.includes("<sitemapindex");
    const urls: Array<{ loc: string; lastmod?: string; changefreq?: string; priority?: string }> = [];
    const sitemapIndexUrls: string[] = [];

    if (isSitemapIndex) {
      // Extract nested sitemap locs
      const locMatches = content.matchAll(/<loc>(.*?)<\/loc>/gs);
      for (const match of locMatches) {
        const loc = match[1]?.trim();
        if (loc) sitemapIndexUrls.push(loc);
      }
    } else {
      // Parse <url> entries
      const urlBlocks = content.matchAll(/<url>(.*?)<\/url>/gs);
      for (const block of urlBlocks) {
        const inner = block[1] ?? "";
        const loc = inner.match(/<loc>(.*?)<\/loc>/s)?.[1]?.trim();
        if (!loc) continue;
        const lastmod = inner.match(/<lastmod>(.*?)<\/lastmod>/s)?.[1]?.trim();
        const changefreq = inner.match(/<changefreq>(.*?)<\/changefreq>/s)?.[1]?.trim();
        const priority = inner.match(/<priority>(.*?)<\/priority>/s)?.[1]?.trim();
        urls.push({ loc, lastmod, changefreq, priority });
      }
    }

    return {
      urls: urls.slice(0, 1000),
      sitemapIndexUrls,
      totalCount: isSitemapIndex ? sitemapIndexUrls.length : urls.length,
      isSitemapIndex,
      fetchedAt: new Date().toISOString(),
    };
  },
});

/**
 * Inspect a URL for live meta / indexability data.
 */
export const inspectUrl = action({
  args: { url: v.string() },
  handler: async (_ctx, args): Promise<{
    finalUrl: string;
    statusCode: number;
    redirectChain: string[];
    title: string | null;
    metaDescription: string | null;
    canonical: string | null;
    robotsMeta: string | null;
    h1: string | null;
    ogTitle: string | null;
    ogDescription: string | null;
    ogImage: string | null;
    hasSchemaMarkup: boolean;
    schemaTypes: string[];
    isIndexable: boolean;
    indexabilityIssues: string[];
    loadTimeMs: number;
    inspectedAt: string;
  }> => {
    const start = Date.now();
    let url = args.url.trim();
    if (!url.startsWith("http")) url = "https://" + url;

    const redirectChain: string[] = [];
    let finalUrl = url;
    let statusCode = 0;
    let html = "";

    try {
      // Manual redirect tracking
      let current = url;
      for (let i = 0; i < 5; i++) {
        const res = await fetch(current, {
          redirect: "manual",
          signal: AbortSignal.timeout(10000),
          headers: { "User-Agent": "MaxentrixBot/1.0 (SEO Inspector)" },
        });
        statusCode = res.status;
        if (res.status >= 300 && res.status < 400) {
          const loc = res.headers.get("location");
          if (loc) {
            redirectChain.push(current);
            current = loc.startsWith("http") ? loc : new URL(loc, current).href;
          } else break;
        } else {
          finalUrl = current;
          html = await res.text();
          break;
        }
      }
    } catch (e) {
      throw new ConvexError({
        code: "EXTERNAL_SERVICE_ERROR",
        message: `Could not fetch URL: ${(e as Error).message}`,
      });
    }

    const loadTimeMs = Date.now() - start;

    // Extract meta tags
    const title = html.match(/<title[^>]*>(.*?)<\/title>/si)?.[1]?.trim() ?? null;
    const metaDescription = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/si)?.[1]?.trim()
      ?? html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/si)?.[1]?.trim() ?? null;
    const canonical = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/si)?.[1]?.trim()
      ?? html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["']canonical["']/si)?.[1]?.trim() ?? null;
    const robotsMeta = html.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']*)["']/si)?.[1]?.trim()
      ?? html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']robots["']/si)?.[1]?.trim() ?? null;
    const h1 = html.match(/<h1[^>]*>(.*?)<\/h1>/si)?.[1]?.replace(/<[^>]+>/g, "").trim() ?? null;
    const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/si)?.[1]?.trim() ?? null;
    const ogDescription = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/si)?.[1]?.trim() ?? null;
    const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/si)?.[1]?.trim() ?? null;

    // Schema markup
    const schemaBlocks = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gsi);
    const schemaTypes: string[] = [];
    let hasSchemaMarkup = false;
    for (const block of schemaBlocks) {
      hasSchemaMarkup = true;
      try {
        const parsed = JSON.parse(block[1] ?? "{}") as { "@type"?: string };
        if (parsed["@type"]) schemaTypes.push(parsed["@type"]);
      } catch { /* ignore */ }
    }

    // Indexability
    const indexabilityIssues: string[] = [];
    if (statusCode >= 400) indexabilityIssues.push(`HTTP ${statusCode} error`);
    if (redirectChain.length > 0) indexabilityIssues.push(`Redirects through ${redirectChain.length} URL(s)`);
    if (robotsMeta && (robotsMeta.includes("noindex") || robotsMeta.includes("none"))) {
      indexabilityIssues.push("noindex meta robots tag");
    }
    if (!canonical) indexabilityIssues.push("No canonical tag");
    else if (canonical !== finalUrl) indexabilityIssues.push(`Canonical points to different URL: ${canonical}`);
    if (!title) indexabilityIssues.push("Missing title tag");
    if (!metaDescription) indexabilityIssues.push("Missing meta description");

    return {
      finalUrl,
      statusCode,
      redirectChain,
      title,
      metaDescription,
      canonical,
      robotsMeta,
      h1,
      ogTitle,
      ogDescription,
      ogImage,
      hasSchemaMarkup,
      schemaTypes,
      isIndexable: indexabilityIssues.length === 0,
      indexabilityIssues,
      loadTimeMs,
      inspectedAt: new Date().toISOString(),
    };
  },
});
