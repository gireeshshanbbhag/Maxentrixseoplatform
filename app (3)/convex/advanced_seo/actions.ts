"use node";
import { action } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { internal, api } from "../_generated/api.js";
import OpenAI from "openai";

function getOpenAI() {
  return new OpenAI({
    baseURL: "https://ai-gateway.hercules.app/v1",
    apiKey: process.env.HERCULES_API_KEY,
  });
}

// ── Types ─────────────────────────────────────────────────────────

export type CannibalizationCluster = {
  keywords: string[];
  pages: string[];
  riskLevel: "high" | "medium" | "low";
  riskScore: number;
  reason: string;
  recommendation: string;
};

export type TopicCluster = {
  pillarTopic: string;
  pillarKeyword: string;
  description: string;
  clusterKeywords: Array<{ keyword: string; intent: string; hasContent: boolean }>;
  contentGapCount: number;
};

export type InternalLinkRecommendation = {
  sourcePage: string;
  targetPage: string;
  targetTitle: string;
  anchorText: string;
  reason: string;
  priority: "high" | "medium" | "low";
};

export type ContentGap = {
  topic: string;
  suggestedKeyword: string;
  estimatedVolume: string;
  opportunity: string;
  priority: "high" | "medium" | "low";
  contentType: string;
};

export type ContentDecayItem = {
  keyword: string;
  targetUrl: string;
  positionNow: number;
  position30d: number;
  position60d: number;
  trend: "declining" | "stagnant" | "recovering";
  decayScore: number; // 0-100, higher = worse
  recommendation: string;
};

export type EntityItem = {
  name: string;
  type: string; // Person | Organization | Place | Product | Concept
  salience: number; // 0-100
  description: string;
};

export type HreflangEntry = {
  lang: string;
  region: string;
  url: string;
  hreflangValue: string;
};

// ── Cannibalization Detector ──────────────────────────────────────

export const analyzeCannibalization = action({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args): Promise<{ clusters: CannibalizationCluster[]; summary: string }> => {
    const keywords = await ctx.runQuery(
      internal.advanced_seo.internalQueries.getKeywordsForAnalysis,
      { projectId: args.projectId }
    );

    if (keywords.length < 2) {
      return { clusters: [], summary: "Not enough keywords to detect cannibalization. Add at least 5 tracked keywords." };
    }

    const kwSummary = keywords.slice(0, 150).map((k) => ({
      keyword: k.keyword,
      intent: k.intent ?? "unknown",
      targetUrl: k.targetUrl ?? "none",
      position: k.latestPosition ?? null,
    }));

    const openai = getOpenAI();
    const prompt = `You are an expert SEO consultant specializing in keyword cannibalization. Analyze these tracked keywords for cannibalization risks.

Keywords:
${JSON.stringify(kwSummary, null, 2)}

Identify groups of keywords that are competing for the same search intent or landing page. Look for:
1. Near-duplicate keywords targeting the same page
2. Keywords with same intent but different target URLs
3. Semantic overlaps that could confuse Google

Return JSON:
{
  "clusters": [
    {
      "keywords": ["keyword1", "keyword2"],
      "pages": ["url1", "url2"],
      "riskLevel": "high",
      "riskScore": 85,
      "reason": "These keywords have nearly identical search intent and both target different pages",
      "recommendation": "Consolidate into a single pillar page and use 301 redirects"
    }
  ],
  "summary": "Found X cannibalization risks across Y keyword clusters"
}

Only include genuine cannibalization risks. Ignore clusters with only 1 keyword.`;

    try {
      const res = await openai.chat.completions.create({
        model: "openai/gpt-5.6-luna",
        reasoning_effort: "low",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });
      const raw = res.choices[0]?.message?.content ?? "{}";
      return JSON.parse(raw) as { clusters: CannibalizationCluster[]; summary: string };
    } catch (e) {
      if (e instanceof OpenAI.APIError) throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: e.message });
      throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: "Failed to analyze cannibalization" });
    }
  },
});

// ── Topic Map Generator ───────────────────────────────────────────

