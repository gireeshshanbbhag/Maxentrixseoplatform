"use node";
import { action } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { api } from "../_generated/api.js";
import OpenAI from "openai";

function getOpenAI() {
  return new OpenAI({
    baseURL: "https://ai-gateway.hercules.app/v1",
    apiKey: process.env.HERCULES_API_KEY,
  });
}

// ── Content Brief ────────────────────────────────────────────────

export type ContentBrief = {
  title: string;
  targetKeyword: string;
  secondaryKeywords: string[];
  searchIntent: string;
  recommendedWordCount: number;
  outline: Array<{ heading: string; subheadings: string[]; notes: string }>;
  targetAudience: string;
  contentGoal: string;
  keyPoints: string[];
  competitorAngles: string[];
  callToAction: string;
  seoGuidelines: string[];
};

export const generateBrief = action({
  args: {
    keyword: v.string(),
    websiteContext: v.optional(v.string()),
    contentType: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<ContentBrief> => {
    const openai = getOpenAI();
    const type = args.contentType ?? "blog_post";

    const prompt = `You are an expert SEO content strategist. Generate a detailed content brief for a ${type} targeting the keyword: "${args.keyword}".
${args.websiteContext ? `\nWebsite context: ${args.websiteContext}` : ""}

Return a JSON object matching this exact structure:
{
  "title": "Compelling SEO title with keyword",
  "targetKeyword": "exact target keyword",
  "secondaryKeywords": ["keyword 2", "keyword 3", "keyword 4", "keyword 5"],
  "searchIntent": "informational|navigational|commercial|transactional - brief explanation",
  "recommendedWordCount": 1500,
  "outline": [
    { "heading": "H2 heading", "subheadings": ["H3 1", "H3 2"], "notes": "What to cover in this section" }
  ],
  "targetAudience": "Who this content is for",
  "contentGoal": "Primary business/SEO goal",
  "keyPoints": ["Must-cover point 1", "Must-cover point 2"],
  "competitorAngles": ["Unique angle vs competitors"],
  "callToAction": "Recommended CTA",
  "seoGuidelines": ["Include keyword in first 100 words", "Use semantic variations", "Target featured snippet with definition"]
}`;

    try {
      const res = await openai.chat.completions.create({
        model: "openai/gpt-5.6-luna",
        reasoning_effort: "low",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });
      const raw = res.choices[0]?.message?.content ?? "{}";
      return JSON.parse(raw) as ContentBrief;
    } catch (e) {
      if (e instanceof OpenAI.APIError) throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: e.message });
      throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: "Failed to generate brief" });
    }
  },
});

// ── Full Article Writer ──────────────────────────────────────────

export const generateArticle = action({
  args: {
    keyword: v.string(),
    title: v.string(),
    brief: v.optional(v.string()), // JSON string of ContentBrief
    tone: v.optional(v.string()), // "professional" | "conversational" | "authoritative"
    wordCount: v.optional(v.number()),
    websiteContext: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<{ content: string; wordCount: number }> => {
    const openai = getOpenAI();
    const tone = args.tone ?? "professional";
    const target = args.wordCount ?? 1200;

    const system = `You are an expert SEO content writer following Google's People-First content guidelines. Write content that:
- Demonstrates genuine expertise and first-hand knowledge (E-E-A-T)
- Directly answers user intent before elaborating
- Uses clear headings (H2, H3 in markdown)
- Includes natural keyword usage without stuffing
- Provides unique value over what's already ranking
- Maintains a ${tone} tone throughout
- Writes approximately ${target} words`;

    const briefContext = args.brief ? `\nContent brief:\n${args.brief}` : "";
    const websiteCtx = args.websiteContext ? `\nWebsite/brand context: ${args.websiteContext}` : "";

    const user = `Write a complete SEO-optimized article:
Title: ${args.title}
Target keyword: ${args.keyword}${briefContext}${websiteCtx}

Format in Markdown with proper headings. Start directly with the content (no "Here is..." preamble). Include a strong introduction that hooks the reader and signals the value they'll get.`;

    try {
      const res = await openai.chat.completions.create({
        model: "openai/gpt-5.6-sol",
        reasoning_effort: "low",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      });
      const content = res.choices[0]?.message?.content ?? "";
      const wordCount = content.split(/\s+/).length;
      return { content, wordCount };
    } catch (e) {
      if (e instanceof OpenAI.APIError) throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: e.message });
      throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: "Failed to generate article" });
    }
  },
});

