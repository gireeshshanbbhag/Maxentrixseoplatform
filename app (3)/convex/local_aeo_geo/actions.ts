"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import OpenAI from "openai";

function getOpenAI() {
  return new OpenAI({
    baseURL: "https://ai-gateway.hercules.app/v1",
    apiKey: process.env.HERCULES_API_KEY,
  });
}

// ── Local SEO ──────────────────────────────────────────────────────

export type LocalSeoResult = {
  napScore: number;
  napIssues: Array<{ field: string; issue: string; severity: "high" | "medium" | "low"; fix: string }>;
  gbpChecklist: Array<{ item: string; status: "complete" | "missing" | "needs_attention"; impact: "high" | "medium" | "low"; description: string }>;
  nearMeKeywords: Array<{ keyword: string; intent: string; priority: "high" | "medium" | "low" }>;
  citationSources: Array<{ name: string; url: string; category: string; priority: "essential" | "important" | "useful" }>;
  localSchemaFields: Record<string, string>;
  summary: string;
};

export const analyzeLocalSeo = action({
  args: {
    businessName: v.string(),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
    businessCategory: v.optional(v.string()),
    city: v.optional(v.string()),
    country: v.optional(v.string()),
    primaryServices: v.optional(v.string()),
    gbpStatus: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<LocalSeoResult> => {
    const openai = getOpenAI();

    const prompt = `You are a Local SEO expert. Analyze this business and provide a complete local SEO audit.

Business Details:
- Name: ${args.businessName}
- Address: ${args.address ?? "not provided"}
- Phone: ${args.phone ?? "not provided"}
- Website: ${args.website ?? "not provided"}
- Category: ${args.businessCategory ?? "not provided"}
- Location: ${args.city ?? ""}${args.country ? `, ${args.country}` : ""}
- Services: ${args.primaryServices ?? "not provided"}
- Google Business Profile status: ${args.gbpStatus ?? "unknown"}

Return a JSON object with this exact structure:
{
  "napScore": 85,
  "napIssues": [
    {
      "field": "phone",
      "issue": "Phone number format is inconsistent (missing country code)",
      "severity": "medium",
      "fix": "Use E.164 format: +1-555-123-4567"
    }
  ],
  "gbpChecklist": [
    {
      "item": "Business Name matches exact legal name",
      "status": "complete",
      "impact": "high",
      "description": "Consistent business name builds trust with Google"
    },
    {
      "item": "Primary category is set correctly",
      "status": "needs_attention",
      "impact": "high",
      "description": "Primary GBP category is the single most important ranking factor for local"
    },
    {
      "item": "Business description (750 chars)",
      "status": "missing",
      "impact": "medium",
      "description": "Include primary keywords naturally in first 250 chars"
    },
    {
      "item": "Service areas defined",
      "status": "missing",
      "impact": "high",
      "description": "Define all service area cities and regions"
    },
    {
      "item": "Products/Services listed with prices",
      "status": "needs_attention",
      "impact": "medium",
      "description": "Detailed service listings improve visibility for service-specific searches"
    },
    {
      "item": "100+ recent photos (exterior, interior, team, products)",
      "status": "missing",
      "impact": "high",
      "description": "Businesses with photos receive 42% more direction requests"
    },
    {
      "item": "Regular Google Posts (weekly)",
      "status": "missing",
      "impact": "medium",
      "description": "Fresh posts signal active business to Google"
    },
    {
      "item": "Review response rate > 90%",
      "status": "missing",
      "impact": "high",
      "description": "Responding to reviews improves local ranking and click-through"
    },
    {
      "item": "Questions & Answers populated",
      "status": "missing",
      "impact": "medium",
      "description": "Pre-empt FAQs with keyword-rich answers"
    },
    {
      "item": "Booking/appointment link added",
      "status": "missing",
      "impact": "medium",
      "description": "Direct conversion path from the SERP"
    }
  ],
  "nearMeKeywords": [
    {
      "keyword": "${args.businessCategory ?? "service"} near me",
      "intent": "local navigational",
      "priority": "high"
    }
  ],
  "citationSources": [
    {
      "name": "Google Business Profile",
      "url": "https://business.google.com",
      "category": "Essential",
      "priority": "essential"
    },
    {
      "name": "Yelp",
      "url": "https://biz.yelp.com",
      "category": "Reviews",
      "priority": "essential"
    },
    {
      "name": "Bing Places",
      "url": "https://www.bingplaces.com",
      "category": "Search Engine",
      "priority": "essential"
    },
    {
      "name": "Apple Maps Connect",
      "url": "https://mapsconnect.apple.com",
      "category": "Maps",
      "priority": "essential"
    },
    {
      "name": "Facebook Business",
      "url": "https://business.facebook.com",
      "category": "Social",
      "priority": "important"
    }
  ],
  "localSchemaFields": {
    "@type": "LocalBusiness",
    "name": "${args.businessName}",
    "telephone": "${args.phone ?? ""}",
    "address": "${args.address ?? ""}"
  },
  "summary": "Your local SEO foundation needs attention in 3 key areas..."
}

Generate 10-15 GBP checklist items, 8-12 near-me keyword variations relevant to this specific business type, and 10-15 citation sources tailored to the business category and country. Make everything specific and actionable.`;

    try {
      const res = await openai.chat.completions.create({
        model: "openai/gpt-5.6-luna",
        reasoning_effort: "low",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });
      const raw = res.choices[0]?.message?.content ?? "{}";
      return JSON.parse(raw) as LocalSeoResult;
    } catch (e) {
      if (e instanceof OpenAI.APIError) throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: e.message });
      throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: "Failed to analyze local SEO" });
    }
  },
});

