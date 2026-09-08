"use node";

import { action } from "../_generated/server";
import { v, ConvexError } from "convex/values";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel.d.ts";

const DELAY_MS = 2500;

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function toGlParam(country?: string): string {
  if (!country) return "us";
  const c = country.toLowerCase();
  const MAP: Record<string, string> = {
    "india": "in", "in": "in",
    "united states": "us", "us": "us", "usa": "us",
    "united kingdom": "uk", "uk": "uk", "gb": "gb",
    "australia": "au", "au": "au",
    "canada": "ca", "ca": "ca",
    "germany": "de", "de": "de",
    "france": "fr", "fr": "fr",
    "singapore": "sg", "sg": "sg",
    "uae": "ae", "ae": "ae",
  };
  return MAP[c] ?? c.slice(0, 2);
}

function buildQuery(keyword: string, _country?: string, state?: string, city?: string): string {
  const parts = [keyword];
  if (city) parts.push(city);
  else if (state) parts.push(state);
  return parts.join(" ");
}

async function fetchGoogleHtml(keyword: string, gl: string): Promise<string> {
  const params = new URLSearchParams({
    q: keyword,
    num: "100",
    hl: "en",
    gl,
    pws: "0",
    nfpr: "1",
    ie: "UTF-8",
    oe: "UTF-8",
  });

  const url = `https://www.google.com/search?${params.toString()}`;

  // Do NOT send Accept-Encoding — we need plain text, not gzip/br binary
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      "Cache-Control": "no-cache",
    },
    redirect: "follow",
  });

  if (res.status === 429) {
    throw new ConvexError({ code: "BAD_REQUEST", message: "Google rate-limited this request. Wait a few minutes and try again." });
  }
  if (!res.ok) {
    throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: `Google returned HTTP ${res.status}` });
  }

  const html = await res.text();

  if (
    html.includes("unusual traffic") ||
    html.includes("g-recaptcha") ||
    html.includes("/sorry/") ||
    html.length < 500
  ) {
    throw new ConvexError({
      code: "BAD_REQUEST",
      message: "Google is showing a CAPTCHA. Wait 5–10 minutes and try again.",
    });
  }

  return html;
}