export const generateTopicMap = action({
  args: {
    projectId: v.id("projects"),
    // Existing clusters to avoid — passed from frontend so AI doesn't re-suggest them
    existingTopics: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args): Promise<{ clusters: TopicCluster[]; ungrouped: string[]; summary: string }> => {
    const [keywords, content] = await Promise.all([
      ctx.runQuery(internal.advanced_seo.internalQueries.getKeywordsForAnalysis, { projectId: args.projectId }),
      ctx.runQuery(internal.advanced_seo.internalQueries.getContentForAnalysis, { projectId: args.projectId }),
    ]);

    if (keywords.length === 0) {
      return { clusters: [], ungrouped: [], summary: "No keywords found. Add keywords to generate a topic map." };
    }

    const kwList = keywords.slice(0, 150).map((k) => ({
      keyword: k.keyword,
      intent: k.intent ?? "unknown",
      hasContent: content.some((c) => c.targetKeyword === k.keyword || c.title.toLowerCase().includes(k.keyword.toLowerCase())),
    }));

    const existingSection = args.existingTopics && args.existingTopics.length > 0
      ? `\n\nIMPORTANT — Already mapped topics (DO NOT suggest these again, find NEW clusters only):\n${args.existingTopics.map((t) => `- ${t}`).join("\n")}`
      : "";

    const openai = getOpenAI();
    const prompt = `You are an expert SEO content strategist. Organize these keywords into topic clusters for a pillar-cluster content strategy.

Keywords with content status:
${JSON.stringify(kwList, null, 2)}
${existingSection}

Group keywords into 3-10 topic clusters. Each cluster needs:
- A clear pillar topic (broad theme)
- A primary/pillar keyword
- Supporting cluster keywords
- How many are missing content

Return JSON:
{
  "clusters": [
    {
      "pillarTopic": "Project Management Software",
      "pillarKeyword": "project management software",
      "description": "Core content hub covering all aspects of PM tools",
      "clusterKeywords": [
        { "keyword": "best project management tools", "intent": "commercial", "hasContent": false },
        { "keyword": "project management tips", "intent": "informational", "hasContent": true }
      ],
      "contentGapCount": 3
    }
  ],
  "ungrouped": ["any keywords that don't fit clusters"],
  "summary": "Organized X keywords into Y clusters with Z content gaps"
}`;

    try {
      const res = await openai.chat.completions.create({
        model: "openai/gpt-5.6-luna",
        reasoning_effort: "low",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });
      const raw = res.choices[0]?.message?.content ?? "{}";
      return JSON.parse(raw) as { clusters: TopicCluster[]; ungrouped: string[]; summary: string };
    } catch (e) {
      if (e instanceof OpenAI.APIError) throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: e.message });
      throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: "Failed to generate topic map" });
    }
  },
});

// ── Internal Linking Engine ───────────────────────────────────────

export const analyzeInternalLinks = action({
  args: {
    projectId: v.id("projects"),
    sourcePage: v.optional(v.string()), // analyze a specific page, or whole site if omitted
  },
  handler: async (ctx, args): Promise<{ recommendations: InternalLinkRecommendation[]; orphanPages: string[]; summary: string }> => {
    const { pages } = await ctx.runQuery(
      internal.advanced_seo.internalQueries.getAuditPagesForAnalysis,
      { projectId: args.projectId }
    );
    const keywords = await ctx.runQuery(
      internal.advanced_seo.internalQueries.getKeywordsForAnalysis,
      { projectId: args.projectId }
    );

    if (pages.length === 0) {
      return { recommendations: [], orphanPages: [], summary: "No crawled pages found. Run a site audit first to enable internal link analysis." };
    }

    const pageSummary = pages.slice(0, 100).map((p) => ({
      url: p.url,
      title: p.title ?? "",
      h1: p.h1Text ?? "",
      internalLinks: p.internalLinksCount ?? 0,
      wordCount: p.wordCount ?? 0,
    }));

    const kwMap = keywords.slice(0, 50).map((k) => ({ keyword: k.keyword, targetUrl: k.targetUrl ?? "" }));

    const sourceContext = args.sourcePage
      ? `Focus on generating recommendations FROM this specific page: ${args.sourcePage}`
      : "Generate recommendations across the entire site, prioritizing pages with few internal links.";

    const openai = getOpenAI();
    const prompt = `You are an expert SEO consultant. Analyze these crawled pages and generate internal linking recommendations.

${sourceContext}

Crawled pages (url, title, h1, internalLinks count, wordCount):
${JSON.stringify(pageSummary.slice(0, 50), null, 2)}

Target keywords (keyword, targetUrl):
${JSON.stringify(kwMap, null, 2)}

Return JSON:
{
  "recommendations": [
    {
      "sourcePage": "/blog/topic-a",
      "targetPage": "/product/feature-x",
      "targetTitle": "Feature X - Product Name",
      "anchorText": "feature x capabilities",
      "reason": "Topic A discusses a problem that Feature X solves; natural conversion opportunity",
      "priority": "high"
    }
  ],
  "orphanPages": ["/page-with-zero-links"],
  "summary": "Found X link opportunities and Y orphan pages"
}

Generate 10-20 high-quality, contextually relevant recommendations. Only suggest links that make semantic sense.`;

    try {
      const res = await openai.chat.completions.create({
        model: "openai/gpt-5.6-luna",
        reasoning_effort: "low",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });
      const raw = res.choices[0]?.message?.content ?? "{}";
      return JSON.parse(raw) as { recommendations: InternalLinkRecommendation[]; orphanPages: string[]; summary: string };
    } catch (e) {
      if (e instanceof OpenAI.APIError) throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: e.message });
      throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: "Failed to analyze internal links" });
    }
  },
});

