import {
  GlobeIcon,
  ExternalLinkIcon,
  InfoIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";

const OFFICIAL_SOURCES = [
  {
    title: "Google Search Central",
    url: "https://developers.google.com/search/",
    description: "Official documentation for Google Search",
  },
  {
    title: "Search Essentials",
    url: "https://developers.google.com/search/docs/essentials",
    description: "Core requirements for appearing in Google Search",
  },
  {
    title: "Google Search Status Dashboard",
    url: "https://status.search.google.com/",
    description: "Real-time status of Google Search ranking systems",
  },
  {
    title: "Search Central Blog",
    url: "https://developers.google.com/search/blog",
    description: "Official announcements and updates from Google",
  },
  {
    title: "AI Features in Search",
    url: "https://developers.google.com/search/docs/appearance/ai-features",
    description: "How AI features work in Google Search",
  },
  {
    title: "AI Content Guidance",
    url: "https://developers.google.com/search/docs/fundamentals/using-gen-ai-content",
    description: "Google's guidance on AI-generated content",
  },
  {
    title: "Generative AI Optimization",
    url: "https://developers.google.com/search/docs/fundamentals/ai-optimization-guide",
    description: "Optimizing for Google's generative AI features",
  },
  {
    title: "Structured Data",
    url: "https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data",
    description: "Schema markup and rich results documentation",
  },
];

export default function GoogleUpdates() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Google Search Updates
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Track official Google algorithm updates, search documentation changes,
          and ranking system status. All data sourced exclusively from official
          Google channels.
        </p>
      </div>

      {/* Update monitor placeholder */}
      <Card className="border-dashed border-2">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4">
            <GlobeIcon className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">
            Update Monitor Coming Soon
          </h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            This module will automatically track Core Updates, Spam Updates, and
            Search feature changes from the official Google Search Status
            Dashboard and Search Central Blog.
          </p>
          <Badge variant="secondary" className="mt-4">
            Phase 7
          </Badge>
        </CardContent>
      </Card>

      {/* Important notice */}
      <div className="flex gap-3 rounded-lg border bg-card p-4">
        <InfoIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium">Official sources only</p>
          <p className="text-muted-foreground mt-1">
            Maxentrix SEO Platform uses only official Google sources for algorithm
            and search update information. We do not source updates from
            third-party SEO blogs, newsletters, or forums.
          </p>
        </div>
      </div>

      {/* Official Google Resources */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Official Google Resources</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {OFFICIAL_SOURCES.map((source) => (
            <a
              key={source.title}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50 cursor-pointer"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium group-hover:text-primary transition-colors">
                    {source.title}
                  </p>
                  <ExternalLinkIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {source.description}
                </p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
