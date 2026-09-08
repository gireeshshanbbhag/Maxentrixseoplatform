"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import OpenAI from "openai";
import { api } from "../_generated/api.js";

// ── Shared types ─────────────────────────────────────────────────────────────

type KeywordIdea = {
  keyword: string;
  intent: "informational" | "navigational" | "commercial" | "transactional";
  difficulty: "low" | "medium" | "high";
  volume: string;
  priority: "high" | "medium" | "low";
  notes: string;
};

// ── Competitor Analysis types ─────────────────────────────────────────────────

export type CompetitorProfile = {
  domain: string;
  serp_appearances: number;
  avg_position: number | null;
  content_pattern: string;
  strengths: string[];
  exploitable_weaknesses: string[];
  evidence: string[];
};

export type ContentGap = {
  topic: string;
  covered_by_competitors: number;
  search_demand: string | null;
  recommended_page_type: string;
  priority: number;
};

export type KeywordCluster = {
  cluster_name: string;
  primary_keyword: string;
  type: string;
  serp_intent: string;
  intent_match: boolean;
  search_volume: string | null;
  difficulty: string | null;
  opportunity_score: number | null;
  supporting_keywords: Array<{ keyword: string; type: string; search_volume: string | null }>;
  build_recommendation: {
    page_type: string;
    suggested_title: string;
    suggested_h1: string;
    suggested_meta: string;
    required_sections: string[];
    target_word_count: number | null;
  };
  confidence: "high" | "medium" | "low";
};

export type Recommendation = {
  what: string;
  why: string;
  exact_change: string;
  priority: number;
  effort: "low" | "medium" | "high";
  expected_impact: string;
};

export type CompetitorAnalysisResult = {
  summary: string;
  competitors: CompetitorProfile[];
  content_gaps: ContentGap[];
  keyword_clusters: KeywordCluster[];
  recommendations: Recommendation[];
  missing_data: string[];
};

function openaiClient() {
  return new OpenAI({
    baseURL: "https://ai-gateway.hercules.app/v1",
    apiKey: process.env.HERCULES_API_KEY,
  });
}

// ── Standard keyword ideas ────────────────────────────────────────────────────

export const generateKeywordIdeas = action({
  args: {
    seedKeyword: v.string(),
    websiteUrl: v.optional(v.string()),
    businessCategory: v.optional(v.string()),
    country: v.optional(v.string()),
    count: v.optional(v.number()),
    researchType: v.union(
      v.literal("broad"),
      v.literal("long_tail"),
      v.literal("questions"),
      v.literal("competitors"),
      v.literal("local"),
    ),
  },
  handler: async (_ctx, args): Promise<{
    ideas: KeywordIdea[];
    relatedTopics: string[];
    serpFeatures: string[];
    summary: string;
  }> => {
    const openai = openaiClient();
    const count = Math.min(args.count ?? 20, 40);
    const typePrompts: Record<string, string> = {
      broad: "broad variation and synonym keywords",
      long_tail: "long-tail, highly specific, low competition keyword phrases (4+ words)",
      questions: "question-based keywords (who, what, where, when, why, how, best, can, should)",
      competitors: "competitive keywords showing commercial or transactional intent",
      local: "local SEO keywords with location modifiers, near me variations, city-specific",
    };

    const prompt = `You are an expert SEO keyword researcher. Generate ${count} keyword ideas for:
Seed keyword: "${args.seedKeyword}"
Website: ${args.websiteUrl ?? "not specified"}
Business category: ${args.businessCategory ?? "not specified"}
Target country: ${args.country ?? "not specified"}
Research focus: ${typePrompts[args.researchType] ?? "broad variations"}

For each keyword provide realistic volume estimates based on typical SEO data.

Respond ONLY with valid JSON:
{
  "ideas": [
    {
      "keyword": "...",
      "intent": "informational"|"navigational"|"commercial"|"transactional",
      "difficulty": "low"|"medium"|"high",
      "volume": "100-1K"|"1K-10K"|"10K-100K"|"100K+"|"<100",
      "priority": "high"|"medium"|"low",
      "notes": "brief why this keyword is valuable"
    }
  ],
  "relatedTopics": ["topic1", "topic2", "topic3", "topic4", "topic5"],
  "serpFeatures": ["featured snippet", "people also ask", ...],
  "summary": "2-3 sentence strategic overview of the keyword landscape"
}`;

    const res = await openai.chat.completions.create({
      model: "openai/gpt-5.6-luna",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const raw = res.choices[0]?.message?.content ?? "{}";
    try {
      return JSON.parse(raw) as {
        ideas: KeywordIdea[];
        relatedTopics: string[];
        serpFeatures: string[];
        summary: string;
      };
    } catch {
      throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: "Failed to parse AI response" });
    }
  },
});

