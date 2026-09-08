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

export type SchemaFieldValues = Record<string, string>;

export type GeneratedSchemaItem = {
  schemaType: string;
  label: string;
  reasoning: string;
  jsonld: Record<string, unknown>;
};

/** AI-powered schema field auto-fill: given a schema type + business context, returns suggested field values. */
export const generateSchemaFields = action({
  args: {
    schemaType: v.string(),
    businessContext: v.string(),
    targetUrl: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<SchemaFieldValues> => {
    const openai = getOpenAI();

    const prompt = `You are an SEO structured data expert. Generate realistic, well-formed field values for a ${args.schemaType} schema markup.

Business/page context: ${args.businessContext}
${args.targetUrl ? `Target URL: ${args.targetUrl}` : ""}

Return a flat JSON object with field names as keys. Use ISO 8601 for dates. Be specific and realistic, not generic.
Keep text fields concise (under 160 chars for descriptions). Use proper URL format.

For ${args.schemaType}, return only the most important fields (5-10). Do not include @context or @type.`;

    try {
      const res = await openai.chat.completions.create({
        model: "openai/gpt-5.6-luna",
        reasoning_effort: "none",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });
      const raw = res.choices[0]?.message?.content ?? "{}";
      return JSON.parse(raw) as SchemaFieldValues;
    } catch (e) {
      if (e instanceof OpenAI.APIError) throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: e.message });
      throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: "Failed to generate schema fields" });
    }
  },
});

/**
 * Auto-generate the best structured data suite for a page/topic.
 * Analyzes the content and decides which schema types are appropriate,
 * then generates fully-populated JSON-LD for each.
 */
export const autoGenerateSchemaSuite = action({
  args: {
    topic: v.string(),              // page title or topic
    pageContent: v.optional(v.string()), // body text snippet (optional)
    pageUrl: v.optional(v.string()),
    pageType: v.string(),           // "blog_post" | "landing_page" | "local_business" | "ecommerce" | "organization" | "other"
    businessContext: v.string(),    // project description
    siteUrl: v.optional(v.string()),
    organizationName: v.optional(v.string()),
    authorName: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<GeneratedSchemaItem[]> => {
    const openai = getOpenAI();

    const contentSnippet = args.pageContent?.slice(0, 3000) ?? "";

    const prompt = `You are an expert SEO structured data engineer. Analyze this page and generate the best possible JSON-LD schema markup suite.

Page Topic: ${args.topic}
Page Type: ${args.pageType}
Page URL: ${args.pageUrl ?? "unknown"}
Site URL: ${args.siteUrl ?? "unknown"}
Business Context: ${args.businessContext}
${args.organizationName ? `Organization: ${args.organizationName}` : ""}
${args.authorName ? `Author: ${args.authorName}` : ""}
${contentSnippet ? `Content snippet:\n${contentSnippet}` : ""}

Your task: Decide which of these schema types are appropriate for this page, then generate complete, accurate JSON-LD for each:
- Article (for blog posts, news, guides)
- FAQPage (if topic naturally has Q&A, generate 3-5 realistic FAQs about the topic)
- LocalBusiness (only if clearly a local business page)
- BreadcrumbList (always include for any page that has a clear hierarchy)
- Organization (for homepage, about page, or business landing pages)
- WebPage (for landing pages / service pages)
- BlogPosting (for blog posts — more specific than Article)

Rules:
1. For every page, ALWAYS include BreadcrumbList and at least one main content schema.
2. For blog posts: include Article (or BlogPosting), FAQPage (generate 3-5 relevant FAQs), BreadcrumbList.
3. For local business: include LocalBusiness, Organization, BreadcrumbList.
4. For landing/service pages: include WebPage or Service, Organization, BreadcrumbList, FAQPage.
5. Generate realistic, specific values — not placeholder text. Use the topic/content to populate fields.
6. For FAQPage, generate 3-5 realistic questions and detailed answers based on the topic.
7. For BreadcrumbList, create a sensible hierarchy: site root → category → page.
8. Use the current year (2026) for datePublished if needed.
9. All URLs must be absolute. Use the site URL as the base.

Return a JSON object with this structure:
{
  "schemas": [
    {
      "schemaType": "Article",
      "label": "Article — <short description>",
      "reasoning": "One sentence explaining why this schema is included",
      "jsonld": { ...complete JSON-LD object with @context and @type... }
    },
    ...
  ]
}`;

    try {
      const res = await openai.chat.completions.create({
        model: "openai/gpt-5.6-sol",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });
      const raw = res.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw) as { schemas?: GeneratedSchemaItem[] };
      return parsed.schemas ?? [];
    } catch (e) {
      if (e instanceof OpenAI.APIError) throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: e.message });
      throw new ConvexError({ code: "EXTERNAL_SERVICE_ERROR", message: "Failed to auto-generate schema suite" });
    }
  },
});

