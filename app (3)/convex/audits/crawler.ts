"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import * as cheerio from "cheerio";
import type { Id } from "../_generated/dataModel.d.ts";
import { detectIssues, parseRobotsTxtDisallows, calculateAuditScore } from "../lib/auditRules.ts";
import type { PageData } from "../lib/auditRules.ts";

const BATCH_SIZE = 5;

/** Fetch a URL with a timeout. Returns HTML body and metadata. */
async function fetchPage(url: string): Promise<{
  statusCode: number;
  body: string;
  redirectUrl?: string;
  contentType?: string;
  loadTimeMs: number;
}> {
  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "SEOCommandCenter/1.0 (site-audit-bot)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    const finalUrl = res.url;
    const ct = res.headers.get("content-type") ?? "";
    const isHtml = ct.includes("text/html") || ct.includes("xhtml");
    const body = isHtml ? await res.text() : "";
    return {
      statusCode: res.status,
      body,
      redirectUrl: finalUrl !== url ? finalUrl : undefined,
      contentType: ct,
      loadTimeMs: Date.now() - start,
    };
  } catch (err) {
    return {
      statusCode: 0,
      body: "",
      loadTimeMs: Date.now() - start,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/** Parse HTML and extract SEO signals + discovered links. */
function analysePage(
  url: string,
  html: string,
  baseOrigin: string,
): {
  pageData: Omit<PageData, "statusCode" | "redirectUrl" | "contentType" | "loadTimeMs">;
  discoveredInternalUrls: string[];
} {
  const $ = cheerio.load(html);

  // Title and meta — from <head>, unaffected by header/footer
  const title = $("title").first().text().trim() || undefined;
  const metaDesc =
    $('meta[name="description"]').attr("content")?.trim() || undefined;
  const canonical = $('link[rel="canonical"]').attr("href")?.trim() || undefined;
  const robotsDirective =
    $('meta[name="robots"]').attr("content")?.trim() || undefined;
  const hasSchemaMarkup =
    $('script[type="application/ld+json"]').length > 0 ||
    $("[itemtype]").length > 0;

  // Discover ALL internal links BEFORE removing nav/header/footer
  // (nav links are still valid pages to crawl)
  const internalUrls = new Set<string>();
  let externalLinksCount = 0;
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    try {
      const resolved = new URL(href, url);
      // Strip hash
      resolved.hash = "";
      if (resolved.origin === baseOrigin) {
        // Normalise: no trailing slash except root
        let clean = resolved.pathname.replace(/\/+$/, "") || "/";
        if (resolved.search) clean += resolved.search;
        internalUrls.add(resolved.origin + clean);
      } else if (resolved.protocol.startsWith("http")) {
        externalLinksCount++;
      }
    } catch {
      // skip invalid URLs
    }
  });

  // ── Strip global repeated elements before analysing per-page content ──────
  // Header, footer, nav (site-wide navigation) appear on every page and are NOT
  // unique content. Counting them causes false positives:
  //   - Multiple H1s (site logo often wrapped in <h1>)
  //   - Thin content (word count inflated by nav copy on short pages)
  //   - Missing alt text on logos/icons in the header/footer
  //   - Too many links from navigation menus
  // Remove them from the analysis clone (link discovery above already captured them).
  const GLOBAL_SELECTORS = [
    "header",
    "footer",
    "nav",
    '[role="navigation"]',
    '[role="banner"]',
    '[role="contentinfo"]',
    // Common class-based selectors used by WordPress, Webflow, Wix, etc.
    ".site-header",
    ".site-footer",
    "#site-header",
    "#site-footer",
    "#masthead",
    "#colophon",
    ".navbar",
    ".nav-menu",
    ".main-navigation",
    ".primary-navigation",
    ".header-inner",
    ".footer-inner",
    ".wp-block-template-part",   // WordPress FSE template parts (header/footer blocks)
  ];
  $(GLOBAL_SELECTORS.join(",")).remove();

  // Headings — from page content only
  const h1s = $("h1");
  const h1Count = h1s.length;
  const h1Text = h1s.first().text().trim() || undefined;

  // Word count — body text only, after stripping global elements
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const wordCount = bodyText ? bodyText.split(/\s+/).length : 0;

  // Images — content images only (header logos, footer icons already removed)
  const imgs = $("img");
  const imagesCount = imgs.length;
  let imagesWithoutAlt = 0;
  imgs.each((_, el) => {
    const alt = $(el).attr("alt");
    if (alt === undefined || alt.trim() === "") imagesWithoutAlt++;
  });

  // Internal links — content links only, after stripping nav/header/footer.
  // This prevents nav menus from inflating the "too many links" count.
  const contentInternalLinks = new Set<string>();
  let contentExternalLinks = 0;
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    try {
      const resolved = new URL(href, url);
      resolved.hash = "";
      if (resolved.origin === baseOrigin) {
        let clean = resolved.pathname.replace(/\/+$/, "") || "/";
        if (resolved.search) clean += resolved.search;
        contentInternalLinks.add(resolved.origin + clean);
      } else if (resolved.protocol.startsWith("http")) {
        contentExternalLinks++;
      }
    } catch { /* skip */ }
  });

  return {
    pageData: {
      url,
      title,
      metaDescription: metaDesc,
      canonical,
      h1Count,
      h1Text,
      wordCount,
      internalLinksCount: contentInternalLinks.size,
      externalLinksCount: contentExternalLinks,
      imagesCount,
      imagesWithoutAlt,
      robotsDirective,
      hasSchemaMarkup,
    },
    // Use the full set (including nav links) for crawl discovery
    discoveredInternalUrls: [...internalUrls],
  };
}