// ── Meta Generation ──────────────────────────────────────────────

export type MetaVariation = {
  title: string;
  description: string;
  titleLength: number;
  descriptionLength: number;
};

export const generateMeta = action({
  args: {
    keyword: v.string(),
    pageContent: v.optional(v.string()),
    pageType: v.optional(v.string()),
    brand: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<MetaVariation[]> => {
    const openai = getOpenAI();

    const contentCtx = args.pageContent
      ? `\nPage content summary:\n${args.pageContent.slice(0, 800)}`
      : "";

    const prompt = `You are an SEO expert specializing in click-worthy meta tags. Generate 5 diverse variations of meta title and description for:
Keyword: "${args.keyword}"
Page type: ${args.pageType ?? "blog post"}
Brand: ${args.brand ?? "not specified"}${contentCtx}

Rules:
- Titles: 50-60 characters, include keyword naturally, be specific and compelling
- Descriptions: 140-160 characters, include keyword, clear value proposition + CTA
- Make each variation distinctly different (question, how-to, list, benefit-led, curiosity)

Return JSON array:
[
  { "title": "...", "description": "...", "titleLength": 55, "descriptionLength": 155 },
  ...5 items total
]`;

    try {
      const res = await openai.chat.completions.create({
        model: "openai/gpt-5.6-luna",
        reasoning_effort: "none",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });
      const raw = res.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw) as { variations?: MetaVariation[] } | MetaVariation[];
      const variations = Array.isArray(parsed) ? parsed : (parsed.variations ?? []);
      return variations.map((v) => ({
        ...v,
        titleLength: v.title.length,
        descriptionLength: v.description.length,
      }));
    } catch (e) {
      if (e instanceof OpenAI.APIError) throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: e.message });
      throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: "Failed to generate meta tags" });
    }
  },
});

// ── Content Analyzer / Quality Check ────────────────────────────

export type ContentAnalysis = {
  overallScore: number; // 0-100
  peopleFirstScore: number;
  eeatScore: number;
  seoScore: number;
  readabilityScore: number;
  wordCount: number;
  keywordDensity: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  peopleFirstFlags: string[];
  passedChecks: string[];
  // Per-factor detail for UI progress bars
  factorDetails: {
    eeat: { score: number; issues: string[]; passed: string[] };
    peopleFirst: { score: number; issues: string[]; passed: string[] };
    seo: { score: number; issues: string[]; passed: string[] };
    readability: { score: number; issues: string[]; passed: string[] };
    words: { score: number; issues: string[]; passed: string[] };
    overall: { score: number };
  };
};