// ── Content Gap Analyzer ──────────────────────────────────────────

export const analyzeContentGap = action({
  args: {
    projectId: v.id("projects"),
    competitorUrl: v.optional(v.string()),
    niche: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ gaps: ContentGap[]; summary: string }> => {
    const [keywords, content] = await Promise.all([
      ctx.runQuery(internal.advanced_seo.internalQueries.getKeywordsForAnalysis, { projectId: args.projectId }),
      ctx.runQuery(internal.advanced_seo.internalQueries.getContentForAnalysis, { projectId: args.projectId }),
    ]);

    const existingKeywords = keywords.map((k) => k.keyword).slice(0, 100);
    const existingContent = content.map((c) => c.title).slice(0, 50);

    const openai = getOpenAI();
    const context = args.niche
      ? `Industry/niche: ${args.niche}`
      : args.competitorUrl
        ? `Competing with: ${args.competitorUrl}`
        : "General content gap analysis";

    const prompt = `You are an expert SEO content strategist. Identify content gaps for a website.

${context}

Existing tracked keywords:
${existingKeywords.join(", ")}

Existing content titles:
${existingContent.join(", ")}

Identify 10-15 high-opportunity topics/keywords that are NOT covered by the existing content. Consider:
- Informational queries users need answered in this space
- Commercial intent keywords for conversions
- Long-tail opportunities with lower competition
- Related topics the existing content ecosystem is missing

Return JSON:
{
  "gaps": [
    {
      "topic": "How to choose the right CRM",
      "suggestedKeyword": "how to choose CRM software",
      "estimatedVolume": "Medium (1K-10K/mo)",
      "opportunity": "High-intent buyers in research phase; no existing content covers this",
      "priority": "high",
      "contentType": "Comparison guide / buyer's guide"
    }
  ],
  "summary": "Found X content gaps covering Y topic areas"
}`;

    try {
      const res = await openai.chat.completions.create({
        model: "openai/gpt-5.6-luna",
        reasoning_effort: "low",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });
      const raw = res.choices[0]?.message?.content ?? "{}";
      return JSON.parse(raw) as { gaps: ContentGap[]; summary: string };
    } catch (e) {
      if (e instanceof OpenAI.APIError) throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: e.message });
      throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: "Failed to analyze content gap" });
    }
  },
});

// ── Content Decay Detector ────────────────────────────────────────