/**
 * Process a batch of queued pages for an audit.
 * Schedules itself to continue if more pages remain.
 */
export const processBatch = internalAction({
  args: { auditId: v.id("audits") },
  handler: async (ctx, args): Promise<void> => {
    // Read audit state
    const audit = await ctx.runQuery(internal.audits.internals.getAuditRaw, {
      auditId: args.auditId,
    });
    if (!audit) return;
    if (audit.status === "cancelled" || audit.status === "paused") return;

    const project = await ctx.runQuery(internal.audits.internals.getProjectRaw, {
      projectId: audit.projectId as Id<"projects">,
    });
    if (!project) return;

    const baseOrigin = new URL(project.websiteUrl).origin;

    // Get queued pages to process
    const queuedPages = await ctx.runQuery(
      internal.audits.internals.getQueuedPages,
      { auditId: args.auditId, limit: BATCH_SIZE },
    );

    if (queuedPages.length === 0) {
      // Crawl complete
      await ctx.runMutation(internal.audits.internals.completeAudit, {
        auditId: args.auditId,
      });
      return;
    }

    // Mark audit as crawling if still queued
    if (audit.status === "queued") {
      await ctx.runMutation(internal.audits.internals.patchAudit, {
        auditId: args.auditId,
        patch: { status: "crawling", startedAt: new Date().toISOString() },
      });
    }

    // Parse robots.txt disallows
    let disallowed: string[] = [];
    if (audit.respectRobotsTxt && audit.robotsTxtContent) {
      disallowed = parseRobotsTxtDisallows(audit.robotsTxtContent);
    }

    // Process each page
    for (const page of queuedPages) {
      // Re-check audit status in case user paused/cancelled mid-batch
      const freshAudit = await ctx.runQuery(internal.audits.internals.getAuditRaw, {
        auditId: args.auditId,
      });
      if (!freshAudit || freshAudit.status === "cancelled" || freshAudit.status === "paused") {
        return;
      }

      // Respect max pages
      if (freshAudit.pagesCrawled >= audit.maxPages) {
        await ctx.runMutation(internal.audits.internals.completeAudit, {
          auditId: args.auditId,
        });
        return;
      }

      try {
        const result = await fetchPage(page.url);

        if (result.statusCode === 0) {
          // Failed to fetch
          await ctx.runMutation(internal.audits.internals.updatePageResult, {
            pageId: page._id as Id<"auditPages">,
            auditId: args.auditId,
            crawlStatus: "failed",
            errorMessage: "Connection failed or timed out",
          });
          continue;
        }

        const { pageData, discoveredInternalUrls } = analysePage(
          page.url,
          result.body,
          baseOrigin,
        );

        // Detect issues
        const fullPageData: PageData = {
          ...pageData,
          statusCode: result.statusCode,
          redirectUrl: result.redirectUrl,
          contentType: result.contentType,
          loadTimeMs: result.loadTimeMs,
        };
        const issues = detectIssues(fullPageData);

        // Save page result
        await ctx.runMutation(internal.audits.internals.updatePageResult, {
          pageId: page._id as Id<"auditPages">,
          auditId: args.auditId,
          crawlStatus: "crawled",
          statusCode: result.statusCode,
          redirectUrl: result.redirectUrl,
          contentType: result.contentType,
          loadTimeMs: result.loadTimeMs,
          title: pageData.title,
          metaDescription: pageData.metaDescription,
          canonical: pageData.canonical,
          h1Count: pageData.h1Count,
          h1Text: pageData.h1Text,
          wordCount: pageData.wordCount,
          internalLinksCount: pageData.internalLinksCount,
          externalLinksCount: pageData.externalLinksCount,
          imagesCount: pageData.imagesCount,
          imagesWithoutAlt: pageData.imagesWithoutAlt,
          robotsDirective: pageData.robotsDirective,
          hasSchemaMarkup: pageData.hasSchemaMarkup,
          issueCount: issues.length,
        });

        // Save issues
        if (issues.length > 0) {
          await ctx.runMutation(internal.audits.internals.insertIssues, {
            auditId: args.auditId,
            pageId: page._id as Id<"auditPages">,
            pageUrl: page.url,
            issues: issues.map((i) => ({
              issueType: i.issueType,
              severity: i.severity,
              category: i.category,
              title: i.title,
              description: i.description,
              why: i.why,
              recommendation: i.recommendation,
              developerNote: i.developerNote,
              contentNote: i.contentNote,
            })),
          });
        }

        // Discover new pages (only if within depth limit)
        if (page.depth < audit.maxDepth) {
          // Filter discovered URLs
          const toEnqueue = discoveredInternalUrls.filter((u) => {
            try {
              const path = new URL(u).pathname;
              // Respect robots.txt
              if (audit.respectRobotsTxt) {
                for (const d of disallowed) {
                  if (path.startsWith(d)) return false;
                }
              }
              // Include/exclude path filters
              if (audit.includePaths.length > 0) {
                const match = audit.includePaths.some((p) => path.startsWith(p));
                if (!match) return false;
              }
              if (audit.excludePaths.length > 0) {
                const excluded = audit.excludePaths.some((p) => path.startsWith(p));
                if (excluded) return false;
              }
              return true;
            } catch {
              return false;
            }
          });

          if (toEnqueue.length > 0) {
            await ctx.runMutation(internal.audits.internals.enqueuePages, {
              auditId: args.auditId,
              urls: toEnqueue,
              depth: page.depth + 1,
              maxPages: audit.maxPages,
            });
          }
        }
      } catch (err) {
        await ctx.runMutation(internal.audits.internals.updatePageResult, {
          pageId: page._id as Id<"auditPages">,
          auditId: args.auditId,
          crawlStatus: "failed",
          errorMessage: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    // Schedule the next batch
    await ctx.scheduler.runAfter(0, internal.audits.crawler.processBatch, {
      auditId: args.auditId,
    });
  },
});

/** Kick off a crawl: fetch robots.txt, then start processing batches. */
export const startCrawl = internalAction({
  args: { auditId: v.id("audits") },
  handler: async (ctx, args): Promise<void> => {
    const audit = await ctx.runQuery(internal.audits.internals.getAuditRaw, {
      auditId: args.auditId,
    });
    if (!audit || audit.status !== "queued") return;

    const project = await ctx.runQuery(internal.audits.internals.getProjectRaw, {
      projectId: audit.projectId as Id<"projects">,
    });
    if (!project) return;

    // Fetch robots.txt if configured
    if (audit.respectRobotsTxt) {
      try {
        const robotsUrl = new URL("/robots.txt", project.websiteUrl).href;
        const res = await fetch(robotsUrl, {
          headers: { "User-Agent": "SEOCommandCenter/1.0" },
          signal: AbortSignal.timeout(10_000),
        });
        if (res.ok) {
          const text = await res.text();
          await ctx.runMutation(internal.audits.internals.patchAudit, {
            auditId: args.auditId,
            patch: { robotsTxtContent: text },
          });
        }
      } catch {
        // robots.txt not available — proceed without it
      }
    }

    // Start batch processing
    await ctx.scheduler.runAfter(0, internal.audits.crawler.processBatch, {
      auditId: args.auditId,
    });
  },
});