export const analyzeContent = action({
  args: {
    content: v.string(),
    keyword: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<ContentAnalysis> => {
    const openai = getOpenAI();
    const wordCount = args.content.split(/\s+/).length;

    const prompt = `You are an expert SEO content quality analyst and a Google Search Quality Rater. Your goal is to give actionable, accurate scores that reflect what it would take to reach 100/100 on every dimension.

Analyze this content:

${args.content.slice(0, 4000)}${args.content.length > 4000 ? "\n[content truncated...]" : ""}

Target keyword: ${args.keyword ?? "not specified"}
Word count: ${wordCount}

Score each factor 0-100. Be honest and critical — most content has real gaps. A 100 means truly exceptional.

Scoring criteria:
- E-E-A-T (0-100): Does content show Experience, Expertise, Authoritativeness, Trustworthiness? Look for: first-hand experience signals, expert citations, verifiable claims, author credentials hints, original research/data, trust signals.
- People-First (0-100): Is it written for humans not search engines? Look for: directly answers the query, doesn't pad with keyword-stuffing, provides genuine value, doesn't exist only to rank.
- SEO (0-100): Technical SEO quality. Look for: keyword in first 100 words, H2/H3 heading structure, semantic keyword variations, internal link opportunities, meta-worthy content, proper intro/conclusion.
- Readability (0-100): Can average person read it easily? Look for: sentence length variety, paragraph breaks, use of lists/tables, active voice, no jargon without explanation, smooth flow.
- Words (0-100): Is the word count appropriate and content dense enough? ${wordCount < 600 ? "CRITICAL: content is very short at " + wordCount + " words — score max 40 for thin content" : wordCount < 1000 ? "Content is short — consider 60-70 score unless very focused" : wordCount >= 1500 ? "Good length" : "Adequate length"}

Return JSON (no markdown, just the object):
{
  "overallScore": 68,
  "peopleFirstScore": 75,
  "eeatScore": 55,
  "seoScore": 70,
  "readabilityScore": 80,
  "wordCount": ${wordCount},
  "keywordDensity": 1.2,
  "strengths": ["Clear structure with H2/H3", "Answers user intent directly"],
  "weaknesses": ["Lacks E-E-A-T signals — no original data or first-hand experience", "Word count too low for competitive SERP"],
  "suggestions": ["Add statistics or original research", "Include author credentials or first-person experience", "Expand to at least 1500 words", "Add FAQ section for featured snippet"],
  "peopleFirstFlags": ["Missing first-hand experience signals"],
  "passedChecks": ["Clear purpose", "Direct answer to query", "Good paragraph breaks"],
  "factorDetails": {
    "eeat": { "score": 55, "issues": ["No original data or research", "No author credentials", "No external citations"], "passed": ["Clear expertise demonstrated in depth of coverage"] },
    "peopleFirst": { "score": 75, "issues": ["Some padding in intro"], "passed": ["Directly answers user intent", "Helpful actionable tips"] },
    "seo": { "score": 70, "issues": ["Keyword missing from first 100 words", "No internal link opportunities noted"], "passed": ["Good heading structure", "Keyword variations used"] },
    "readability": { "score": 80, "issues": ["Some paragraphs too long"], "passed": ["Good sentence variety", "Active voice", "Bullet lists used"] },
    "words": { "score": 60, "issues": ["At ${wordCount} words, content may be too thin to outrank competitors who average 1800+"], "passed": [] },
    "overall": { "score": 68 }
  }
}`;

    try {
      const res = await openai.chat.completions.create({
        model: "openai/gpt-5.6-sol",
        reasoning_effort: "medium",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });
      const raw = res.choices[0]?.message?.content ?? "{}";
      return JSON.parse(raw) as ContentAnalysis;
    } catch (e) {
      if (e instanceof OpenAI.APIError) throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: e.message });
      throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: "Failed to analyze content" });
    }
  },
});

// ── Content Improvement ──────────────────────────────────────────

export const improveContent = action({
  args: {
    content: v.string(),
    instruction: v.string(), // "improve readability" | "optimize for keyword X" | "add more detail" | etc
  },
  handler: async (_ctx, args): Promise<{ content: string }> => {
    const openai = getOpenAI();

    try {
      const res = await openai.chat.completions.create({
        model: "openai/gpt-5.6-sol",
        reasoning_effort: "low",
        messages: [
          {
            role: "system",
            content: "You are an expert SEO content editor. Improve the provided content based on the instruction. Return only the improved content in Markdown, with no preamble.",
          },
          {
            role: "user",
            content: `Instruction: ${args.instruction}\n\nContent:\n${args.content}`,
          },
        ],
      });
      return { content: res.choices[0]?.message?.content ?? args.content };
    } catch (e) {
      if (e instanceof OpenAI.APIError) throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: e.message });
      throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: "Failed to improve content" });
    }
  },
});

// ── Auto Meta Generation from Content ────────────────────────────

export type AutoMeta = {
  metaTitle: string;
  metaDescription: string;
  titleLength: number;
  descriptionLength: number;
  focusKeyword: string;
};

