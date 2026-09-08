import { useState } from "react";
import { Input } from "@/components/ui/input.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  SearchIcon, BookOpenIcon, ExternalLinkIcon, ChevronDownIcon, ChevronUpIcon,
} from "lucide-react";

type Resource = {
  title: string;
  url: string;
  description: string;
  category: string;
  tags: string[];
};

const RESOURCES: Resource[] = [
  // Core Guides
  { title: "Google Search Essentials", url: "https://developers.google.com/search/docs/essentials", description: "The core requirements for getting your content to appear in Google Search results.", category: "Core", tags: ["fundamentals", "crawling", "indexing"] },
  { title: "How Google Search Works", url: "https://developers.google.com/search/docs/fundamentals/how-search-works", description: "In-depth look at crawling, indexing, and serving results.", category: "Core", tags: ["fundamentals", "crawling", "indexing"] },
  { title: "Google Search Quality Evaluator Guidelines", url: "https://static.googleusercontent.com/media/guidelines.raterhub.com/en//searchqualityevaluatorguidelines.pdf", description: "The full E-E-A-T guidelines used by Google's quality raters.", category: "Core", tags: ["e-e-a-t", "quality", "content"] },
  { title: "Search Central Blog", url: "https://developers.google.com/search/blog", description: "Official announcements, algorithm updates, and best practice guidance from Google.", category: "Core", tags: ["updates", "news", "algorithm"] },

  // Technical SEO
  { title: "Robots.txt Documentation", url: "https://developers.google.com/search/docs/crawling-indexing/robots/intro", description: "How to use robots.txt to control Googlebot crawling.", category: "Technical", tags: ["robots.txt", "crawling", "technical"] },
  { title: "Sitemaps Overview", url: "https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview", description: "Build and submit sitemaps to help Google discover your content.", category: "Technical", tags: ["sitemaps", "crawling", "technical"] },
  { title: "Canonical URLs", url: "https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls", description: "How to use canonical tags to avoid duplicate content issues.", category: "Technical", tags: ["canonical", "duplicate", "technical"] },
  { title: "Core Web Vitals", url: "https://web.dev/articles/vitals", description: "LCP, INP, and CLS explained with measurement guidance.", category: "Technical", tags: ["cwv", "performance", "page-experience"] },
  { title: "Structured Data Documentation", url: "https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data", description: "Implement JSON-LD structured data for rich results eligibility.", category: "Technical", tags: ["structured-data", "schema", "rich-results"] },
  { title: "Rich Results Test", url: "https://search.google.com/test/rich-results", description: "Test your schema markup for rich result eligibility directly in your browser.", category: "Technical", tags: ["structured-data", "schema", "testing", "tools"] },
  { title: "Mobile-Friendly Test", url: "https://search.google.com/test/mobile-friendly", description: "Check if your pages meet Google's mobile-friendliness criteria.", category: "Technical", tags: ["mobile", "testing", "tools"] },
  { title: "HTTP Status Codes for SEO", url: "https://developers.google.com/search/docs/crawling-indexing/http-network-errors", description: "How Google handles different HTTP status codes including redirects and errors.", category: "Technical", tags: ["http", "redirects", "technical"] },
  { title: "HTTPS and Security", url: "https://developers.google.com/search/docs/crawling-indexing/security/https", description: "Why HTTPS is a ranking signal and how to migrate safely.", category: "Technical", tags: ["https", "security", "technical"] },
  { title: "JavaScript SEO Basics", url: "https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics", description: "How Googlebot handles JavaScript rendering and what to watch out for.", category: "Technical", tags: ["javascript", "rendering", "technical"] },
  { title: "PageSpeed Insights", url: "https://pagespeed.web.dev/", description: "Analyze page performance with Lighthouse and CWV field data.", category: "Technical", tags: ["performance", "cwv", "tools"] },

  // Content
  { title: "Creating Helpful Content", url: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content", description: "Google's official guidance on creating people-first content that succeeds in Search.", category: "Content", tags: ["content", "helpful-content", "e-e-a-t"] },
  { title: "Title Links and Snippets", url: "https://developers.google.com/search/docs/appearance/title-link", description: "How Google chooses the title and description shown in Search results.", category: "Content", tags: ["titles", "meta-description", "content"] },
  { title: "Featured Snippets Guide", url: "https://developers.google.com/search/docs/appearance/featured-snippets", description: "How to optimize content to appear as a featured snippet (position zero).", category: "Content", tags: ["snippets", "aeo", "content"] },
  { title: "Image SEO Best Practices", url: "https://developers.google.com/search/docs/appearance/google-images", description: "Optimize images for Google Search and Google Images.", category: "Content", tags: ["images", "alt-text", "content"] },
  { title: "Video SEO", url: "https://developers.google.com/search/docs/appearance/video", description: "Help Google understand and index your video content.", category: "Content", tags: ["video", "content"] },
  { title: "Duplicate Content", url: "https://developers.google.com/search/docs/crawling-indexing/duplicate-content", description: "How Google handles duplicate content and what you should do about it.", category: "Content", tags: ["duplicate", "content", "canonical"] },

  // Local SEO
  { title: "Local Business Schema", url: "https://developers.google.com/search/docs/appearance/structured-data/local-business", description: "Add LocalBusiness structured data to help your business appear in local search.", category: "Local SEO", tags: ["local", "schema", "structured-data"] },
  { title: "Google Business Profile Help", url: "https://support.google.com/business/", description: "Official help center for managing your Google Business Profile listing.", category: "Local SEO", tags: ["local", "gbp", "google-business"] },
  { title: "Google Maps Platform Geocoding", url: "https://developers.google.com/maps/documentation/geocoding", description: "Geocoding API for converting addresses to coordinates.", category: "Local SEO", tags: ["local", "maps", "api"] },

  // International SEO
  { title: "Hreflang for Multi-Language", url: "https://developers.google.com/search/docs/specialty/international/localization-vs-internationalization", description: "How to tell Google about different language and regional versions of a page.", category: "International", tags: ["hreflang", "international", "i18n"] },
  { title: "International Targeting", url: "https://developers.google.com/search/docs/specialty/international", description: "All Google guidance on international SEO in one place.", category: "International", tags: ["international", "hreflang", "i18n"] },

  // Algorithm & Updates
  { title: "Google Search Status Dashboard", url: "https://status.search.google.com/", description: "Real-time status of all Google Search systems and ranking signals.", category: "Algorithm", tags: ["algorithm", "updates", "monitoring"] },
  { title: "Spam Policies", url: "https://developers.google.com/search/policies/search-essentials/spam-policies", description: "What Google considers spam and the penalties involved.", category: "Algorithm", tags: ["spam", "penalties", "algorithm"] },
  { title: "Link Spam Policies", url: "https://developers.google.com/search/docs/essentials/spam-policies#link-spam", description: "How Google treats manipulative link practices.", category: "Algorithm", tags: ["links", "spam", "algorithm"] },
  { title: "Doorway Pages Policy", url: "https://developers.google.com/search/docs/essentials/spam-policies#doorways", description: "What constitutes a doorway page and why to avoid them.", category: "Algorithm", tags: ["doorways", "spam", "local", "algorithm"] },

  // Tools
  { title: "Google Search Console", url: "https://search.google.com/search-console/", description: "Google's free tool for monitoring search performance, indexing, and issues.", category: "Tools", tags: ["gsc", "tools", "monitoring"] },
  { title: "URL Inspection Tool", url: "https://support.google.com/webmasters/answer/9012289", description: "Check how Google sees a specific URL and request indexing.", category: "Tools", tags: ["url-inspection", "indexing", "tools"] },
  { title: "Google Trends", url: "https://trends.google.com/", description: "Explore search interest over time and geographic regions.", category: "Tools", tags: ["trends", "keyword-research", "tools"] },

  // AEO / GEO
  { title: "Google AI Overviews", url: "https://blog.google/products/search/generative-ai-search/", description: "How Google's AI-powered search overviews work and what content it surfaces.", category: "AEO / GEO", tags: ["ai-overviews", "geo", "aeo"] },
  { title: "People Also Ask Optimization", url: "https://developers.google.com/search/docs/appearance/featured-snippets", description: "How to target People Also Ask boxes with structured Q&A content.", category: "AEO / GEO", tags: ["paa", "aeo", "snippets"] },
];

const CATEGORIES = ["All", ...Array.from(new Set(RESOURCES.map((r) => r.category)))];

export default function KnowledgeBasePage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(CATEGORIES));

  const filtered = RESOURCES.filter((r) => {
    const matchCat = category === "All" || r.category === category;
    const q = search.toLowerCase();
    const matchSearch = !q || r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) || r.tags.some((t) => t.includes(q));
    return matchCat && matchSearch;
  });

  const grouped: Record<string, Resource[]> = {};
  for (const r of filtered) {
    if (!grouped[r.category]) grouped[r.category] = [];
    grouped[r.category].push(r);
  }

  function toggleGroup(cat: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  const CATEGORY_COLORS: Record<string, string> = {
    "Core": "bg-primary/10 text-primary border-primary/20",
    "Technical": "bg-blue-500/10 text-blue-600 border-blue-500/20",
    "Content": "bg-green-500/10 text-green-600 border-green-500/20",
    "Local SEO": "bg-orange-500/10 text-orange-600 border-orange-500/20",
    "International": "bg-purple-500/10 text-purple-600 border-purple-500/20",
    "Algorithm": "bg-red-500/10 text-red-600 border-red-500/20",
    "Tools": "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
    "AEO / GEO": "bg-pink-500/10 text-pink-600 border-pink-500/20",
  };

  return (
    <div className="p-6 max-w-4xl space-y-5">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <BookOpenIcon className="h-5 w-5 text-primary" />SEO Knowledge Base
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Official Google documentation, tools, and guidelines — curated and organised by category
        </p>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" placeholder="Search resources…" />
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium cursor-pointer transition-colors ${
              category === cat
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-transparent text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="text-xs text-muted-foreground">{filtered.length} resources</div>

      {/* Grouped results */}
      <div className="space-y-4">
        {Object.entries(grouped).map(([cat, resources]) => {
          const isOpen = expandedGroups.has(cat);
          const catColor = CATEGORY_COLORS[cat] ?? "bg-muted text-muted-foreground border-muted";
          return (
            <div key={cat} className="rounded-xl border overflow-hidden">
              <button
                onClick={() => toggleGroup(cat)}
                className="w-full flex items-center justify-between px-4 py-3 bg-muted/20 hover:bg-muted/40 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold border rounded px-2 py-0.5 ${catColor}`}>{cat}</span>
                  <span className="text-xs text-muted-foreground">{resources.length} resources</span>
                </div>
                {isOpen ? <ChevronUpIcon className="h-4 w-4 text-muted-foreground" /> : <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />}
              </button>
              {isOpen && (
                <div className="divide-y">
                  {resources.map((r) => (
                    <a
                      key={r.url}
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 px-4 py-3.5 hover:bg-muted/20 group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium group-hover:text-primary transition-colors">{r.title}</span>
                          <ExternalLinkIcon className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{r.description}</p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {r.tags.map((t) => (
                            <span key={t} className="text-[10px] bg-muted/50 text-muted-foreground rounded px-1.5 py-0.5">{t}</span>
                          ))}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