// ── AEO (Answer Engine Optimization) ─────────────────────────────

export type AeoResult = {
  answerReadinessScore: number;
  questionClusters: Array<{
    theme: string;
    questions: Array<{ question: string; type: "how" | "what" | "why" | "when" | "who" | "which" | "comparison" | "list"; priority: "high" | "medium" | "low" }>;
  }>;
  faqOpportunities: Array<{ question: string; answer: string; schemaReady: boolean }>;
  snippetOpportunities: Array<{ keyword: string; snippetType: "paragraph" | "list" | "table" | "steps"; template: string }>;
  contentGaps: string[];
  recommendations: string[];
  summary: string;
};

export const analyzeAeo = action({
  args: {
    topic: v.string(),
    niche: v.optional(v.string()),
    existingContent: v.optional(v.string()),
    targetAudience: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<AeoResult> => {
    const openai = getOpenAI();

    const prompt = `You are an Answer Engine Optimization (AEO) expert specializing in optimizing content for featured snippets, People Also Ask, and voice search on Google, Bing, and AI-powered answer engines.

Topic: ${args.topic}
Niche/Industry: ${args.niche ?? "general"}
Target Audience: ${args.targetAudience ?? "general consumers"}
Existing Content Preview: ${args.existingContent ? args.existingContent.slice(0, 500) : "none provided"}

Generate a comprehensive AEO analysis. Return JSON:
{
  "answerReadinessScore": 62,
  "questionClusters": [
    {
      "theme": "How-To Questions",
      "questions": [
        { "question": "How to...", "type": "how", "priority": "high" },
        { "question": "How do I...", "type": "how", "priority": "high" }
      ]
    },
    {
      "theme": "Definition Questions",
      "questions": [
        { "question": "What is...", "type": "what", "priority": "high" }
      ]
    },
    {
      "theme": "Comparison Questions",
      "questions": [
        { "question": "X vs Y...", "type": "comparison", "priority": "medium" }
      ]
    },
    {
      "theme": "List Questions",
      "questions": [
        { "question": "Best... for...", "type": "list", "priority": "medium" }
      ]
    }
  ],
  "faqOpportunities": [
    {
      "question": "What is the best way to...?",
      "answer": "The best way to... is... [40-60 word direct answer optimized for featured snippets]",
      "schemaReady": true
    }
  ],
  "snippetOpportunities": [
    {
      "keyword": "${args.topic} guide",
      "snippetType": "steps",
      "template": "Step 1: ... Step 2: ... Step 3: ..."
    },
    {
      "keyword": "what is ${args.topic}",
      "snippetType": "paragraph",
      "template": "[Topic] is [definition in 40-60 words]. It works by..."
    }
  ],
  "contentGaps": ["Missing definition section", "No step-by-step guide"],
  "recommendations": ["Add FAQ section with schema markup", "Create dedicated answer pages for top questions"],
  "summary": "Your content scores 62/100 for answer readiness..."
}

Generate 4-6 question cluster themes with 3-5 questions each (20-30 total questions), 6-8 FAQ opportunities with direct answers, and 4-6 snippet opportunities. Make answers 40-60 words optimized for direct extraction by AI/answer engines.`;

    try {
      const res = await openai.chat.completions.create({
        model: "openai/gpt-5.6-luna",
        reasoning_effort: "low",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });
      const raw = res.choices[0]?.message?.content ?? "{}";
      return JSON.parse(raw) as AeoResult;
    } catch (e) {
      if (e instanceof OpenAI.APIError) throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: e.message });
      throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: "Failed to analyze AEO" });
    }
  },
});

