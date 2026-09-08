"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { api } from "../_generated/api.js";
import OpenAI from "openai";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CmsPost = {
  id: string | number;
  title: string;
  slug: string;
  url: string;
  status: string; // publish | draft | private | trash
  type: string;   // post | page
  date: string;
  modifiedDate: string;
  seoTitle?: string;
  seoDescription?: string;
  wordCount?: number;
  featuredImage?: string;
  categories?: string[];
  tags?: string[];
  commentCount?: number;
};

export type CmsSitemap = {
  name: string;
  url: string;
  type: string; // post | page | custom | product
  pagesCount?: number;
  lastModified?: string;
  isIndexable?: boolean;
};

export type SeoIssue = {
  type: string;
  severity: "critical" | "warning" | "info";
  message: string;
};

// ─── WordPress ───────────────────────────────────────────────────────────────

async function wpFetch(siteUrl: string, credentials: string, path: string, options?: RequestInit) {
  const url = `${siteUrl}/wp-json/wp/v2${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: `WordPress API error (${res.status}): ${text.slice(0, 200)}` });
  }
  return res;
}

export const testWordPressConnection = action({
  args: {
    siteUrl: v.string(),
    credentials: v.string(), // base64(user:apppassword)
  },
  handler: async (_ctx, args): Promise<{ success: boolean; siteName: string; wpVersion: string; user: string }> => {
    const base = args.siteUrl.replace(/\/$/, "");

    // Decode credentials to get username + app password for XML-RPC fallback
    let decodedUser = "";
    let decodedPass = "";
    try {
      const decoded = Buffer.from(args.credentials, "base64").toString("utf-8");
      const colonIdx = decoded.indexOf(":");
      if (colonIdx !== -1) {
        decodedUser = decoded.slice(0, colonIdx);
        decodedPass = decoded.slice(colonIdx + 1);
      }
    } catch { /* ignore */ }

    // Helper: fetch site name from public WP JSON root (no auth needed)
    async function getSiteName(siteBase?: string): Promise<string> {
      try {
        const r = await fetch(`${siteBase ?? base}/wp-json`);
        if (r.ok) {
          const d = await r.json() as { name?: string };
          return d.name ?? base;
        }
      } catch { /* ignore */ }
      return base;
    }

    // Auto-discover the real WordPress REST API root.
    // WordPress adds a <link rel="https://api.w.org/" href="..."> to every page
    // and also sends a Link header. Use these to find the actual REST root even if
    // the user entered a page URL, a subdirectory path, or the wrong root.
    async function discoverApiRoot(inputUrl: string): Promise<string> {
      const urlsToTry = [inputUrl];

      // If the URL has a path, also try stripping back to just the origin
      try {
        const parsed = new URL(inputUrl);
        if (parsed.pathname !== "/" && parsed.pathname !== "") {
          urlsToTry.push(parsed.origin);
        }
      } catch { /* invalid URL */ }

      for (const tryUrl of urlsToTry) {
        // 1. Try /wp-json directly
        const wpJsonUrl = `${tryUrl.replace(/\/$/, "")}/wp-json`;
        const direct = await fetch(wpJsonUrl, { signal: AbortSignal.timeout(8000) }).catch(() => null);
        if (direct?.ok) {
          const data = await direct.json().catch(() => null) as { namespaces?: string[] } | null;
          if (data?.namespaces?.includes("wp/v2")) return tryUrl.replace(/\/$/, "");
        }

        // 2. Fetch the homepage and look for the REST API discovery link
        const homePage = await fetch(tryUrl, { signal: AbortSignal.timeout(8000) }).catch(() => null);
        if (!homePage) continue;

        // Check Link header: Link: <https://example.com/wp-json/>; rel="https://api.w.org/"
        const linkHeader = homePage.headers.get("link") ?? "";
        const headerMatch = linkHeader.match(/<([^>]+)>;\s*rel="https:\/\/api\.w\.org\/"/);
        if (headerMatch?.[1]) {
          const discovered = headerMatch[1].replace(/\/wp\/v2.*$/, "").replace(/\/$/, "");
          return discovered.endsWith("/wp-json") ? discovered.replace(/\/wp-json$/, "") : discovered;
        }

        // Check HTML <link> tag
        const html = await homePage.text().catch(() => "");
        const htmlMatch = html.match(/<link[^>]+rel=["']https:\/\/api\.w\.org\/["'][^>]+href=["']([^"']+)["']/i)
          ?? html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']https:\/\/api\.w\.org\/["']/i);
        if (htmlMatch?.[1]) {
          const apiBase = htmlMatch[1].replace(/\/$/, "");
          // apiBase is the wp-json root URL, strip /wp-json to get site root
          const siteRoot = apiBase.endsWith("/wp-json") ? apiBase.replace(/\/wp-json$/, "") : apiBase;
          return siteRoot;
        }
      }

      // Nothing worked
      throw new ConvexError({
        code: "EXTERNAL_SERVICE_ERROR",
        message: "Could not find the WordPress REST API at this URL. Make sure: (1) the URL is your WordPress homepage (e.g. https://yourdomain.com), (2) pretty permalinks are enabled in WordPress (Settings → Permalinks → Save Changes), (3) no security plugin is blocking /wp-json.",
      });
    }

    // Discover the real WordPress root (may differ from what the user entered)
    const wpRoot = await discoverApiRoot(base);

    // If we discovered a different root, use it going forward
    const resolvedBase = wpRoot;


    const userRes = await fetch(`${resolvedBase}/wp-json/wp/v2/users/me?context=edit`, {
      headers: { Authorization: `Basic ${args.credentials}`, "Content-Type": "application/json" },
    });

    if (userRes.ok) {
      const userData = await userRes.json() as { name?: string; slug?: string };
      const siteName = await getSiteName(resolvedBase);
      return { success: true, siteName, wpVersion: "unknown", user: userData.name ?? userData.slug ?? decodedUser };
    }

    const errorBody = await userRes.text().catch(() => "");
    const isAuthHeaderStripped = userRes.status === 401 &&
      (errorBody.includes("rest_not_logged_in") || errorBody.includes("rest_forbidden"));

    if (!isAuthHeaderStripped) {
      throw new ConvexError({
        code: "EXTERNAL_SERVICE_ERROR",
        message: `WordPress API error (${userRes.status}): ${errorBody.slice(0, 300)}`,
      });
    }

    // Authorization header is being stripped — try alternatives

    // Attempt 2: Embed credentials directly in the URL
    if (decodedUser && decodedPass) {
      try {
        const urlWithCreds = new URL(`${resolvedBase}/wp-json/wp/v2/users/me?context=edit`);
        urlWithCreds.username = decodedUser;
        urlWithCreds.password = decodedPass;
        const urlRes = await fetch(urlWithCreds.toString(), {
          headers: { "Content-Type": "application/json" },
        });
        if (urlRes.ok) {
          const userData = await urlRes.json() as { name?: string; slug?: string };
          const siteName = await getSiteName(resolvedBase);
          return { success: true, siteName, wpVersion: "unknown", user: userData.name ?? userData.slug ?? decodedUser };
        }
      } catch { /* fall through */ }
    }

    // Attempt 3: XML-RPC with Application Password credentials
    if (decodedUser && decodedPass) {
      const xmlBody = `<?xml version="1.0"?>
<methodCall>
  <methodName>wp.getProfile</methodName>
  <params>
    <param><value><int>1</int></value></param>
    <param><value><string>${decodedUser}</string></value></param>
    <param><value><string>${decodedPass}</string></value></param>
  </params>
</methodCall>`;
      try {
        const rpcRes = await fetch(`${resolvedBase}/xmlrpc.php`, {
          method: "POST",
          headers: { "Content-Type": "text/xml" },
          body: xmlBody,
        });
        const rpcText = await rpcRes.text();
        if (rpcRes.ok && !rpcText.includes("<fault>")) {
          const nameMatch = rpcText.match(/<member>\s*<name>display_name<\/name>\s*<value><string>([^<]+)<\/string>/);
          const displayName = nameMatch?.[1] ?? decodedUser;
          const siteName = await getSiteName(resolvedBase);
          return { success: true, siteName, wpVersion: "unknown", user: displayName };
        }
        if (rpcText.includes("<fault>")) {
          const faultMatch = rpcText.match(/<name>faultString<\/name>\s*<value><string>([^<]+)<\/string>/);
          const faultMsg = faultMatch?.[1] ?? "Invalid credentials";
          throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: `Incorrect Application Password — ${faultMsg}` });
        }
      } catch (e) {
        if (e instanceof ConvexError) throw e;
        // XML-RPC disabled — fall through
      }
    }

    // All three methods failed — throw a structured error the UI can render nicely
    throw new ConvexError({
      code: "EXTERNAL_SERVICE_ERROR",
      message: "AUTH_HEADER_STRIPPED",
    });
  },
});

/** Lightweight probe: returns true if WooCommerce REST API is accessible. */
export const checkWooCommerce = action({
  args: {
    siteUrl: v.string(),
    credentials: v.string(),
  },
  handler: async (_ctx, args): Promise<{ available: boolean }> => {
    const base = args.siteUrl.replace(/\/$/, "");
    try {
      const res = await fetch(`${base}/wp-json/wc/v3/products?per_page=1`, {
        headers: { "Authorization": `Basic ${args.credentials}` },
      });
      // 200 or 401 both mean WooCommerce is installed; 404 means it's not
      return { available: res.status !== 404 };
    } catch {
      return { available: false };
    }
  },
});

export const listWordPressContent = action({
  args: {
    siteUrl: v.string(),
    credentials: v.string(),
    type: v.union(v.literal("posts"), v.literal("pages"), v.literal("products")),
    status: v.optional(v.string()), // "publish,draft,private" etc
    perPage: v.optional(v.number()),
    page: v.optional(v.number()),
    search: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<{ items: CmsPost[]; total: number; totalPages: number }> => {
    const base = args.siteUrl.replace(/\/$/, "");

    // WooCommerce products use a different API namespace and field names
    if (args.type === "products") {
      const params = new URLSearchParams({
        per_page: String(Math.min(args.perPage ?? 20, 100)),
        page: String(args.page ?? 1),
      });
      if (args.search) params.set("search", args.search);
      if (args.status && args.status !== "publish,draft,private") params.set("status", args.status);

      const url = `${base}/wp-json/wc/v3/products?${params.toString()}`;
      const res = await fetch(url, {
        headers: {
          "Authorization": `Basic ${args.credentials}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        // WooCommerce not installed or REST disabled
        if (res.status === 404) {
          throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: "WooCommerce is not installed or the WooCommerce REST API is disabled. Install WooCommerce to browse products." });
        }
        throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: `WooCommerce API error (${res.status}): ${text.slice(0, 200)}` });
      }

      const total = parseInt(res.headers.get("X-WP-Total") ?? "0", 10);
      const totalPages = parseInt(res.headers.get("X-WP-TotalPages") ?? "1", 10);

      const data = await res.json() as Array<{
        id: number;
        name: string;
        slug: string;
        permalink: string;
        status: string;
        date_created: string;
        date_modified: string;
        price?: string;
        regular_price?: string;
        stock_status?: string;
        images?: Array<{ src: string }>;
        yoast_head_json?: { title?: string; description?: string };
      }>;

      const items: CmsPost[] = data.map((item) => ({
        id: item.id,
        title: item.name,
        slug: item.slug,
        url: item.permalink,
        status: item.status,
        type: "product",
        date: item.date_created,
        modifiedDate: item.date_modified,
        seoTitle: item.yoast_head_json?.title,
        seoDescription: item.yoast_head_json?.description,
        featuredImage: item.images?.[0]?.src,
      }));

      return { items, total, totalPages };
    }

    // Standard posts / pages via wp/v2
    const params = new URLSearchParams({
      per_page: String(Math.min(args.perPage ?? 20, 100)),
      page: String(args.page ?? 1),
      status: args.status ?? "publish,draft,private",
      context: "edit",
      _fields: "id,title,slug,link,status,type,date,modified,excerpt,yoast_head_json,meta",
    });
    if (args.search) params.set("search", args.search);

    const res = await wpFetch(base, args.credentials, `/${args.type}?${params.toString()}`);
    const total = parseInt(res.headers.get("X-WP-Total") ?? "0", 10);
    const totalPages = parseInt(res.headers.get("X-WP-TotalPages") ?? "1", 10);

    const data = await res.json() as Array<{
      id: number;
      title: { rendered: string };
      slug: string;
      link: string;
      status: string;
      type: string;
      date: string;
      modified: string;
      yoast_head_json?: { title?: string; description?: string };
    }>;

    const items: CmsPost[] = data.map((item) => ({
      id: item.id,
      title: item.title.rendered,
      slug: item.slug,
      url: item.link,
      status: item.status,
      type: item.type,
      date: item.date,
      modifiedDate: item.modified,
      seoTitle: item.yoast_head_json?.title,
      seoDescription: item.yoast_head_json?.description,
    }));

    return { items, total, totalPages };
  },
});