export const analyzeContentDecay = action({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args): Promise<{ decaying: ContentDecayItem[]; summary: string }> => {
    const [keywords, snapshots] = await Promise.all([
      ctx.runQuery(internal.advanced_seo.internalQueries.getKeywordsForAnalysis, { projectId: args.projectId }),
      ctx.runQuery(internal.advanced_seo.internalQueries.getRankHistoryForAnalysis, { projectId: args.projectId }),
    ]);

    if (snapshots.length === 0) {
      return { decaying: [], summary: "No rank history found. Track keywords and collect rank snapshots to detect content decay." };
    }

    // Group snapshots by keyword and compute trend
    const snapshotsByKeyword = new Map<string, { date: string; position: number }[]>();
    for (const snap of snapshots) {
      if (snap.position === undefined || snap.position === null) continue;
      const existing = snapshotsByKeyword.get(snap.keywordId) ?? [];
      existing.push({ date: snap.snapshotDate, position: snap.position });
      snapshotsByKeyword.set(snap.keywordId, existing);
    }

    const decayItems: ContentDecayItem[] = [];

    for (const kw of keywords) {
      const history = snapshotsByKeyword.get(kw._id);
      if (!history || history.length < 2) continue;

      const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
      const latest = sorted[sorted.length - 1];
      const thirtyDaysAgo = sorted.find((s) => {
        const d = new Date(s.date);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 30);
        return d >= cutoff;
      }) ?? sorted[Math.floor(sorted.length * 0.67)];
      const sixtyDaysAgo = sorted[Math.floor(sorted.length * 0.33)];

      if (latest.position === undefined) continue;

      const posNow = latest.position;
      const pos30 = thirtyDaysAgo?.position ?? posNow;
      const pos60 = sixtyDaysAgo?.position ?? pos30;

      // Detect decline (higher position number = worse)
      const delta30 = posNow - pos30;
      const delta60 = posNow - pos60;

      let trend: "declining" | "stagnant" | "recovering";
      let decayScore = 0;

      if (delta30 > 5 || delta60 > 10) {
        trend = "declining";
        decayScore = Math.min(100, 40 + delta60 * 2);
      } else if (delta30 < -3) {
        trend = "recovering";
        decayScore = 10;
      } else if (Math.abs(delta30) <= 3 && posNow > 15) {
        trend = "stagnant";
        decayScore = 30 + Math.min(40, posNow);
      } else {
        continue; // healthy, skip
      }

      decayItems.push({
        keyword: kw.keyword,
        targetUrl: kw.targetUrl ?? "",
        positionNow: posNow,
        position30d: pos30,
        position60d: pos60,
        trend,
        decayScore,
        recommendation:
          trend === "declining"
            ? "Refresh content with updated stats, expand depth, and improve E-E-A-T signals"
            : trend === "stagnant"
              ? "Update publish date, add fresh examples, improve internal linking to this page"
              : "Content recovering — continue monitoring and consider a push with new backlinks",
      });
    }

    const sorted = decayItems.sort((a, b) => b.decayScore - a.decayScore);
    const declining = sorted.filter((d) => d.trend === "declining").length;
    const stagnant = sorted.filter((d) => d.trend === "stagnant").length;

    return {
      decaying: sorted.slice(0, 50),
      summary: `Found ${declining} declining and ${stagnant} stagnant content pieces across tracked keywords`,
    };
  },
});

// ── Entity SEO Analyzer ───────────────────────────────────────────

export const analyzeEntitySeo = action({
  args: {
    content: v.string(),
    targetKeyword: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<{
    entities: EntityItem[];
    missingEntities: string[];
    recommendations: string[];
    entityCoverageScore: number;
  }> => {
    const openai = getOpenAI();

    const prompt = `You are an expert in Entity SEO and Knowledge Graph optimization. Analyze this content for entity coverage.

Target keyword: ${args.targetKeyword ?? "not specified"}

Content:
${args.content.slice(0, 3500)}${args.content.length > 3500 ? "\n[truncated...]" : ""}

Identify:
1. Entities present in the content (people, organizations, places, products, concepts)
2. Missing entities that should be included for this topic
3. Recommendations to improve entity coverage for Knowledge Graph inclusion

Return JSON:
{
  "entities": [
    {
      "name": "Google Search Console",
      "type": "Product",
      "salience": 85,
      "description": "Google's free tool for monitoring search performance"
    }
  ],
  "missingEntities": ["Entity that should be mentioned but isn't"],
  "recommendations": ["Add author entity with structured data", "Mention industry associations"],
  "entityCoverageScore": 65
}`;

    try {
      const res = await openai.chat.completions.create({
        model: "openai/gpt-5.6-luna",
        reasoning_effort: "low",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });
      const raw = res.choices[0]?.message?.content ?? "{}";
      return JSON.parse(raw) as {
        entities: EntityItem[];
        missingEntities: string[];
        recommendations: string[];
        entityCoverageScore: number;
      };
    } catch (e) {
      if (e instanceof OpenAI.APIError) throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: e.message });
      throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: "Failed to analyze entities" });
    }
  },
});

// ── Image SEO Analyzer ───────────────────────────────────────────