// ── GEO (Generative Engine Optimization) ─────────────────────────

export type GeoResult = {
  geoScore: number;
  eeaatScore: number;
  aiCrawlerStatus: Array<{ bot: string; status: "allowed" | "blocked" | "unknown"; impact: "critical" | "high" | "medium" | "low" }>;
  signals: Array<{
    category: "Experience" | "Expertise" | "Authoritativeness" | "Trustworthiness" | "Generative Readiness";
    item: string;
    status: "present" | "missing" | "partial";
    impact: "high" | "medium" | "low";
    description: string;
    fix: string;
  }>;
  doorwayWarnings: Array<{ pattern: string; severity: "high" | "medium" | "low"; description: string }>;
  citationLikelihood: number;
  generativeReadinessItems: Array<{ item: string; status: "ready" | "needs_work" | "missing"; note: string }>;
  recommendations: string[];
  summary: string;
};

export const analyzeGeo = action({
  args: {
    websiteUrl: v.optional(v.string()),
    businessName: v.string(),
    businessDescription: v.optional(v.string()),
    contentSample: v.optional(v.string()),
    robotsTxtContent: v.optional(v.string()),
    hasAuthorBios: v.optional(v.boolean()),
    hasAboutPage: v.optional(v.boolean()),
    hasCitations: v.optional(v.boolean()),
    businessType: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<GeoResult> => {
    const openai = getOpenAI();

    const robotsAnalysis = args.robotsTxtContent
      ? `Robots.txt provided: ${args.robotsTxtContent.slice(0, 500)}`
      : "No robots.txt content provided";

    const prompt = `You are a GEO (Generative Engine Optimization) expert specializing in optimizing content for Google AI Overviews, Bing Copilot, ChatGPT, Perplexity, Claude, and other AI-powered search experiences.

Business: ${args.businessName}
Website: ${args.websiteUrl ?? "not provided"}
Description: ${args.businessDescription ?? "not provided"}
Business Type: ${args.businessType ?? "not specified"}
Has Author Bios: ${args.hasAuthorBios ?? false}
Has About Page: ${args.hasAboutPage ?? false}
Has External Citations/Links: ${args.hasCitations ?? false}
${robotsAnalysis}
Content Sample: ${args.contentSample ? args.contentSample.slice(0, 600) : "none provided"}

Provide a comprehensive GEO analysis. Return JSON:
{
  "geoScore": 58,
  "eeaatScore": 64,
  "aiCrawlerStatus": [
    { "bot": "GPTBot (OpenAI)", "status": "unknown", "impact": "high" },
    { "bot": "ClaudeBot (Anthropic)", "status": "unknown", "impact": "high" },
    { "bot": "PerplexityBot", "status": "unknown", "impact": "high" },
    { "bot": "Google-Extended (AI training)", "status": "unknown", "impact": "medium" },
    { "bot": "Googlebot (AI Overviews)", "status": "allowed", "impact": "critical" },
    { "bot": "Bingbot (Copilot)", "status": "allowed", "impact": "high" }
  ],
  "signals": [
    {
      "category": "Experience",
      "item": "First-hand experience content",
      "status": "missing",
      "impact": "high",
      "description": "Content demonstrating real experience with the subject matter",
      "fix": "Add case studies, project showcases, before/after results, and personal testimonials"
    },
    {
      "category": "Expertise",
      "item": "Author credentials and bios",
      "status": "${args.hasAuthorBios ? "present" : "missing"}",
      "impact": "high",
      "description": "Named authors with verifiable credentials for all content",
      "fix": "Add detailed author bios with credentials, LinkedIn links, and professional history"
    },
    {
      "category": "Authoritativeness",
      "item": "External citations and backlinks",
      "status": "${args.hasCitations ? "present" : "missing"}",
      "impact": "high",
      "description": "References from authoritative external sources",
      "fix": "Cite industry studies, government data, and reputable sources throughout content"
    },
    {
      "category": "Trustworthiness",
      "item": "About page with team information",
      "status": "${args.hasAboutPage ? "present" : "missing"}",
      "impact": "high",
      "description": "Transparent information about who operates the website",
      "fix": "Create comprehensive About page with team photos, bios, and company history"
    }
  ],
  "doorwayWarnings": [
    {
      "pattern": "Location keyword stuffing in page titles",
      "severity": "medium",
      "description": "Pages with titles like 'Service in City1 | Service in City2' may trigger doorway page penalties"
    }
  ],
  "citationLikelihood": 45,
  "generativeReadinessItems": [
    {
      "item": "Structured data (Schema.org markup)",
      "status": "needs_work",
      "note": "AI models rely heavily on structured data to understand entity relationships"
    },
    {
      "item": "Clear entity definition in first paragraph",
      "status": "needs_work",
      "note": "Define what your business/product IS in the opening paragraph"
    },
    {
      "item": "Factual, citation-backed claims",
      "status": "missing",
      "note": "AI systems favor content with verifiable, fact-checked statements"
    },
    {
      "item": "Consistent brand mentions across the web",
      "status": "unknown",
      "note": "Build brand entity recognition through press mentions, directories, and partnerships"
    },
    {
      "item": "Clear topical authority signals",
      "status": "needs_work",
      "note": "Cluster content around core topics to establish subject matter authority"
    },
    {
      "item": "Comprehensive FAQ and Q&A content",
      "status": "missing",
      "note": "AI models often source answers directly from well-structured FAQ content"
    },
    {
      "item": "robots.txt allows major AI crawlers",
      "status": "${args.robotsTxtContent ? "needs_work" : "unknown"}",
      "note": "Blocking GPTBot, ClaudeBot or PerplexityBot reduces citation likelihood in those platforms"
    }
  ],
  "recommendations": [
    "Add author bios with verifiable credentials to all content",
    "Create a comprehensive About page with team information",
    "Review robots.txt to ensure major AI crawlers are not blocked",
    "Add structured data markup for all key content types",
    "Build topical authority by creating comprehensive coverage of core topics"
  ],
  "summary": "Your site scores 58/100 for generative engine readiness..."
}

Analyze all signals thoroughly. Include 8-12 E-E-A-T signals, 3-5 doorway warnings (if relevant), and 7-10 generative readiness items. Be specific about what needs fixing and how AI systems interpret each signal.`;

    try {
      const res = await openai.chat.completions.create({
        model: "openai/gpt-5.6-luna",
        reasoning_effort: "low",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });
      const raw = res.choices[0]?.message?.content ?? "{}";
      return JSON.parse(raw) as GeoResult;
    } catch (e) {
      if (e instanceof OpenAI.APIError) throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: e.message });
      throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: "Failed to analyze GEO" });
    }
  },
});