export const deleteWordPressPost = action({
  args: {
    siteUrl: v.string(),
    credentials: v.string(),
    postId: v.number(),
    force: v.optional(v.boolean()), // true = permanent delete, false = trash
  },
  handler: async (_ctx, args): Promise<{ success: boolean; message: string }> => {
    const base = args.siteUrl.replace(/\/$/, "");
    const force = args.force ?? false;
    // Try posts first, then pages
    for (const type of ["posts", "pages"]) {
      try {
        const res = await wpFetch(base, args.credentials, `/${type}/${args.postId}?force=${force}`, { method: "DELETE" });
        const data = await res.json() as { deleted?: boolean; previous?: { title?: { rendered?: string } } };
        return { success: true, message: data.deleted ? "Permanently deleted" : "Moved to trash" };
      } catch {
        // try next type
      }
    }
    return { success: false, message: "Could not delete — post not found under posts or pages" };
  },
});

export const listWordPressSitemaps = action({
  args: {
    siteUrl: v.string(),
    credentials: v.string(),
  },
  handler: async (_ctx, args): Promise<CmsSitemap[]> => {
    const base = args.siteUrl.replace(/\/$/, "");

    // Try Yoast SEO sitemap index
    const sitemaps: CmsSitemap[] = [];

    // Standard Yoast sitemap index
    const yoastIndexUrl = `${base}/sitemap_index.xml`;
    try {
      const res = await fetch(yoastIndexUrl, {
        headers: { Authorization: `Basic ${args.credentials}` },
      });
      if (res.ok) {
        const xml = await res.text();
        const matches = xml.matchAll(/<loc>(.*?)<\/loc>/g);
        for (const m of matches) {
          const url = m[1];
          const name = url.replace(base, "").replace(".xml", "").replace("/", "");
          const typeGuess = url.includes("post") ? "post"
            : url.includes("page") ? "page"
            : url.includes("product") ? "product"
            : "custom";
          sitemaps.push({ name, url, type: typeGuess });
        }
      }
    } catch { /* no Yoast */ }

    // RankMath sitemap
    if (sitemaps.length === 0) {
      const rankMathUrl = `${base}/sitemap.xml`;
      try {
        const res = await fetch(rankMathUrl, {
          headers: { Authorization: `Basic ${args.credentials}` },
        });
        if (res.ok) {
          sitemaps.push({ name: "sitemap.xml", url: rankMathUrl, type: "custom" });
        }
      } catch { /* no sitemap */ }
    }

    return sitemaps;
  },
});