export const autoGenerateMeta = action({
  args: {
    content: v.string(), // first 800 chars of article
    keyword: v.string(),
    brand: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<AutoMeta> => {
    const openai = getOpenAI();
    const snippet = args.content.slice(0, 800);

    const prompt = `You are an SEO expert. Based on this article content and keyword, generate the single best meta title and description.

Keyword: "${args.keyword}"
Brand: ${args.brand ?? "not specified"}
Article start: ${snippet}

Rules:
- Meta title: 50-60 chars, include keyword near start, compelling, include brand if appropriate
- Meta description: 140-160 chars, include keyword, clear value proposition, call to action
- Return ONLY ONE variation (the best one)

Return JSON:
{
  "metaTitle": "...",
  "metaDescription": "...",
  "titleLength": 55,
  "descriptionLength": 155,
  "focusKeyword": "${args.keyword}"
}`;

    try {
      const res = await openai.chat.completions.create({
        model: "openai/gpt-5.6-luna",
        reasoning_effort: "none",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });
      const raw = res.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw) as AutoMeta;
      return {
        ...parsed,
        titleLength: parsed.metaTitle.length,
        descriptionLength: parsed.metaDescription.length,
      };
    } catch (e) {
      if (e instanceof OpenAI.APIError) throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: e.message });
      throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: "Failed to generate meta" });
    }
  },
});

// ── Internal Link Suggestions from Content ────────────────────────

export type InternalLinkSuggestion = {
  anchorText: string;
  targetUrl: string;
  targetTitle: string;
  reason: string;
  priority: "high" | "medium" | "low";
  contextSentence: string; // the sentence where this link should go
};

export const suggestInternalLinks = action({
  args: {
    content: v.string(),
    keyword: v.string(),
    // Existing pages from the project (title + url pairs)
    existingPages: v.array(v.object({ title: v.string(), url: v.string() })),
  },
  handler: async (_ctx, args): Promise<InternalLinkSuggestion[]> => {
    if (args.existingPages.length === 0) return [];
    const openai = getOpenAI();

    const pageList = args.existingPages
      .slice(0, 30)
      .map((p, i) => `${i + 1}. "${p.title}" — ${p.url}`)
      .join("\n");

    const prompt = `You are an internal linking expert. Given this article content, suggest the best internal links to other pages on the same site.

Article keyword: "${args.keyword}"
Article content (first 2000 chars):
${args.content.slice(0, 2000)}

Available pages to link to:
${pageList}

Rules:
- Suggest 3-6 high-value internal links
- Only suggest pages that are contextually relevant to a passage in the content
- Choose natural anchor text that exists or could naturally fit in the article
- Prioritise pages that complement (not compete) with the current article's keyword
- "high" priority = directly complementary topic; "medium" = related; "low" = loosely related

Return JSON array:
[
  {
    "anchorText": "email marketing tools",
    "targetUrl": "https://example.com/email-tools",
    "targetTitle": "Best Email Marketing Tools 2024",
    "reason": "Directly relevant to the 'choosing tools' section",
    "priority": "high",
    "contextSentence": "When choosing the right email marketing tools, you should consider..."
  }
]`;

    try {
      const res = await openai.chat.completions.create({
        model: "openai/gpt-5.6-luna",
        reasoning_effort: "low",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });
      const raw = res.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw) as { suggestions?: InternalLinkSuggestion[] } | InternalLinkSuggestion[];
      return Array.isArray(parsed) ? parsed : (parsed.suggestions ?? []);
    } catch (e) {
      if (e instanceof OpenAI.APIError) throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: e.message });
      throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: "Failed to suggest internal links" });
    }
  },
});

// ── Publish Content to CMS ────────────────────────────────────────

