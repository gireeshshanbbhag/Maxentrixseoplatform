"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import OpenAI from "openai";

export const analyzeUrl = action({
  args: {
    url: v.string(),
    keyword: v.optional(v.string()),
    title: v.optional(v.string()),
    metaDescription: v.optional(v.string()),
    h1: v.optional(v.string()),
    wordCount: v.optional(v.number()),
  },
  handler: async (_ctx, args): Promise<{
    score: number;
    grade: string;
    quickWins: Array<{ title: string; impact: "high" | "medium" | "low"; type: string }>;
    optimizedTitle: string;
    optimizedMeta: string;
    recommendations: string[];
    technicalChecks: Array<{ label: string; pass: boolean; note: string }>;
  }> => {
    const openai = new OpenAI({
      baseURL: "https://ai-gateway.hercules.app/v1",
      apiKey: process.env.HERCULES_API_KEY,
    });

    const prompt = `You are an SEO expert. Analyze this page and provide actionable recommendations.

URL: ${args.url}
Target Keyword: ${args.keyword ?? "not specified"}
Current Title: ${args.title ?? "not available"}
Current Meta Description: ${args.metaDescription ?? "not available"}
H1: ${args.h1 ?? "not available"}
Word Count: ${args.wordCount ?? "unknown"}

Respond ONLY with valid JSON in this exact structure:
{
  "score": <number 0-100>,
  "grade": <"A" | "B" | "C" | "D" | "F">,
  "quickWins": [
    { "title": "...", "impact": "high"|"medium"|"low", "type": "title"|"meta"|"content"|"technical"|"ux" }
  ],
  "optimizedTitle": "...",
  "optimizedMeta": "...",
  "recommendations": ["...", "..."],
  "technicalChecks": [
    { "label": "...", "pass": true|false, "note": "..." }
  ]
}

Include at least 3 quickWins and 5 technicalChecks. Be specific. Only valid JSON.`;

    const res = await openai.chat.completions.create({
      model: "openai/gpt-5.6-luna",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const raw = res.choices[0]?.message?.content ?? "{}";
    return JSON.parse(raw) as {
      score: number;
      grade: string;
      quickWins: Array<{ title: string; impact: "high" | "medium" | "low"; type: string }>;
      optimizedTitle: string;
      optimizedMeta: string;
      recommendations: string[];
      technicalChecks: Array<{ label: string; pass: boolean; note: string }>;
    };
  },
});