// ─── WordPress: admin login (cookie-based) ────────────────────────────────────

export const testWordPressAdminLogin = action({
  args: {
    siteUrl: v.string(),
    username: v.string(),
    password: v.string(),
  },
  handler: async (_ctx, args): Promise<{ success: boolean; siteName: string; user: string; token: string }> => {
    const base = args.siteUrl.replace(/\/$/, "");

    // WP REST API supports Basic auth with username:password directly (requires
    // the "Application Passwords" feature OR the Basic Auth plugin enabled).
    // We use the same REST API but with raw username:password so users don't
    // need to generate a separate application password.
    const token = btoa(`${args.username}:${args.password}`);

    const userRes = await fetch(`${base}/wp-json/wp/v2/users/me?context=edit`, {
      headers: { Authorization: `Basic ${token}` },
    });

    if (!userRes.ok) {
      const body = await userRes.text().catch(() => "");
      // Common case: REST auth is disabled, try XML-RPC ping first to confirm creds work
      if (userRes.status === 401 || userRes.status === 403) {
        // Attempt XML-RPC wp.getProfile to validate creds
        const xmlBody = `<?xml version="1.0"?>
<methodCall>
  <methodName>wp.getProfile</methodName>
  <params>
    <param><value><int>1</int></value></param>
    <param><value><string>${args.username}</string></value></param>
    <param><value><string>${args.password}</string></value></param>
  </params>
</methodCall>`;
        const rpcRes = await fetch(`${base}/xmlrpc.php`, {
          method: "POST",
          headers: { "Content-Type": "text/xml" },
          body: xmlBody,
        });
        const rpcText = await rpcRes.text();
        if (rpcText.includes("<fault>") || !rpcRes.ok) {
          throw new ConvexError({
            code: "EXTERNAL_SERVICE_ERROR",
            message: "Invalid credentials. Make sure you're using your WP admin username and password (not email), and that REST API authentication is enabled on your site.",
          });
        }
        // XML-RPC worked — extract display name
        const nameMatch = rpcText.match(/<member>\s*<name>display_name<\/name>\s*<value><string>([^<]+)<\/string>/);
        const displayName = nameMatch?.[1] ?? args.username;
        // Fetch site name via public REST
        const infoRes = await fetch(`${base}/wp-json`).catch(() => null);
        const info = infoRes?.ok ? await infoRes.json() as { name?: string } : {};
        return { success: true, siteName: info.name ?? base, user: displayName, token };
      }
      throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: `WordPress login failed (${userRes.status}): ${body.slice(0, 200)}` });
    }

    const userData = await userRes.json() as { name?: string; slug?: string };
    const infoRes = await fetch(`${base}/wp-json`, {
      headers: { Authorization: `Basic ${token}` },
    }).catch(() => null);
    const info = infoRes?.ok ? await infoRes.json() as { name?: string } : {};

    return {
      success: true,
      siteName: info.name ?? base,
      user: userData.name ?? userData.slug ?? args.username,
      token, // base64(username:password) — same format as App Password, usable via Basic auth
    };
  },
});

