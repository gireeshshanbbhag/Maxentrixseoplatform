"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import OpenAI from "openai";
import { api } from "../_generated/api.js";

function openaiClient() {
  return new OpenAI({
    baseURL: "https://ai-gateway.hercules.app/v1",
    apiKey: process.env.HERCULES_API_KEY,
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────

type CmsPage = {
  url: string;
  title: string;
  type: string; // post | page | product
  lastmod: string;
  status: string;
};

type ExistingSitemap = {
  name: string;
  url: string;
  type: string;
};

// ── Load CMS data for the project ─────────────────────────────────────────────

/**
 * Discovers CMS connection for a project, fetches pages, live robots.txt, and
 * existing sitemaps. Returns all data needed to auto-populate Site Files tabs.
 */
export const loadCmsData = action({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args): Promise<{
    hasCms: boolean;
    platform: string | null;
    siteUrl: string | null;
    pages: CmsPage[];
    liveRobotsTxt: string | null;
    existingSitemaps: ExistingSitemap[];
    totalPages: number;
  }> => {
    // Lookup CMS connection
    const connections = await ctx.runQuery(api.cms.queries.listConnections, { projectId: args.projectId });
    const conn = connections.find((c) => c.status === "active" && (c.platform === "wordpress" || c.platform === "webflow" || c.platform === "wix"));
    if (!conn) return { hasCms: false, platform: null, siteUrl: null, pages: [], liveRobotsTxt: null, existingSitemaps: [], totalPages: 0 };

    const base = conn.siteUrl.replace(/\/$/, "");
    const pages: CmsPage[] = [];
    let liveRobotsTxt: string | null = null;
    let existingSitemaps: ExistingSitemap[] = [];
    let totalCount = 0;

    // ── WordPress ──────────────────────────────────────────────────────────────
    if (conn.platform === "wordpress") {
      // 1. Fetch published pages + posts (up to 100 of each)
      for (const type of ["pages", "posts"] as const) {
        try {
          const result = await ctx.runAction(api.cms.actions.listWordPressContent, {
            siteUrl: conn.siteUrl,
            credentials: conn.credentials,
            type,
            status: "publish",
            perPage: 100,
            page: 1,
          });
          for (const item of result.items) {
            if (item.status === "publish") {
              pages.push({
                url: item.url,
                title: item.title,
                type: item.type,
                lastmod: item.modifiedDate ? item.modifiedDate.split("T")[0] : new Date().toISOString().split("T")[0],
                status: item.status,
              });
            }
          }
          totalCount += result.total;
        } catch { /* ignore per-type errors */ }
      }

      // 2. Fetch live robots.txt
      try {
        const robotsRes = await fetch(`${base}/robots.txt`);
        if (robotsRes.ok) liveRobotsTxt = await robotsRes.text();
      } catch { /* ignore */ }

      // 3. Fetch existing sitemaps
      try {
        const sitemaps = await ctx.runAction(api.cms.actions.listWordPressSitemaps, {
          siteUrl: conn.siteUrl,
          credentials: conn.credentials,
        });
        existingSitemaps = sitemaps;
      } catch { /* ignore */ }
    }

    // ── Webflow ────────────────────────────────────────────────────────────────
    if (conn.platform === "webflow") {
      try {
        // Extract siteId from the credentials field (stored as "apiToken:::siteId")
        const parts = conn.credentials.split(":::");
        const apiToken = parts[0];
        const siteId = parts[1] ?? "";
        if (apiToken && siteId) {
          const result = await ctx.runAction(api.cms.actions.listWebflowPages, { apiToken, siteId });
          for (const item of result.items) {
            if (item.status === "publish") {
              pages.push({ url: item.url, title: item.title, type: "page", lastmod: item.modifiedDate.split("T")[0], status: item.status });
            }
          }
          totalCount = result.total;
        }
      } catch { /* ignore */ }

      // Fetch live robots.txt
      try {
        const robotsRes = await fetch(`${base}/robots.txt`);
        if (robotsRes.ok) liveRobotsTxt = await robotsRes.text();
      } catch { /* ignore */ }
    }

    // ── Wix ────────────────────────────────────────────────────────────────────
    if (conn.platform === "wix") {
      try {
        const parts = conn.credentials.split(":::");
        const apiKey = parts[0];
        const siteId = parts[1] ?? "";
        if (apiKey && siteId) {
          const result = await ctx.runAction(api.cms.actions.listWixPages, { apiKey, siteId });
          for (const item of result.items) {
            pages.push({ url: item.url, title: item.title, type: "page", lastmod: item.modifiedDate.split("T")[0], status: item.status });
          }
          totalCount = result.total;
        }
      } catch { /* ignore */ }
    }

    return {
      hasCms: true,
      platform: conn.platform,
      siteUrl: conn.siteUrl,
      pages,
      liveRobotsTxt,
      existingSitemaps,
      totalPages: totalCount || pages.length,
    };
  },
});

// ── robots.txt ────────────────────────────────────────────────────────────────

/**
 * Generate a smart robots.txt using AI + optional CMS page context.
 */
export const generateRobotsTxt = action({
  args: {
    websiteUrl: v.string(),
    sitemapUrl: v.optional(v.string()),
    blockAiBots: v.boolean(),
    blockPaths: v.array(v.string()),
    businessDescription: v.optional(v.string()),
    // CMS-discovered pages to help AI understand the site structure
    cmsPages: v.optional(v.array(v.object({ url: v.string(), type: v.string() }))),
    platform: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<{ content: string }> => {
    const openai = openaiClient();

    // Build CMS page context for AI to understand site structure
    let cmsContext = "";
    if (args.cmsPages && args.cmsPages.length > 0) {
      const types = [...new Set(args.cmsPages.map((p) => p.type))];
      const samplePaths = args.cmsPages.slice(0, 20).map((p) => {
        try { return new URL(p.url).pathname; } catch { return p.url; }
      });
      cmsContext = `\nSite structure from CMS (${args.platform ?? "CMS"}):
- Content types: ${types.join(", ")}
- Sample paths: ${samplePaths.join(", ")}
- Total pages: ${args.cmsPages.length}`;
    }

    const prompt = `Generate a professional robots.txt file for:
Website: ${args.websiteUrl}
Business: ${args.businessDescription ?? "not specified"}
Platform: ${args.platform ?? "unknown"}
Sitemap URL: ${args.sitemapUrl ?? "not specified — omit Sitemap line if unknown"}
Block AI bots: ${args.blockAiBots}
Extra disallowed paths: ${args.blockPaths.length > 0 ? args.blockPaths.join(", ") : "none beyond defaults"}
${cmsContext}

Rules:
- Always include a User-agent: * block
- Disallow common admin/private paths relevant to the platform (e.g. /wp-admin/, /wp-login.php, /wp-includes/ for WordPress; /admin for others)
- If blockAiBots is true, add explicit blocks for: GPTBot, ClaudeBot, anthropic-ai, Google-Extended, CCBot, FacebookBot (for AI training), Applebot-Extended
- Include the Sitemap line only if a sitemap URL is provided
- Keep comments minimal — only a short header comment
- Use CMS site structure to make smart decisions about what to allow/disallow
- Output ONLY the raw robots.txt content, no markdown fences

Respond with the raw robots.txt text only.`;

    const res = await openai.chat.completions.create({
      model: "openai/gpt-5.6-luna",
      messages: [{ role: "user", content: prompt }],
    });

    const content = res.choices[0]?.message?.content?.trim() ?? "";
    if (!content) throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: "No content generated" });
    return { content };
  },
});

/**
 * Try to deploy robots.txt to WordPress via RankMath or Yoast plugin APIs.
 * Fetches credentials securely from the CMS connection record.
 */
export const deployRobotsTxtToWordPress = action({
  args: {
    projectId: v.id("projects"),
    content: v.string(),
  },
  handler: async (ctx, args): Promise<{ deployed: boolean; method: string; reason?: string }> => {
    const connections = await ctx.runQuery(api.cms.queries.listConnections, { projectId: args.projectId });
    const conn = connections.find((c) => c.status === "active" && c.platform === "wordpress");
    if (!conn) return { deployed: false, method: "none", reason: "No active WordPress CMS connection found for this project." };
    const base = conn.siteUrl.replace(/\/$/, "");
    const authHeader = `Basic ${conn.credentials}`;

    // Method 1: RankMath REST API
    try {
      const checkRes = await fetch(`${base}/wp-json/rankmath/v1/version`, {
        headers: { Authorization: authHeader },
        signal: AbortSignal.timeout(5000),
      });
      if (checkRes.ok) {
        // RankMath is installed — use its robots.txt API
        const updateRes = await fetch(`${base}/wp-json/rankmath/v1/updateRobotsTxt`, {
          method: "POST",
          headers: { Authorization: authHeader, "Content-Type": "application/json" },
          body: JSON.stringify({ robots_txt: args.content }),
          signal: AbortSignal.timeout(10000),
        });
        if (updateRes.ok) return { deployed: true, method: "RankMath" };
      }
    } catch { /* try next */ }

    // Method 2: Try WordPress Options API to write Yoast robots.txt option
    try {
      // Check if we can write options (manage_options)
      const settingsRes = await fetch(`${base}/wp-json/wp/v2/settings`, {
        headers: { Authorization: authHeader },
        signal: AbortSignal.timeout(5000),
      });
      if (settingsRes.ok) {
        // Try writing via Yoast option path
        const writeRes = await fetch(`${base}/wp-json/wp/v2/settings`, {
          method: "POST",
          headers: { Authorization: authHeader, "Content-Type": "application/json" },
          body: JSON.stringify({ wpseo_titles: { "robots-extra": args.content } }),
          signal: AbortSignal.timeout(10000),
        });
        if (writeRes.ok) return { deployed: true, method: "WordPress Settings" };
      }
    } catch { /* try next */ }

    // Method 3: Attempt direct file write via REST API endpoint (some hosts allow this)
    try {
      const uploadRes = await fetch(`${base}/wp-json/wp/v2/media`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Disposition": 'attachment; filename="robots.txt"',
          "Content-Type": "text/plain",
        },
        body: args.content,
        signal: AbortSignal.timeout(10000),
      });
      if (uploadRes.ok) {
        const media = await uploadRes.json() as { source_url?: string };
        // Note: this uploads to /wp-content/uploads/ not root — inform user
        return { deployed: false, method: "media-upload", reason: `File uploaded to media library but not root. URL: ${media.source_url ?? "unknown"}. Please move it to your site root manually.` };
      }
    } catch { /* ignore */ }

    return {
      deployed: false,
      method: "none",
      reason: "Could not auto-deploy. No supported plugin API found (RankMath, Yoast). Please download and upload robots.txt to your site root via FTP, cPanel, or your hosting file manager.",
    };
  },
});