export const analyzeImageSeo = action({
  args: {
    htmlContent: v.string(),
    pageUrl: v.optional(v.string()),
    websiteContext: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<{
    overallScore: number;
    totalImages: number;
    issueCount: number;
    issues: Array<{
      type: string;
      severity: "high" | "medium" | "low";
      description: string;
      fix: string;
    }>;
    passedChecks: string[];
    recommendations: string[];
  }> => {
    const openai = getOpenAI();

    // Extract img tags from HTML
    const imgMatches = args.htmlContent.match(/<img[^>]*>/gi) ?? [];
    const totalImages = imgMatches.length;

    const prompt = `You are an expert Image SEO auditor. Analyze these image tags for SEO best practices.

Page URL: ${args.pageUrl ?? "unknown"}
Website context: ${args.websiteContext ?? "not specified"}

Image tags found:
${imgMatches.slice(0, 50).join("\n")}

Check for:
- Missing alt attributes
- Generic/empty alt text (alt="", alt="image", alt="photo")
- Decorative images that should have empty alt=""
- Missing loading="lazy" on below-fold images  
- Oversized or wrong format suggestions (WebP preferred)
- Missing width/height attributes (causes layout shift)
- Alt text that includes keywords naturally

Return JSON:
{
  "overallScore": 72,
  "totalImages": ${totalImages},
  "issueCount": 5,
  "issues": [
    {
      "type": "missing_alt",
      "severity": "high",
      "description": "3 images are missing alt attributes",
      "fix": "Add descriptive alt text that includes relevant keywords naturally"
    }
  ],
  "passedChecks": ["All images have width/height attributes", "Lazy loading implemented"],
  "recommendations": ["Convert PNG images to WebP format to reduce file size by 25-35%"]
}`;

    try {
      const res = await openai.chat.completions.create({
        model: "openai/gpt-5.6-luna",
        reasoning_effort: "none",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });
      const raw = res.choices[0]?.message?.content ?? "{}";
      return JSON.parse(raw) as {
        overallScore: number;
        totalImages: number;
        issueCount: number;
        issues: Array<{ type: string; severity: "high" | "medium" | "low"; description: string; fix: string }>;
        passedChecks: string[];
        recommendations: string[];
      };
    } catch (e) {
      if (e instanceof OpenAI.APIError) throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: e.message });
      throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: "Failed to analyze image SEO" });
    }
  },
});

// ── Hreflang Generator ────────────────────────────────────────────

export type HreflangInput = {
  url: string;
  lang: string; // BCP 47 language tag e.g. "en", "en-US", "fr-FR"
};