// ─── WordPress: generate webhook secret ──────────────────────────────────────

export const generateWebhookSecret = action({
  args: {},
  handler: async (): Promise<{ secret: string }> => {
    // Generate a 32-byte hex secret for signing webhook payloads
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const secret = Array.from(array).map((b) => b.toString(16).padStart(2, "0")).join("");
    return { secret };
  },
});

// ─── Webflow ──────────────────────────────────────────────────────────────────

export const testWebflowConnection = action({
  args: { apiToken: v.string() },
  handler: async (_ctx, args): Promise<{ success: boolean; user: string; sites: Array<{ id: string; name: string; shortName: string }> }> => {
    const headers = {
      "Authorization": `Bearer ${args.apiToken}`,
      "accept-version": "1.0.0",
    };

    const [userRes, sitesRes] = await Promise.all([
      fetch("https://api.webflow.com/user", { headers }),
      fetch("https://api.webflow.com/sites", { headers }),
    ]);

    if (!userRes.ok) {
      throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: `Webflow auth failed: ${await userRes.text()}` });
    }

    const user = await userRes.json() as { user?: { email?: string } };
    const sitesData = sitesRes.ok ? await sitesRes.json() as { sites?: Array<{ _id: string; name: string; shortName: string }> } : { sites: [] };

    return {
      success: true,
      user: user.user?.email ?? "unknown",
      sites: (sitesData.sites ?? []).map((s) => ({ id: s._id, name: s.name, shortName: s.shortName })),
    };
  },
});

