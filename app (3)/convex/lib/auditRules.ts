// Pure issue-detection rules — no Convex imports, safe to import anywhere.

export type IssueSeverity = "critical" | "high" | "medium" | "low" | "info";
export type IssueCategory = "technical" | "content" | "indexation" | "links";

export type DetectedIssue = {
  issueType: string;
  severity: IssueSeverity;
  category: IssueCategory;
  title: string;
  description: string;
  why: string;
  recommendation: string;
  developerNote?: string;
  contentNote?: string;
};

export type PageData = {
  url: string;
  statusCode: number;
  redirectUrl?: string;
  contentType?: string;
  loadTimeMs?: number;
  title?: string;
  metaDescription?: string;
  canonical?: string;
  h1Count: number;
  h1Text?: string;
  wordCount: number;
  internalLinksCount: number;
  externalLinksCount: number;
  imagesCount: number;
  imagesWithoutAlt: number;
  robotsDirective?: string;
  hasSchemaMarkup: boolean;
};

/** Analyse a single crawled page and return every detected issue. */
export function detectIssues(page: PageData): DetectedIssue[] {
  const issues: DetectedIssue[] = [];
  const ok = page.statusCode >= 200 && page.statusCode < 300;

  // ── HTTP status ──────────────────────────────────────────────

  if (page.statusCode >= 500) {
    issues.push({
      issueType: "server_error",
      severity: "critical",
      category: "technical",
      title: `Server error (${page.statusCode})`,
      description: `This page returned a ${page.statusCode} server error.`,
      why: "Server errors prevent crawling and indexing. Users see an error page instead of content.",
      recommendation: "Check server logs and fix the underlying cause.",
      developerNote: `Investigate the ${page.statusCode} on this URL. Common causes: bad routes, DB errors, missing resources.`,
    });
  } else if (page.statusCode >= 400) {
    issues.push({
      issueType: "client_error",
      severity: "critical",
      category: "technical",
      title: `Page error (${page.statusCode})`,
      description: `This page returned a ${page.statusCode} status code.`,
      why: "Broken pages hurt UX and waste crawl budget. Links pointing here pass no SEO value.",
      recommendation: "Remove or fix links pointing to this URL, or set up a redirect.",
      developerNote:
        page.statusCode === 404
          ? "Create the missing page, add a 301 redirect, or remove internal links to this URL."
          : `Fix the ${page.statusCode} error.`,
    });
  }

  // ── Redirect ─────────────────────────────────────────────────

  if (page.redirectUrl) {
    issues.push({
      issueType: "redirect_detected",
      severity: "info",
      category: "technical",
      title: "Page redirects",
      description: `Redirects to ${page.redirectUrl}.`,
      why: "Internal links should point to the final URL to preserve link equity and reduce latency.",
      recommendation: "Update internal links to point directly to the destination URL.",
    });
  }

  // ── Title ────────────────────────────────────────────────────

  if (!page.title && ok) {
    issues.push({
      issueType: "missing_title",
      severity: "high",
      category: "content",
      title: "Missing page title",
      description: "No <title> tag found.",
      why: "The title tag is the most important on-page SEO element — it shows as the clickable headline in search results.",
      recommendation: "Add a unique, keyword-rich title under 60 characters.",
      developerNote: "Add a <title> inside <head>.",
      contentNote: "Write a compelling title with your primary keyword. Keep it under 60 characters.",
    });
  } else if (page.title && page.title.length > 60) {
    issues.push({
      issueType: "title_too_long",
      severity: "medium",
      category: "content",
      title: `Title too long (${page.title.length} chars)`,
      description: `Title is ${page.title.length} characters — Google shows ~50-60.`,
      why: "Long titles get truncated in search results, hiding important info.",
      recommendation: "Shorten to under 60 characters while keeping it descriptive.",
      contentNote: "Rewrite concisely. Front-load important keywords.",
    });
  } else if (page.title && page.title.length < 10) {
    issues.push({
      issueType: "title_too_short",
      severity: "medium",
      category: "content",
      title: `Title too short (${page.title.length} chars)`,
      description: `Only ${page.title.length} characters.`,
      why: "Short titles miss keyword and click-through opportunities.",
      recommendation: "Expand to 30-60 characters with target keywords.",
      contentNote: "Write a more descriptive title with your primary keyword.",
    });
  }

  // ── Meta description ─────────────────────────────────────────

  if (!page.metaDescription && ok) {
    issues.push({
      issueType: "missing_meta_description",
      severity: "high",
      category: "content",
      title: "Missing meta description",
      description: "No meta description tag found.",
      why: "Without one, Google auto-generates a snippet that may not be compelling.",
      recommendation: "Add a 120-160 character description with relevant keywords.",
      developerNote: 'Add <meta name="description" content="…"> in <head>.',
      contentNote: "Write a persuasive summary that entices clicks. 120-160 characters.",
    });
  } else if (page.metaDescription && page.metaDescription.length > 160) {
    issues.push({
      issueType: "meta_desc_too_long",
      severity: "medium",
      category: "content",
      title: `Meta description too long (${page.metaDescription.length} chars)`,
      description: `${page.metaDescription.length} characters — Google shows ~120-160.`,
      why: "Truncated descriptions lose information and look incomplete in results.",
      recommendation: "Shorten to 120-160 characters.",
      contentNote: "Put the most important info first, then trim.",
    });
  } else if (page.metaDescription && page.metaDescription.length < 50) {
    issues.push({
      issueType: "meta_desc_too_short",
      severity: "low",
      category: "content",
      title: `Meta description too short (${page.metaDescription.length} chars)`,
      description: `Only ${page.metaDescription.length} characters.`,
      why: "Short descriptions waste space that could attract clicks.",
      recommendation: "Expand to 120-160 characters with a compelling summary.",
    });
  }

  // ── Headings ─────────────────────────────────────────────────

  if (page.h1Count === 0 && ok) {
    issues.push({
      issueType: "missing_h1",
      severity: "high",
      category: "content",
      title: "Missing H1 heading",
      description: "No H1 tag found.",
      why: "The H1 is a key signal that tells search engines the main topic of the page.",
      recommendation: "Add a single H1 with your target keyword.",
      developerNote: "Add one <h1> as the main heading.",
      contentNote: "Write a clear H1 describing the page topic with your primary keyword.",
    });
  } else if (page.h1Count > 1) {
    issues.push({
      issueType: "multiple_h1",
      severity: "medium",
      category: "content",
      title: `Multiple H1 tags (${page.h1Count})`,
      description: `${page.h1Count} H1 tags found.`,
      why: "Multiple H1s dilute the heading signal and confuse crawlers about the main topic.",
      recommendation: "Keep one H1; change extras to H2/H3.",
      developerNote: "Convert extra <h1> to <h2> or lower.",
    });
  }

  // ── Content depth ────────────────────────────────────────────

  if (page.wordCount < 50 && ok) {
    issues.push({
      issueType: "very_thin_content",
      severity: "high",
      category: "content",
      title: `Very thin content (${page.wordCount} words)`,
      description: `Only ${page.wordCount} words.`,
      why: "Pages with almost no content rarely rank and may be seen as low-quality.",
      recommendation: "Add substantial, valuable content — aim for 300+ words.",
      contentNote: "Add meaningful content that provides value. 300+ words for standard pages.",
    });
  } else if (page.wordCount < 300 && page.wordCount >= 50 && ok) {
    issues.push({
      issueType: "thin_content",
      severity: "medium",
      category: "content",
      title: `Thin content (${page.wordCount} words)`,
      description: `Only ${page.wordCount} words.`,
      why: "Thin pages struggle with competitive keywords and provide limited value.",
      recommendation: "Expand to 300+ words with useful information.",
      contentNote: "Add details, examples, or FAQs to make the page more comprehensive.",
    });
  }

  // ── Canonical ────────────────────────────────────────────────

  if (!page.canonical && ok) {
    issues.push({
      issueType: "missing_canonical",
      severity: "medium",
      category: "indexation",
      title: "Missing canonical tag",
      description: "No canonical URL specified.",
      why: "Without a canonical, search engines may index duplicate versions of this page.",
      recommendation: "Add a self-referencing canonical tag.",
      developerNote: `Add <link rel="canonical" href="${page.url}"> in <head>.`,
    });
  }

  // ── Robots directive ─────────────────────────────────────────

  if (page.robotsDirective?.includes("noindex")) {
    issues.push({
      issueType: "noindex_detected",
      severity: "info",
      category: "indexation",
      title: "Page set to noindex",
      description: 'Robots meta contains "noindex".',
      why: "This page is excluded from indexing. Verify this is intentional.",
      recommendation: "Remove noindex if this page should appear in search results.",
    });
  }

  // ── Images ───────────────────────────────────────────────────

  if (page.imagesWithoutAlt > 0 && page.imagesCount > 0) {
    const pct = Math.round((page.imagesWithoutAlt / page.imagesCount) * 100);
    const sev: IssueSeverity = page.imagesWithoutAlt > 5 || pct > 50 ? "high" : "medium";
    issues.push({
      issueType: "missing_alt_text",
      severity: sev,
      category: "content",
      title: `${page.imagesWithoutAlt} image${page.imagesWithoutAlt > 1 ? "s" : ""} missing alt text`,
      description: `${page.imagesWithoutAlt} of ${page.imagesCount} images lack alt text (${pct}%).`,
      why: "Alt text helps crawlers understand images and improves accessibility.",
      recommendation: "Add descriptive alt text to every image.",
      developerNote: "Add alt attributes to all <img> elements.",
      contentNote: "Write alt text describing what each image shows. Be specific and concise.",
    });
  }

  // ── Links ────────────────────────────────────────────────────

  const totalLinks = page.internalLinksCount + page.externalLinksCount;
  if (totalLinks > 100) {
    issues.push({
      issueType: "too_many_links",
      severity: "low",
      category: "links",
      title: `Too many links (${totalLinks})`,
      description: `${page.internalLinksCount} internal + ${page.externalLinksCount} external.`,
      why: "Excessive links dilute PageRank and can look spammy.",
      recommendation: "Trim to the most valuable links.",
    });
  }

  if (page.internalLinksCount === 0 && ok) {
    issues.push({
      issueType: "no_internal_links",
      severity: "medium",
      category: "links",
      title: "No internal links",
      description: "This page links to no other pages on the site.",
      why: "Pages without internal links appear isolated and don't distribute authority.",
      recommendation: "Add contextual internal links to related pages.",
      contentNote: "Link to related pages where it makes sense.",
    });
  }

  // ── Schema markup ────────────────────────────────────────────

  if (!page.hasSchemaMarkup && ok) {
    issues.push({
      issueType: "missing_schema",
      severity: "low",
      category: "technical",
      title: "No structured data",
      description: "No JSON-LD or Microdata found.",
      why: "Schema markup helps search engines understand content and enables rich results.",
      recommendation: "Add relevant schema (Article, Product, FAQ, etc.).",
      developerNote: 'Add <script type="application/ld+json"> with appropriate schema.org markup.',
    });
  }

  // ── Performance ──────────────────────────────────────────────

  if (page.loadTimeMs !== undefined && page.loadTimeMs > 5000) {
    issues.push({
      issueType: "very_slow_response",
      severity: "critical",
      category: "technical",
      title: `Very slow (${(page.loadTimeMs / 1000).toFixed(1)}s)`,
      description: `Response took ${(page.loadTimeMs / 1000).toFixed(1)}s.`,
      why: "Extremely slow pages have high bounce rates and are penalised by page-experience signals.",
      recommendation: "Investigate server performance, caching, and optimise assets.",
      developerNote: "Profile the server. Check for slow queries, missing caching, or unoptimised images.",
    });
  } else if (page.loadTimeMs !== undefined && page.loadTimeMs > 3000) {
    issues.push({
      issueType: "slow_response",
      severity: "high",
      category: "technical",
      title: `Slow response (${(page.loadTimeMs / 1000).toFixed(1)}s)`,
      description: `Response took ${(page.loadTimeMs / 1000).toFixed(1)}s.`,
      why: "Slow pages hurt UX and ranking. Google recommends server response under 200 ms.",
      recommendation: "Optimise server, add caching headers, consider a CDN.",
    });
  }

  return issues;
}

/** Compute a 0-100 audit score from issue severity counts. */
export function calculateAuditScore(
  critical: number,
  high: number,
  medium: number,
  low: number,
): number {
  const deduction = critical * 10 + high * 5 + medium * 2 + low * 0.5;
  return Math.max(0, Math.round(100 - deduction));
}

/** Simple robots.txt parser — returns disallowed paths for user-agent "*". */
export function parseRobotsTxtDisallows(content: string): string[] {
  const lines = content.split("\n");
  const disallowed: string[] = [];
  let relevant = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith("#") || line === "") continue;
    const colon = line.indexOf(":");
    if (colon === -1) continue;

    const directive = line.substring(0, colon).trim().toLowerCase();
    const value = line.substring(colon + 1).trim();

    if (directive === "user-agent") {
      relevant = value === "*";
    } else if (relevant && directive === "disallow" && value) {
      disallowed.push(value);
    }
  }
  return disallowed;
}
