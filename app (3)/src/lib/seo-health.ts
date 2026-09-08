import type { LucideIcon } from "lucide-react";
import {
  ShieldCheckIcon,
  FileTextIcon,
  SearchIcon,
  LinkIcon,
  TargetIcon,
  GaugeIcon,
} from "lucide-react";

// SEO Health category definitions
export type HealthCategoryId =
  | "technical"
  | "content"
  | "indexation"
  | "links"
  | "keywords"
  | "performance";

export type HealthCategory = {
  id: HealthCategoryId;
  label: string;
  icon: LucideIcon;
  description: string;
  weight: number; // contribution to overall score
};

export const HEALTH_CATEGORIES: HealthCategory[] = [
  {
    id: "technical",
    label: "Technical",
    icon: ShieldCheckIcon,
    description: "HTTP status, redirects, robots, canonicals, schema markup",
    weight: 0.25,
  },
  {
    id: "content",
    label: "Content",
    icon: FileTextIcon,
    description: "Meta tags, headings, word count, duplicate content",
    weight: 0.2,
  },
  {
    id: "indexation",
    label: "Indexation",
    icon: SearchIcon,
    description: "Sitemap, robots.txt, indexable pages, coverage",
    weight: 0.15,
  },
  {
    id: "links",
    label: "Links",
    icon: LinkIcon,
    description: "Internal links, broken links, anchor text, structure",
    weight: 0.15,
  },
  {
    id: "keywords",
    label: "Keywords",
    icon: TargetIcon,
    description: "Tracked keywords, rankings, search visibility",
    weight: 0.15,
  },
  {
    id: "performance",
    label: "Performance",
    icon: GaugeIcon,
    description: "Core Web Vitals, page speed, mobile usability",
    weight: 0.1,
  },
];

// Score color mapping based on 0-100 range
export function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-amber-500";
  if (score >= 40) return "text-orange-500";
  return "text-red-500";
}

export function getScoreBgColor(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-amber-500";
  if (score >= 40) return "bg-orange-500";
  return "bg-red-500";
}

export function getScoreLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Needs work";
  return "Critical";
}

export function getScoreTrackColor(score: number): string {
  if (score >= 80) return "stroke-emerald-500";
  if (score >= 60) return "stroke-amber-500";
  if (score >= 40) return "stroke-orange-500";
  return "stroke-red-500";
}

// Action priority types
export type ActionPriority = "fix_now" | "review" | "optimize";

export type SEOAction = {
  id: string;
  title: string;
  description: string;
  priority: ActionPriority;
  category: HealthCategoryId;
  impact: number; // 1-10
  confidence: number; // 1-10
  difficulty: number; // 1-10 (lower = easier)
  affectedPages?: number;
  source: "heuristic" | "google_data" | "ai_suggestion";
};

export function getPriorityLabel(priority: ActionPriority): string {
  switch (priority) {
    case "fix_now":
      return "FIX NOW";
    case "review":
      return "REVIEW";
    case "optimize":
      return "OPTIMIZE";
  }
}

export function getPriorityColor(priority: ActionPriority): string {
  switch (priority) {
    case "fix_now":
      return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
    case "review":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    case "optimize":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
  }
}

// Initial actions shown before any audit has been run
export const INITIAL_ACTIONS: SEOAction[] = [
  {
    id: "run-first-audit",
    title: "Run your first site audit",
    description:
      "Crawl your website to discover technical SEO issues, broken links, missing meta tags, and more.",
    priority: "fix_now",
    category: "technical",
    impact: 10,
    confidence: 10,
    difficulty: 1,
    source: "heuristic",
  },
  {
    id: "connect-gsc",
    title: "Connect Google Search Console",
    description:
      "Import real search data: queries, clicks, impressions, CTR, and average position.",
    priority: "fix_now",
    category: "keywords",
    impact: 9,
    confidence: 10,
    difficulty: 2,
    source: "heuristic",
  },
  {
    id: "add-keywords",
    title: "Add target keywords",
    description:
      "Define the keywords you want to rank for to start tracking positions and opportunities.",
    priority: "review",
    category: "keywords",
    impact: 8,
    confidence: 9,
    difficulty: 2,
    source: "heuristic",
  },
  {
    id: "connect-ga4",
    title: "Connect Google Analytics",
    description:
      "Import traffic data to understand which pages drive organic visits and conversions.",
    priority: "review",
    category: "performance",
    impact: 7,
    confidence: 9,
    difficulty: 2,
    source: "heuristic",
  },
  {
    id: "check-robots-txt",
    title: "Verify robots.txt configuration",
    description:
      "Ensure your robots.txt isn't accidentally blocking important pages from being crawled.",
    priority: "review",
    category: "indexation",
    impact: 8,
    confidence: 8,
    difficulty: 1,
    source: "heuristic",
  },
  {
    id: "check-sitemap",
    title: "Submit XML sitemap",
    description:
      "Make sure your sitemap is submitted to Google and includes all important pages.",
    priority: "review",
    category: "indexation",
    impact: 7,
    confidence: 9,
    difficulty: 2,
    source: "heuristic",
  },
  {
    id: "review-meta-tags",
    title: "Review page titles and descriptions",
    description:
      "Check that every page has unique, compelling meta titles and descriptions within character limits.",
    priority: "optimize",
    category: "content",
    impact: 7,
    confidence: 8,
    difficulty: 3,
    source: "heuristic",
  },
  {
    id: "check-headings",
    title: "Audit heading structure",
    description:
      "Verify each page has a single H1 and a logical heading hierarchy for better accessibility and SEO.",
    priority: "optimize",
    category: "content",
    impact: 5,
    confidence: 8,
    difficulty: 2,
    source: "heuristic",
  },
  {
    id: "check-internal-links",
    title: "Map internal link structure",
    description:
      "Identify orphaned pages and optimize internal linking to spread authority to important pages.",
    priority: "optimize",
    category: "links",
    impact: 6,
    confidence: 7,
    difficulty: 4,
    source: "heuristic",
  },
  {
    id: "configure-ai",
    title: "Set up AI content provider",
    description:
      "Connect an AI provider to unlock content analysis, writing assistance, and meta generation.",
    priority: "optimize",
    category: "content",
    impact: 5,
    confidence: 9,
    difficulty: 2,
    source: "heuristic",
  },
];