// Extract all candidate URLs from Google HTML using multiple strategies
function extractOrganicUrls(html: string): string[] {
  const candidates: string[] = [];
  const seen = new Set<string>();

  function add(u: string) {
    try {
      // Decode any HTML entities
      const decoded = u
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"');
      const clean = decodeURIComponent(decoded).split("&")[0].split("#")[0];
      if (!seen.has(clean) && clean.startsWith("http")) {
        seen.add(clean);
        candidates.push(clean);
      }
    } catch { /* skip */ }
  }

  // Strategy 1: /url?q=URL (classic Google redirect link — still present)
  const s1 = /href="\/url\?q=(https?:\/\/[^&"\\]+)/g;
  let m: RegExpExecArray | null;
  while ((m = s1.exec(html)) !== null) add(m[1]);

  // Strategy 2: data-href="URL" (used in newer card-style results)
  const s2 = /data-href="(https?:\/\/[^"]+)"/g;
  while ((m = s2.exec(html)) !== null) add(m[1]);

  // Strategy 3: ping="URL" (Google sometimes uses ping attr for tracking + actual URL in href)
  const s3 = /href="(https?:\/\/[^"]+)"[^>]*ping="/g;
  while ((m = s3.exec(html)) !== null) add(m[1]);

  // Strategy 4: JSON-embedded URLs in <script> blocks — "url":"https://..."
  const s4 = /"url"\s*:\s*"(https?:\/\/[^"\\]+)"/g;
  while ((m = s4.exec(html)) !== null) add(m[1]);

  // Strategy 5: Direct href to external https — broad fallback
  const s5 = /href="(https?:\/\/(?!(?:[a-z]+\.)?google\.[a-z]{2,})[^"?#]+)"/g;
  while ((m = s5.exec(html)) !== null) add(m[1]);

  // Strategy 6: Escaped unicode URLs in JSON (\u0068ttps or \\u0068ttps)
  const s6 = /\\u0068ttps?:\\u003a\\u002f\\u002f([^\\",]+)/g;
  while ((m = s6.exec(html)) !== null) {
    add("https://" + m[1].replace(/\\u00[0-9a-f]{2}/gi, (e) =>
      String.fromCharCode(parseInt(e.slice(2), 16))
    ));
  }

  // Filter out Google-owned and tracking domains
  const BLOCKED = [
    "google.", "gstatic.", "googleapis.", "googleadservices.",
    "googletagmanager.", "googlesyndication.", "googleusercontent.",
    "youtube.com", "accounts.", "support.google", "maps.google",
  ];

  return candidates.filter((u) => {
    const domain = u.replace(/^https?:\/\//, "").split("/")[0].toLowerCase();
    return !BLOCKED.some((b) => domain.includes(b));
  });
}

function normalizeDomain(raw: string): string {
  return raw
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .split("?")[0]
    .toLowerCase()
    .trim();
}

function findDomainPosition(
  urls: string[],
  targetDomain: string,
): { position: number | null; url: string | null } {
  const target = normalizeDomain(targetDomain);

  for (let i = 0; i < urls.length; i++) {
    const urlDomain = normalizeDomain(urls[i]);
    if (urlDomain === target || urlDomain.endsWith("." + target)) {
      return { position: i + 1, url: urls[i] };
    }
  }
  return { position: null, url: null };
}

// ── Debug action: returns raw details for a single keyword ─────────────────
export const debugCheck = action({
  args: {
    projectId: v.id("projects"),
    keywordId: v.id("keywords"),
  },
  handler: async (ctx, args): Promise<{
    keyword: string;
    targetDomain: string;
    htmlLength: number;
    urlsFound: number;
    urls: string[];
    position: number | null;
    matchedUrl: string | null;
    hasGoogleCaptcha: boolean;
    htmlSnippet: string;
  }> => {
    const project = await ctx.runQuery(api.projects.getById, { projectId: args.projectId });
    if (!project) throw new ConvexError({ code: "NOT_FOUND", message: "Project not found" });

    const kwData = await ctx.runQuery(api.keywords.queries.listKeywords, {
      projectId: args.projectId,
      paginationOpts: { numItems: 200, cursor: null },
    });
    const kw = kwData.page.find((k) => k._id === args.keywordId);
    if (!kw) throw new ConvexError({ code: "NOT_FOUND", message: "Keyword not found" });

    const gl = toGlParam(kw.country ?? project.country);
    const query = buildQuery(kw.keyword, kw.country ?? project.country, kw.state ?? project.state, kw.city ?? project.city);

    let html = "";
    let fetchError = "";
    try {
      html = await fetchGoogleHtml(query, gl);
    } catch (e) {
      fetchError = String(e);
    }

    const urls = html ? extractOrganicUrls(html) : [];
    const { position, url: matchedUrl } = html ? findDomainPosition(urls, project.websiteUrl) : { position: null, url: null };

    return {
      keyword: kw.keyword,
      targetDomain: project.websiteUrl,
      htmlLength: html.length,
      urlsFound: urls.length,
      urls: urls.slice(0, 20), // first 20 for inspection
      position,
      matchedUrl,
      hasGoogleCaptcha: html.includes("g-recaptcha") || html.includes("/sorry/"),
      htmlSnippet: fetchError || html.slice(0, 1500),
    };
  },
});

// ── Check single keyword ───────────────────────────────────────────────────
export const checkKeyword = action({
  args: {
    projectId: v.id("projects"),
    keywordId: v.id("keywords"),
  },
  handler: async (ctx, args): Promise<{ position: number | null; url: string | null; keyword: string }> => {
    const project = await ctx.runQuery(api.projects.getById, { projectId: args.projectId });
    if (!project) throw new ConvexError({ code: "NOT_FOUND", message: "Project not found" });

    const kwData = await ctx.runQuery(api.keywords.queries.listKeywords, {
      projectId: args.projectId,
      paginationOpts: { numItems: 200, cursor: null },
    });
    const kw = kwData.page.find((k) => k._id === args.keywordId);
    if (!kw) throw new ConvexError({ code: "NOT_FOUND", message: "Keyword not found" });

    const gl = toGlParam(kw.country ?? project.country);
    const query = buildQuery(kw.keyword, kw.country ?? project.country, kw.state ?? project.state, kw.city ?? project.city);

    const html = await fetchGoogleHtml(query, gl);
    const urls = extractOrganicUrls(html);
    const { position, url } = findDomainPosition(urls, project.websiteUrl);

    const today = new Date().toISOString().split("T")[0];
    await ctx.runMutation(api.keywords.mutations.addRankSnapshot, {
      keywordId: args.keywordId,
      snapshotDate: today,
      position: position ?? undefined,
      url: url ?? undefined,
      source: "serp",
    });

    console.log(`[RankTracker] "${kw.keyword}" → position=${position}, urls_extracted=${urls.length}, target=${project.websiteUrl}`);

    return { position, url, keyword: kw.keyword };
  },
});

// ── Sync all keywords ──────────────────────────────────────────────────────
export const syncAllKeywords = action({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args): Promise<{ checked: number; found: number; errors: number }> => {
    const project = await ctx.runQuery(api.projects.getById, { projectId: args.projectId });
    if (!project) throw new ConvexError({ code: "NOT_FOUND", message: "Project not found" });

    const kwData = await ctx.runQuery(api.keywords.queries.listKeywords, {
      projectId: args.projectId,
      status: "tracking",
      paginationOpts: { numItems: 200, cursor: null },
    });

    const activeKeywords = kwData.page;
    if (activeKeywords.length === 0) return { checked: 0, found: 0, errors: 0 };

    let found = 0;
    let errors = 0;
    const today = new Date().toISOString().split("T")[0];

    for (let i = 0; i < activeKeywords.length; i++) {
      const kw = activeKeywords[i];
      if (i > 0) await sleep(DELAY_MS);

      try {
        const gl = toGlParam(kw.country ?? project.country);
        const query = buildQuery(kw.keyword, kw.country ?? project.country, kw.state ?? project.state, kw.city ?? project.city);

        const html = await fetchGoogleHtml(query, gl);
        const urls = extractOrganicUrls(html);
        const { position, url } = findDomainPosition(urls, project.websiteUrl);

        console.log(`[RankTracker] "${kw.keyword}" → pos=${position}, urls=${urls.length}`);

        if (position !== null) found++;

        await ctx.runMutation(api.keywords.mutations.addRankSnapshot, {
          keywordId: kw._id as Id<"keywords">,
          snapshotDate: today,
          position: position ?? undefined,
          url: url ?? undefined,
          source: "serp",
        });
      } catch (e) {
        errors++;
        if (e instanceof ConvexError && (e.data as { code: string }).code === "BAD_REQUEST") throw e;
        console.error(`[RankTracker] Failed "${kw.keyword}":`, e);
      }
    }

    return { checked: activeKeywords.length, found, errors };
  },
});