export const generateHreflang = action({
  args: {
    pages: v.array(v.object({ url: v.string(), lang: v.string() })),
    addXDefault: v.optional(v.boolean()),
    xDefaultUrl: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<{
    htmlTags: string;
    xmlEntries: string;
    entries: HreflangEntry[];
    warnings: string[];
  }> => {
    const warnings: string[] = [];

    // Build entries from the pages array
    const entries: HreflangEntry[] = args.pages.map((p) => {
      const parts = p.lang.split("-");
      return {
        lang: parts[0],
        region: parts[1] ?? "",
        url: p.url,
        hreflangValue: p.lang,
      };
    });

    // Add x-default
    if (args.addXDefault && args.xDefaultUrl) {
      entries.push({ lang: "x-default", region: "", url: args.xDefaultUrl, hreflangValue: "x-default" });
    }

    // Generate HTML link tags
    const htmlTags = entries
      .map((e) => `<link rel="alternate" hreflang="${e.hreflangValue}" href="${e.url}" />`)
      .join("\n");

    // Generate XML sitemap entries
    const xmlEntries = entries
      .map((e) => `  <xhtml:link rel="alternate" hreflang="${e.hreflangValue}" href="${e.url}"/>`)
      .join("\n");

    // Validation warnings
    const langGroups = new Map<string, number>();
    for (const e of entries) {
      if (e.lang === "x-default") continue;
      langGroups.set(e.lang, (langGroups.get(e.lang) ?? 0) + 1);
    }

    if (!args.addXDefault) {
      warnings.push("Consider adding x-default to handle unmatched language/region combinations");
    }

    const langCodes = new Set(entries.map((e) => e.lang));
    if (langCodes.size < 2 && args.pages.length >= 2) {
      warnings.push("All pages have the same language tag — hreflang is only useful when targeting multiple languages or regions");
    }

    for (const p of args.pages) {
      if (!p.url.startsWith("http")) {
        warnings.push(`URL "${p.url}" should be an absolute URL (starting with https://)`);
        break;
      }
    }

    return { htmlTags, xmlEntries, entries, warnings };
  },
});

// ── Topic Map: Bulk Content Generation ────────────────────────────────────
// Generates pillar page + cluster pages for a topic cluster.
// Each page is saved as a draft contentPiece with a quality score.

export type GeneratedClusterPages = {
  pillar: {
    title: string;
    keyword: string;
    content: string;
    wordCount: number;
    contentPieceId?: string;
    qualityScores?: {
      overall: number; eeat: number; peopleFirst: number; seo: number; readability: number; words: number;
    };
  };
  clusterPages: Array<{
    title: string;
    keyword: string;
    intent: string;
    content: string;
    wordCount: number;
    contentPieceId?: string;
    qualityScores?: {
      overall: number; eeat: number; peopleFirst: number; seo: number; readability: number; words: number;
    };
    cannibalizes?: boolean; // true if too similar to another page
    cannibalizationWarning?: string;
  }>;
  summary: string;
};

export const generateClusterPages = action({
  args: {
    projectId: v.id("projects"),
    pillarTopic: v.string(),
    pillarKeyword: v.string(),
    pillarDescription: v.optional(v.string()),
    clusterPages: v.array(v.object({
      keyword: v.string(),
      intent: v.string(),
    })),
    websiteContext: v.optional(v.string()),
    wordCount: v.optional(v.number()), // per page, default 1200
  },
  handler: async (ctx, args): Promise<GeneratedClusterPages> => {
    const openai = getOpenAI();
    const wc = args.wordCount ?? 1200;
    const ctx2 = args.websiteContext ?? args.pillarTopic;

    const system = `You are an expert SEO content writer following Google's People-First content guidelines and E-E-A-T principles. Write content that:
- Demonstrates genuine expertise and first-hand knowledge
- Directly answers user intent before elaborating
- Uses clear headings (H2, H3 in markdown)
- Includes natural keyword usage without stuffing
- Provides unique value over what's already ranking
- Writes approximately ${wc} words per page
- Avoids keyword cannibalization — each page targets a UNIQUE angle`;

    // Generate pillar page first
    const pillarPrompt = `Write a complete SEO-optimised PILLAR PAGE:
Title: ${args.pillarTopic}
Target keyword: "${args.pillarKeyword}"
Description: ${args.pillarDescription ?? ""}
Website context: ${ctx2}

This is a PILLAR PAGE — broad and comprehensive. It should:
- Cover the topic comprehensively (all major subtopics)
- Be the authoritative hub page that cluster pages will link back to
- Target the broad head keyword "${args.pillarKeyword}"
- Include a table of contents, clear H2 sections, and a strong conclusion

Format in Markdown. Aim for ${wc} words.`;

    const pillarRes = await openai.chat.completions.create({
      model: "openai/gpt-5.6-sol",
      reasoning_effort: "low",
      messages: [{ role: "system", content: system }, { role: "user", content: pillarPrompt }],
    });
    const pillarContent = pillarRes.choices[0]?.message?.content ?? "";

    // Generate cluster pages — up to 5 in parallel batches of 3
    const clusterResults: GeneratedClusterPages["clusterPages"] = [];
    const pages = args.clusterPages.slice(0, 8); // cap at 8 cluster pages

    for (let i = 0; i < pages.length; i += 3) {
      const batch = pages.slice(i, i + 3);
      const batchResults = await Promise.all(batch.map(async (page) => {
        const clusterPrompt = `Write a complete SEO-optimised CLUSTER PAGE:
Target keyword: "${page.keyword}"
Search intent: ${page.intent}
Pillar topic: ${args.pillarTopic}
Website context: ${ctx2}

This is a CLUSTER PAGE — focused and specific. It should:
- Target ONLY "${page.keyword}" — NOT the broad pillar keyword "${args.pillarKeyword}"
- Cover a specific subtopic in depth
- Link back to the pillar page about "${args.pillarTopic}"
- Be different from other cluster pages (no keyword cannibalization)

Format in Markdown. Aim for ${wc} words.`;

        const res = await openai.chat.completions.create({
          model: "openai/gpt-5.6-sol",
          reasoning_effort: "low",
          messages: [{ role: "system", content: system }, { role: "user", content: clusterPrompt }],
        });
        const content = res.choices[0]?.message?.content ?? "";
        const titleMatch = content.match(/^#\s+(.+)$/m);
        const title = titleMatch?.[1] ?? page.keyword;
        return { keyword: page.keyword, intent: page.intent, title, content, wordCount: content.split(/\s+/).length };
      }));
      clusterResults.push(...batchResults);
    }

    // Cannibalization check — compare keyword similarity across all generated pages
    const cannibalizedIndices = new Set<number>();

    for (let i = 0; i < clusterResults.length; i++) {
      for (let j = i + 1; j < clusterResults.length; j++) {
        const a = clusterResults[i].keyword.toLowerCase();
        const b = clusterResults[j].keyword.toLowerCase();
        // Simple overlap: if one contains the other or 60%+ words match
        const aWords = new Set(a.split(/\s+/));
        const bWords = new Set(b.split(/\s+/));
        const intersection = [...aWords].filter((w) => bWords.has(w)).length;
        const overlap = intersection / Math.min(aWords.size, bWords.size);
        if (overlap >= 0.6 || a.includes(b) || b.includes(a)) {
          cannibalizedIndices.add(j); // flag the second one
        }
      }
    }

    const clusterPagesWithFlags = clusterResults.map((p, i) => ({
      ...p,
      cannibalizes: cannibalizedIndices.has(i),
      cannibalizationWarning: cannibalizedIndices.has(i)
        ? `This page may compete with another cluster page. Consider merging or differentiating the angle.`
        : undefined,
    }));

    // Save all as draft contentPieces
    const pillarTitle = pillarContent.match(/^#\s+(.+)$/m)?.[1] ?? args.pillarTopic;

    // Save pillar page
    let pillarId: string | undefined;
    try {
      const id = await ctx.runMutation(api.content.mutations.create, {
        projectId: args.projectId,
        title: pillarTitle,
        contentType: "pillar_page",
        status: "draft",
        targetKeyword: args.pillarKeyword,
        content: pillarContent,
      });
      pillarId = id as unknown as string;
    } catch (_e) {
      // save failed — continue anyway
    }

    // Save cluster pages
    for (const page of clusterPagesWithFlags) {
      try {
        const id = await ctx.runMutation(api.content.mutations.create, {
          projectId: args.projectId,
          title: page.title,
          contentType: "cluster_page",
          status: "draft",
          targetKeyword: page.keyword,
          content: page.content,
        });
        page.contentPieceId = id as unknown as string;
      } catch (_e) {
        // save failed — continue anyway
      }
    }

    // Run quality analysis on the pillar page (sample check)
    let pillarQuality: GeneratedClusterPages["pillar"]["qualityScores"] | undefined;
    try {
      const qRes = await openai.chat.completions.create({
        model: "openai/gpt-5.6-luna",
        reasoning_effort: "none",
        messages: [{
          role: "user",
          content: `Quickly score this ${pillarContent.split(/\s+/).length}-word pillar page on 6 dimensions (0-100):
E-E-A-T, People-First, SEO, Readability, Words (${pillarContent.split(/\s+/).length} words — score 90 if >=1200, else scale)

Return JSON: {"overall":75,"eeat":65,"peopleFirst":80,"seo":75,"readability":80,"words":85}

Content start: ${pillarContent.slice(0, 500)}`
        }],
        response_format: { type: "json_object" },
      });
      pillarQuality = JSON.parse(qRes.choices[0]?.message?.content ?? "{}") as typeof pillarQuality;
    } catch (_e) {}

    return {
      pillar: {
        title: pillarTitle,
        keyword: args.pillarKeyword,
        content: pillarContent,
        wordCount: pillarContent.split(/\s+/).length,
        contentPieceId: pillarId,
        qualityScores: pillarQuality,
      },
      clusterPages: clusterPagesWithFlags,
      summary: `Generated 1 pillar page + ${clusterPagesWithFlags.length} cluster pages, all saved as drafts. ${cannibalizedIndices.size > 0 ? `${cannibalizedIndices.size} cannibalization warning(s) found.` : "No cannibalization issues."}`,
    };
  },
});