// ── sitemap.xml ───────────────────────────────────────────────────────────────

/**
 * Generate an XML sitemap from pages (CMS-sourced or manual).
 */
export const generateSitemapXml = action({
  args: {
    websiteUrl: v.string(),
    pages: v.array(v.object({
      url: v.string(),
      priority: v.optional(v.string()),
      changefreq: v.optional(v.string()),
      lastmod: v.optional(v.string()),
    })),
    includeImages: v.boolean(),
  },
  handler: async (_ctx, args): Promise<{ content: string }> => {
    const base = args.websiteUrl.replace(/\/$/, "");
    const today = new Date().toISOString().split("T")[0];

    const urlEntries = args.pages.map((p) => {
      const url = p.url.startsWith("http") ? p.url : `${base}${p.url.startsWith("/") ? "" : "/"}${p.url}`;
      return `  <url>
    <loc>${url}</loc>
    <lastmod>${p.lastmod ?? today}</lastmod>
    <changefreq>${p.changefreq ?? "monthly"}</changefreq>
    <priority>${p.priority ?? "0.8"}</priority>
  </url>`;
    }).join("\n");

    const content = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${args.includeImages ? '\n  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"' : ""}>
${urlEntries}
</urlset>`;

    return { content };
  },
});

// ── llms.txt ──────────────────────────────────────────────────────────────────

/**
 * Generate an llms.txt file using AI intelligence.
 * When CMS pages are provided, uses real site structure — no manual page entry needed.
 * Spec: https://llmstxt.org/
 */
export const generateLlmsTxt = action({
  args: {
    websiteUrl: v.string(),
    businessName: v.string(),
    businessDescription: v.optional(v.string()),
    businessCategory: v.optional(v.string()),
    country: v.optional(v.string()),
    blockAiTraining: v.boolean(),
    allowAiAnswering: v.boolean(),
    // CMS pages - when provided, AI uses these instead of manual keyPages
    cmsPages: v.optional(v.array(v.object({
      url: v.string(),
      title: v.string(),
      type: v.string(),
    }))),
    // Manual fallback pages (used only when no CMS pages)
    keyPages: v.optional(v.array(v.object({
      url: v.string(),
      title: v.string(),
      description: v.optional(v.string()),
    }))),
    platform: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<{ content: string }> => {
    const openai = openaiClient();

    // Build pages section from CMS or manual pages
    let pagesSection = "";
    if (args.cmsPages && args.cmsPages.length > 0) {
      // Group by type and pick most important ones
      const byType: Record<string, typeof args.cmsPages> = {};
      for (const p of args.cmsPages) {
        (byType[p.type] ??= []).push(p);
      }
      const selected: string[] = [];
      for (const [type, items] of Object.entries(byType)) {
        const label = type === "page" ? "Pages" : type === "post" ? "Blog Posts" : type === "product" ? "Products" : type.charAt(0).toUpperCase() + type.slice(1);
        selected.push(`${label} (${items.length} total, sample: ${items.slice(0, 10).map((p) => `"${p.title}" [${p.url}]`).join(", ")})`);
      }
      pagesSection = `CMS pages on the site (${args.platform ?? "CMS"}):\n${selected.join("\n")}`;
    } else if (args.keyPages && args.keyPages.length > 0) {
      pagesSection = `Key pages:\n${args.keyPages.map((p) => `- "${p.title}": ${p.url}${p.description ? ` — ${p.description}` : ""}`).join("\n")}`;
    }

    const prompt = `Generate a professional llms.txt file for an AI language model to understand this website.

The llms.txt format (llmstxt.org spec):
- Line 1: # [Site Name]  (H1 heading)
- Line 2: blank
- Line 3: > [One sentence description of the site]  (blockquote)  
- Line 4: blank
- Then sections with ## headings containing markdown links to important pages
- Include sections: ## About, ## Key Pages, and relevant content sections (## Blog, ## Products, ## Docs, ## Contact, etc.)
- If blockAiTraining is true, add a ## Restrictions section

Website: ${args.websiteUrl}
Business name: ${args.businessName}
Description: ${args.businessDescription ?? "a website"}
Category: ${args.businessCategory ?? "not specified"}
Country: ${args.country ?? "not specified"}
Block AI training: ${args.blockAiTraining}
Allow AI assistants to answer queries using this content: ${args.allowAiAnswering}

${pagesSection}

Instructions:
- Use real URLs from the site pages provided above for links — these will be read by ChatGPT, Claude, Perplexity etc.
- Write clear, factual one-line descriptions for each linked page (what AI should know about it)
- Group pages logically by section (About, Blog, Products, Contact, etc.)
- If blockAiTraining is true, state clearly: "Content on this site may not be used to train AI models"
- If allowAiAnswering is true, state: "AI assistants may use this content to answer user queries"
- Focus on information density — avoid vague marketing language
- Output ONLY the raw llms.txt content, no markdown fences

Respond with the raw llms.txt text only.`;

    const res = await openai.chat.completions.create({
      model: "openai/gpt-5.6-luna",
      messages: [{ role: "user", content: prompt }],
    });

    const content = res.choices[0]?.message?.content?.trim() ?? "";
    if (!content) throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: "No content generated" });
    return { content };
  },
});

/**
 * Try to deploy llms.txt to a WordPress site.
 * Fetches credentials securely from the CMS connection record.
 */
export const deployLlmsTxtToWordPress = action({
  args: {
    projectId: v.id("projects"),
    content: v.string(),
  },
  handler: async (ctx, args): Promise<{ deployed: boolean; method: string; uploadUrl?: string; reason?: string }> => {
    const connections = await ctx.runQuery(api.cms.queries.listConnections, { projectId: args.projectId });
    const conn = connections.find((c) => c.status === "active" && c.platform === "wordpress");
    if (!conn) return { deployed: false, method: "none", reason: "No active WordPress CMS connection found for this project." };
    const base = conn.siteUrl.replace(/\/$/, "");
    const authHeader = `Basic ${conn.credentials}`;

    // Try uploading as a media file (this lands in /wp-content/uploads/ — not root, but accessible)
    try {
      const uploadRes = await fetch(`${base}/wp-json/wp/v2/media`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Disposition": 'attachment; filename="llms.txt"',
          "Content-Type": "text/plain",
        },
        body: args.content,
        signal: AbortSignal.timeout(15000),
      });
      if (uploadRes.ok) {
        const media = await uploadRes.json() as { source_url?: string; id?: number };
        return {
          deployed: false,
          method: "media-upload",
          uploadUrl: media.source_url,
          reason: `Uploaded to media library at ${media.source_url ?? "unknown"}. WordPress does not support placing files in the site root via API — you need to also create a redirect rule in your .htaccess or Nginx config, OR use your hosting file manager to place llms.txt in the site root.`,
        };
      }
    } catch { /* ignore */ }

    return {
      deployed: false,
      method: "none",
      reason: "Auto-deploy not available. Download the file and upload to your site root via FTP, cPanel File Manager, or your hosting control panel.",
    };
  },
});