// ── Competitor Analysis ───────────────────────────────────────────────────────

export const runCompetitorAnalysis = action({
  args: {
    projectId: v.id("projects"),
    ourDomain: v.string(),
    competitorDomains: v.array(v.string()),
    seedKeywords: v.optional(v.string()), // comma-separated optional hints
    businessDescription: v.optional(v.string()),
    country: v.optional(v.string()),
    businessCategory: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<CompetitorAnalysisResult> => {
    const openai = openaiClient();

    // Pull real tracked keywords to enrich the prompt with actual data
    const trackedKeywords = await ctx.runQuery(api.keywords.queries.getKeywords, {
      projectId: args.projectId,
    });

    // Build a compact keyword list with SERP positions for the AI to use
    const ourKeywordData = trackedKeywords.slice(0, 60).map((k) => ({
      keyword: k.keyword,
      serp_position: k.serpPosition ?? null,
      gsc_position: k.gscPosition ?? null,
      intent: k.intent ?? null,
    }));

    const seeds = args.seedKeywords?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];

    const prompt = `You are the SEO Intelligence engine. Perform a deep competitor gap analysis.

=== CONTEXT ===
Our domain: ${args.ourDomain}
Competitor domains: ${args.competitorDomains.join(", ")}
Business category: ${args.businessCategory ?? "not specified"}
Country: ${args.country ?? "not specified"}
Business description: ${args.businessDescription ?? "not specified"}
Seed topics of interest: ${seeds.length > 0 ? seeds.join(", ") : "derive from domain/category"}

=== OUR TRACKED KEYWORDS (real data) ===
${JSON.stringify(ourKeywordData)}

=== YOUR JOB ===
1. Infer what each competitor domain likely ranks for based on its domain name, niche, and the business category.
2. Identify keyword clusters that represent real opportunities — especially where our tracked keywords show serp_position 11-30 (we're close, cheap wins).
3. Surface content gaps: subtopics competitors in this niche typically cover that we likely miss.
4. Generate keyword clusters: 5-10 clusters, each representing ONE buildable page. Order by opportunity_score desc.
5. Write REAL copy for suggested_title, suggested_h1, suggested_meta — finished text to paste, not descriptions.
6. Give max 10 prioritised recommendations with exact_change as ready-to-use text.

=== NON-NEGOTIABLE ===
- Never invent search volume numbers. Use ranges like "<100", "100-1K", "1K-10K", "10K-100K", "100K+", or null.
- opportunity_score is 0-100. Score higher for: low difficulty + high volume + close to ranking (pos 11-30) + intent match.
- If fewer than 2 competitor domains given, set confidence:"low" on all clusters.
- Output ONLY valid JSON matching the schema below. No prose, no markdown.

=== OUTPUT SCHEMA ===
{
  "summary": "3 sentences: where we stand, biggest threat, biggest opening",
  "competitors": [
    {
      "domain": "",
      "serp_appearances": 0,
      "avg_position": null,
      "content_pattern": "one sentence describing their content strategy",
      "strengths": ["strength1", "strength2"],
      "exploitable_weaknesses": ["weakness1", "weakness2"],
      "evidence": ["evidence citing input data"]
    }
  ],
  "content_gaps": [
    {
      "topic": "",
      "covered_by_competitors": 0,
      "search_demand": null,
      "recommended_page_type": "blog|landing_page|category|tool|faq|comparison",
      "priority": 1
    }
  ],
  "keyword_clusters": [
    {
      "cluster_name": "",
      "primary_keyword": "",
      "type": "head|long_tail|question|transactional|commercial|informational|local|branded",
      "serp_intent": "product|category|blog|tool|local_pack|comparison|faq",
      "intent_match": true,
      "search_volume": null,
      "difficulty": "low|medium|high|null",
      "opportunity_score": null,
      "supporting_keywords": [{"keyword": "", "type": "", "search_volume": null}],
      "build_recommendation": {
        "page_type": "landing_page|blog_post|category|comparison|faq|tool",
        "suggested_title": "",
        "suggested_h1": "",
        "suggested_meta": "",
        "required_sections": ["section1", "section2"],
        "target_word_count": null
      },
      "confidence": "high|medium|low"
    }
  ],
  "recommendations": [
    {
      "what": "",
      "why": "",
      "exact_change": "",
      "priority": 1,
      "effort": "low|medium|high",
      "expected_impact": ""
    }
  ],
  "missing_data": []
}`;

    const res = await openai.chat.completions.create({
      model: "openai/gpt-5.6-sol",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const raw = res.choices[0]?.message?.content ?? "{}";
    try {
      return JSON.parse(raw) as CompetitorAnalysisResult;
    } catch {
      throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: "Failed to parse competitor analysis response" });
    }
  },
});