export const listWebflowPages = action({
  args: { apiToken: v.string(), siteId: v.string() },
  handler: async (_ctx, args): Promise<{ items: CmsPost[]; total: number }> => {
    const res = await fetch(`https://api.webflow.com/sites/${args.siteId}/pages`, {
      headers: {
        "Authorization": `Bearer ${args.apiToken}`,
        "accept-version": "1.0.0",
      },
    });

    if (!res.ok) throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: `Webflow pages error: ${await res.text()}` });

    const data = await res.json() as { pages?: Array<{ _id: string; title: string; slug: string; archived: boolean; draft: boolean; createdOn: string; updatedOn: string; seo?: { title?: string; description?: string } }> };
    const pages = data.pages ?? [];

    const items: CmsPost[] = pages.map((p) => ({
      id: p._id,
      title: p.title,
      slug: p.slug,
      url: `/${p.slug}`,
      status: p.draft ? "draft" : p.archived ? "archived" : "publish",
      type: "page",
      date: p.createdOn,
      modifiedDate: p.updatedOn,
      seoTitle: p.seo?.title,
      seoDescription: p.seo?.description,
    }));

    return { items, total: items.length };
  },
});

// ─── Wix ─────────────────────────────────────────────────────────────────────

export const testWixConnection = action({
  args: { apiKey: v.string(), siteId: v.string() },
  handler: async (_ctx, args): Promise<{ success: boolean; siteName: string }> => {
    const res = await fetch(`https://www.wixapis.com/site-properties/v4/properties`, {
      headers: {
        "Authorization": args.apiKey,
        "wix-site-id": args.siteId,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: `Wix API error: ${await res.text()}` });

    const data = await res.json() as { properties?: { siteDisplayName?: string } };
    return { success: true, siteName: data.properties?.siteDisplayName ?? "Wix Site" };
  },
});

export const listWixPages = action({
  args: { apiKey: v.string(), siteId: v.string() },
  handler: async (_ctx, args): Promise<{ items: CmsPost[]; total: number }> => {
    const res = await fetch(`https://www.wixapis.com/site-pages/v2/pages?paging.limit=100`, {
      headers: {
        "Authorization": args.apiKey,
        "wix-site-id": args.siteId,
      },
    });

    if (!res.ok) throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: `Wix pages error: ${await res.text()}` });

    const data = await res.json() as { pages?: Array<{ id: string; title: string; url?: { path?: string }; pageInfo?: { title?: string }; createdDate?: string; updatedDate?: string }> };
    const pages = data.pages ?? [];

    const items: CmsPost[] = pages.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.url?.path ?? p.id,
      url: p.url?.path ?? `/${p.id}`,
      status: "publish",
      type: "page",
      date: p.createdDate ?? new Date().toISOString(),
      modifiedDate: p.updatedDate ?? new Date().toISOString(),
    }));

    return { items, total: items.length };
  },
});