export const publishContentToCms = action({
  args: {
    projectId: v.id("projects"),
    title: v.string(),
    content: v.string(), // HTML content (from TipTap) or markdown
    metaTitle: v.optional(v.string()),
    metaDescription: v.optional(v.string()),
    status: v.string(), // "draft" | "publish"
    // WordPress-specific
    featuredImageUrl: v.optional(v.string()),
    categories: v.optional(v.array(v.number())),
    tags: v.optional(v.array(v.number())),
    newTagNames: v.optional(v.array(v.string())),
    newCategoryNames: v.optional(v.array(v.string())),
    excerpt: v.optional(v.string()),
    slug: v.optional(v.string()),
    postType: v.optional(v.string()), // "post" | "page"
    // Generic / other platforms
    collectionId: v.optional(v.string()),
    categoryNames: v.optional(v.string()),
    tagNames: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; postUrl?: string; postId?: string | number; error?: string }> => {
    // Look up CMS connection for this project
    const connections = await ctx.runQuery(api.cms.queries.listConnections, { projectId: args.projectId });
    const conn = connections.find((c) => c.status === "active");

    if (!conn) {
      throw new ConvexError({ code: "NOT_FOUND", message: "No active CMS connection found. Connect a CMS first." });
    }

    // Determine if content is HTML or markdown and normalise to HTML
    const isHtml = /<[a-z][\s\S]*>/i.test(args.content);
    const htmlContent = isHtml ? args.content : args.content
      .replace(/^#### (.+)$/gm, "<h4>$1</h4>")
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/^## (.+)$/gm, "<h2>$1</h2>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/^> (.+)$/gm, "<blockquote><p>$1</p></blockquote>")
      .replace(/^- (.+)$/gm, "<li>$1</li>")
      .replace(/(<li>[\s\S]*?<\/li>)\n(?=<li>)/g, "$1")
      .replace(/(<li>.*?<\/li>)+/gs, (m) => `<ul>${m}</ul>`)
      .replace(/\n\n+/g, "</p><p>")
      .replace(/^(?!<[hHuUoObBpP])(.+)$/gm, (line) => line.trim() ? `<p>${line}</p>` : "")
      .trim();

    if (conn.platform === "wordpress") {
      const authHeader = `Basic ${conn.credentials}`;
      const apiBase = `${conn.siteUrl.replace(/\/$/, "")}/wp-json/wp/v2`;
      const postEndpoint = args.postType === "page" ? "pages" : "posts";

      // 1. If a featured image URL was provided, upload it to WP Media Library first
      let featuredMediaId: number | undefined;
      if (args.featuredImageUrl) {
        try {
          // Download the image
          const imgRes = await fetch(args.featuredImageUrl);
          if (imgRes.ok) {
            const imgBuffer = await imgRes.arrayBuffer();
            const contentType = imgRes.headers.get("content-type") ?? "image/jpeg";
            const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
            const filename = `featured-${Date.now()}.${ext}`;

            const mediaRes = await fetch(`${apiBase}/media`, {
              method: "POST",
              headers: {
                Authorization: authHeader,
                "Content-Type": contentType,
                "Content-Disposition": `attachment; filename="${filename}"`,
              },
              body: imgBuffer,
            });

            if (mediaRes.ok) {
              const mediaData = await mediaRes.json() as { id: number };
              featuredMediaId = mediaData.id;
            }
          }
        } catch {
          // Featured image upload failed — continue without it
        }
      }

      // 2. Create new tag IDs for any new tag names
      const resolvedTagIds = [...(args.tags ?? [])];
      for (const tagName of (args.newTagNames ?? [])) {
        try {
          const tagRes = await fetch(`${apiBase}/tags`, {
            method: "POST",
            headers: { Authorization: authHeader, "Content-Type": "application/json" },
            body: JSON.stringify({ name: tagName }),
          });
          if (tagRes.ok) {
            const tagData = await tagRes.json() as { id: number };
            resolvedTagIds.push(tagData.id);
          }
        } catch {
          // Ignore tag creation failures
        }
      }

      // 3. Create new category IDs for any new category names
      const resolvedCategoryIds = [...(args.categories ?? [])];
      for (const catName of (args.newCategoryNames ?? [])) {
        try {
          const catRes = await fetch(`${apiBase}/categories`, {
            method: "POST",
            headers: { Authorization: authHeader, "Content-Type": "application/json" },
            body: JSON.stringify({ name: catName }),
          });
          if (catRes.ok) {
            const catData = await catRes.json() as { id: number };
            resolvedCategoryIds.push(catData.id);
          }
        } catch {
          // Ignore category creation failures (may already exist)
        }
      }


      const body: Record<string, unknown> = {
        title: args.title,
        content: htmlContent,
        status: args.status === "publish" ? "publish" : "draft",
        ...(args.slug ? { slug: args.slug } : {}),
        ...(args.excerpt ? { excerpt: args.excerpt } : {}),
        ...(featuredMediaId !== undefined ? { featured_media: featuredMediaId } : {}),
        ...((resolvedCategoryIds).length > 0 ? { categories: resolvedCategoryIds } : {}),
        ...(resolvedTagIds.length > 0 ? { tags: resolvedTagIds } : {}),
      };

      if (args.metaTitle || args.metaDescription) {
        body.meta = {
          ...(args.metaTitle ? { _yoast_wpseo_title: args.metaTitle } : {}),
          ...(args.metaDescription ? { _yoast_wpseo_metadesc: args.metaDescription } : {}),
        };
      }

      const res = await fetch(`${apiBase}/${postEndpoint}`, {
        method: "POST",
        headers: { Authorization: authHeader, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "Unknown error");
        throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: `WordPress API error: ${res.status} ${errText.slice(0, 200)}` });
      }

      const data = await res.json() as { id: number; link: string };
      return { success: true, postUrl: data.link, postId: data.id };
    }

    if (conn.platform === "webflow") {
      const collectionId = args.collectionId;
      if (!collectionId) {
        throw new ConvexError({ code: "BAD_REQUEST", message: "Webflow Collection ID required. Enter it in the publish panel." });
      }
      // credentials stores the Webflow API token for Webflow connections
      const apiToken = conn.credentials;
      const body = {
        isArchived: false,
        isDraft: args.status !== "publish",
        fieldData: {
          name: args.title,
          slug: args.slug ?? args.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
          "post-body": htmlContent,
          ...(args.metaTitle ? { "seo-title": args.metaTitle } : {}),
          ...(args.metaDescription ? { "seo-description": args.metaDescription } : {}),
          ...(args.featuredImageUrl ? { "main-image": { url: args.featuredImageUrl } } : {}),
        },
      };
      const res = await fetch(`https://api.webflow.com/v2/collections/${collectionId}/items`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
          "accept-version": "1.0.0",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "Unknown error");
        throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: `Webflow API error: ${res.status} ${errText.slice(0, 200)}` });
      }
      const data = await res.json() as { id: string };
      return { success: true, postId: data.id };
    }

    if (conn.platform === "wix") {
      const categories = (args.categoryNames ?? "").split(",").map((s) => s.trim()).filter(Boolean);
      const tags = (args.tagNames ?? "").split(",").map((s) => s.trim()).filter(Boolean);
      // credentials stores "apiKey|siteId" for Wix connections
      const [apiKey, siteId] = conn.credentials.split("|");
      const body = {
        blogPost: {
          title: args.title,
          content: JSON.stringify({ version: 1, type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: htmlContent.replace(/<[^>]+>/g, " ").trim() }] }] }),
          status: args.status === "publish" ? "PUBLISHED" : "DRAFT",
          ...(args.featuredImageUrl ? { media: { wixMedia: { image: { imageInfo: { url: args.featuredImageUrl } } } } } : {}),
          ...(categories.length > 0 ? { categoryIds: categories } : {}),
          ...(tags.length > 0 ? { tagIds: tags } : {}),
        },
      };
      const res = await fetch("https://www.wixapis.com/blog/v3/posts", {
        method: "POST",
        headers: {
          Authorization: apiKey ?? conn.credentials,
          "wix-site-id": siteId ?? conn.siteUrl,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "Unknown error");
        throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: `Wix API error: ${res.status} ${errText.slice(0, 200)}` });
      }
      const data = await res.json() as { post?: { id: string; url?: string } };
      return { success: true, postId: data.post?.id, postUrl: data.post?.url };
    }

    if (conn.platform === "squarespace") {
      const collectionId = args.collectionId;
      if (!collectionId) {
        throw new ConvexError({ code: "BAD_REQUEST", message: "Squarespace Blog Collection ID required." });
      }
      // credentials stores the Squarespace API token
      const apiToken = conn.credentials;
      const body = {
        title: args.title,
        body: htmlContent,
        isDraft: args.status !== "publish",
        ...(args.featuredImageUrl ? { assetUrl: args.featuredImageUrl } : {}),
        ...(args.tagNames ? { tags: (args.tagNames).split(",").map((s) => s.trim()).filter(Boolean) } : {}),
      };
      const res = await fetch(`https://api.squarespace.com/1.0/collections/${collectionId}/pages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
          "User-Agent": "Maxentrix-SEO/1.0",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "Unknown error");
        throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: `Squarespace API error: ${res.status} ${errText.slice(0, 200)}` });
      }
      const data = await res.json() as { id: string; fullUrl?: string };
      return { success: true, postId: data.id, postUrl: data.fullUrl };
    }

    throw new ConvexError({ code: "NOT_IMPLEMENTED", message: `Publishing to ${conn.platform} is not yet supported from this editor` });
  },
});