// ─── AI Internal Link Suggestions ────────────────────────────────────────────

export type InternalLinkSuggestion = {
  targetUrl: string;
  targetTitle: string;
  anchorText: string;
  reason: string;
  priority: "high" | "medium" | "low";
  insertionHint: string; // where in the post to insert
};

export const generateInternalLinks = action({
  args: {
    projectId: v.id("projects"),
    sourceUrl: v.string(),
    sourceTitle: v.string(),
    sourceContent: v.optional(v.string()), // override — if not provided, we fetch it
    platform: v.string(),
    allPagesContext: v.array(v.object({
      url: v.string(),
      title: v.string(),
      type: v.string(),
    })),
    // WordPress credentials so we can fetch real post content
    wpSiteUrl: v.optional(v.string()),
    wpCredentials: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<{ suggestions: InternalLinkSuggestion[]; summary: string; fetchedContent: boolean }> => {
    const openai = new OpenAI({
      baseURL: "https://ai-gateway.hercules.app/v1",
      apiKey: process.env.HERCULES_API_KEY,
    });

    // ── Step 1: Get the actual page content ────────────────────────────────────
    // For WordPress, fetch raw post/page content via REST API so AI sees the real text.
    // This is crucial: anchor text suggestions must be phrases that literally exist in the content.
    let pageContent = args.sourceContent ?? "";
    let fetchedContent = false;
    let postId: number | null = null;
    let postType: "posts" | "pages" = "posts";

    if (args.platform === "wordpress" && args.wpSiteUrl && args.wpCredentials) {
      try {
        const base = args.wpSiteUrl.replace(/\/$/, "");
        const authHeader = `Basic ${args.wpCredentials}`;
        const normalise = (u: string) => u.replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();

        // Find post by matching its permalink to the source URL
        for (const type of ["posts", "pages"] as const) {
          const slug = (() => { try { return new URL(args.sourceUrl).pathname.replace(/\//g, ""); } catch { return ""; } })();
          const bySlug = slug
            ? await fetch(`${base}/wp-json/wp/v2/${type}?slug=${encodeURIComponent(slug)}&_fields=id,link&status=publish,draft,private`, { headers: { Authorization: authHeader } }).catch(() => null)
            : null;
          if (bySlug?.ok) {
            const items = await bySlug.json() as Array<{ id: number; link: string }>;
            const match = items.find((i) => normalise(i.link) === normalise(args.sourceUrl));
            if (match) { postId = match.id; postType = type; break; }
            if (items.length > 0) { postId = items[0].id; postType = type; break; }
          }
        }

        if (postId) {
          const postRes = await fetch(`${base}/wp-json/wp/v2/${postType}/${postId}?context=edit&_fields=content`, { headers: { Authorization: authHeader } });
          if (postRes.ok) {
            const postData = await postRes.json() as { content?: { raw?: string; rendered?: string } };
            // Prefer raw content (Gutenberg block markup — no header/footer contamination).
            // If only rendered HTML is available, strip global elements before converting to text.
            let raw = postData.content?.raw ?? postData.content?.rendered ?? "";
            if (!postData.content?.raw && raw) {
              // Strip header/footer/nav from rendered HTML before text extraction
              const STRIP_TAGS = ["header", "footer", "nav", ".site-header", ".site-footer", "#masthead", "#colophon", ".navbar", ".main-navigation", ".wp-block-template-part"];
              for (const tag of STRIP_TAGS) {
                raw = raw.replace(new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi"), "");
              }
            }
            // Strip remaining HTML tags to get plain text for AI
            pageContent = raw.replace(/<[^>]+>/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, 4000);
            if (pageContent.length > 100) fetchedContent = true;
          }
        }
      } catch { /* fall through to user-provided content */ }
    }

    if (!pageContent || pageContent.length < 50) {
      // Nothing to work with — AI will suggest based on title only (lower quality)
      pageContent = `Title: ${args.sourceTitle}. No content provided.`;
    }

    // ── Step 2: Build target pages context ─────────────────────────────────────
    // Exclude the source page itself and limit to 100 pages
    const normaliseUrl = (u: string) => u.replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();
    const pagesContext = args.allPagesContext
      .filter((p) => normaliseUrl(p.url) !== normaliseUrl(args.sourceUrl))
      .slice(0, 100)
      .map((p) => `- "${p.title}" → ${p.url}`)
      .join("\n");

    // ── Step 3: AI finds exact phrases in the content that map to relevant pages ─
    const prompt = `You are an expert SEO consultant specializing in internal linking.

SOURCE PAGE ACTUAL CONTENT (read this carefully — anchor texts MUST be exact phrases found verbatim in this content):
---
${pageContent}
---

SOURCE PAGE URL: ${args.sourceUrl}
SOURCE PAGE TITLE: ${args.sourceTitle}

OTHER PAGES ON THE SITE (potential link targets):
${pagesContext}

YOUR TASK:
1. Read the source page content above carefully.
2. Find 8–15 phrases that ALREADY EXIST verbatim in that content AND are topically relevant to one of the target pages listed.
3. For each suggestion, the "anchorText" field MUST be an exact substring of the source content above — copy it character-for-character. Do NOT invent or paraphrase text.
4. Match each anchor text phrase to the most semantically relevant target page URL.
5. Prefer longer, specific keyphrases (2–5 words) over single generic words.
6. Skip any phrase that already appears inside an existing <a> tag in the content.
7. Do not use the same anchor text twice.

Respond ONLY with valid JSON (no markdown, no explanation):
{
  "suggestions": [
    {
      "targetUrl": "full target page URL",
      "targetTitle": "Target Page Title",
      "anchorText": "exact phrase from source content",
      "reason": "one sentence: why this phrase links well to the target page",
      "priority": "high" | "medium" | "low",
      "insertionHint": "brief location hint: e.g. 'second paragraph, after mentioning X'"
    }
  ],
  "summary": "2-3 sentences summarising the linking opportunities found"
}`;

    const res = await openai.chat.completions.create({
      model: "openai/gpt-5.6-luna",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const raw = res.choices[0]?.message?.content ?? "{}";
    try {
      const parsed = JSON.parse(raw) as { suggestions: InternalLinkSuggestion[]; summary: string };
      return { ...parsed, fetchedContent };
    } catch {
      throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: "Failed to parse AI response" });
    }
  },
});

// ─── Inject link directly into WordPress post/page content ───────────────────
//
// Finds the post/page by URL, fetches raw content, wraps the first unlinked
// occurrence of anchorText with <a href="…">, and saves it back via the REST API.

export const injectWordPressLink = action({
  args: {
    siteUrl: v.string(),
    credentials: v.string(),
    sourcePageUrl: v.string(),        // URL of the post/page to edit
    anchorText: v.string(),           // text to wrap with a link
    targetUrl: v.string(),            // href to insert
    targetTitle: v.string(),          // title attribute
  },
  handler: async (_ctx, args): Promise<{ success: boolean; message: string }> => {
    const base = args.siteUrl.replace(/\/$/, "");
    const authHeader = `Basic ${args.credentials}`;

    // Step 1: resolve the post ID from the URL by searching posts + pages
    async function findPostId(): Promise<{ id: number; type: "posts" | "pages" } | null> {
      // Try posts first, then pages
      for (const type of ["posts", "pages"] as const) {
        const searchUrl = `${base}/wp-json/wp/v2/${type}?_fields=id,link&per_page=10&search=${encodeURIComponent(args.anchorText)}&status=publish,draft,private`;
        const res = await fetch(searchUrl, { headers: { Authorization: authHeader } });
        if (!res.ok) continue;
        const items = await res.json() as Array<{ id: number; link: string }>;
        const match = items.find((i) => {
          // Normalize both URLs for comparison (strip trailing slashes, ignore protocol)
          const normalise = (u: string) => u.replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();
          return normalise(i.link) === normalise(args.sourcePageUrl);
        });
        if (match) return { id: match.id, type };
      }

      // Fallback: fetch by slug derived from the URL
      try {
        const slug = new URL(args.sourcePageUrl).pathname.replace(/\//g, "").toLowerCase();
        for (const type of ["posts", "pages"] as const) {
          const res = await fetch(`${base}/wp-json/wp/v2/${type}?slug=${encodeURIComponent(slug)}&_fields=id,link`, {
            headers: { Authorization: authHeader },
          });
          if (!res.ok) continue;
          const items = await res.json() as Array<{ id: number; link: string }>;
          if (items.length > 0) return { id: items[0].id, type };
        }
      } catch { /* ignore */ }

      return null;
    }

    const found = await findPostId();
    if (!found) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Could not find this post/page in WordPress. Make sure the URL matches exactly and you have edit permissions.",
      });
    }

    // Step 2: fetch the post with raw content (requires edit context)
    const postRes = await fetch(`${base}/wp-json/wp/v2/${found.type}/${found.id}?context=edit`, {
      headers: { Authorization: authHeader },
    });
    if (!postRes.ok) {
      throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: `Could not fetch post content (${postRes.status})` });
    }
    const post = await postRes.json() as { content?: { raw?: string } };
    const rawContent = post.content?.raw ?? "";

    if (!rawContent) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Post has no editable content. Make sure you are using the WordPress Block Editor (Gutenberg), not the Classic Editor." });
    }

    // Step 3: check the anchor text exists in the content
    const escapedAnchor = args.anchorText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Reject if already linked — look for the anchor text inside an <a> tag
    const alreadyLinked = new RegExp(`<a[^>]*>([^<]*)?${escapedAnchor}([^<]*)?<\/a>`, "i").test(rawContent);
    if (alreadyLinked) {
      return { success: false, message: `"${args.anchorText}" is already linked in this post.` };
    }

    // Find the first plain occurrence (not already inside a tag)
    const plainMatch = rawContent.match(new RegExp(escapedAnchor, "i"));
    if (!plainMatch) {
      return { success: false, message: `Could not find the text "${args.anchorText}" in the post content. Make sure it appears as plain text on the page.` };
    }

    // Step 4: replace first occurrence with the linked version
    const linkHtml = `<a href="${args.targetUrl}" title="${args.targetTitle}">${plainMatch[0]}</a>`;
    const updatedContent = rawContent.replace(new RegExp(escapedAnchor, "i"), linkHtml);

    // Step 5: save it back
    const updateRes = await fetch(`${base}/wp-json/wp/v2/${found.type}/${found.id}`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: updatedContent }),
    });

    if (!updateRes.ok) {
      const text = await updateRes.text().catch(() => updateRes.statusText);
      throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: `Failed to update post (${updateRes.status}): ${text.slice(0, 200)}` });
    }

    return { success: true, message: `Link successfully added — "${args.anchorText}" now links to ${args.targetUrl}` };
  },
});
