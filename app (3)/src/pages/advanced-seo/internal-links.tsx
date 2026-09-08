import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { SignInButton } from "@/components/ui/signin.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { SparklesIcon, LinkIcon, AlertCircleIcon, RefreshCwIcon } from "lucide-react";
import { useCurrentProject } from "@/hooks/use-current-project.tsx";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import type { InternalLinkRecommendation } from "@/convex/advanced_seo/actions.ts";

export default function InternalLinksPage() {
  return (
    <>
      <AuthLoading><div className="p-8"><Skeleton className="h-64 w-full" /></div></AuthLoading>
      <Unauthenticated><div className="flex justify-center p-8"><SignInButton /></div></Unauthenticated>
      <Authenticated><InternalLinksContent /></Authenticated>
    </>
  );
}

function InternalLinksContent() {
  const { activeProjectId } = useCurrentProject();
  const projects = useQuery(api.projects.list, {});
  const project = projects?.find((p) => p._id === activeProjectId);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-muted-foreground">
        <LinkIcon className="h-12 w-12 opacity-30" />
        <div className="text-lg font-medium">No project selected</div>
      </div>
    );
  }

  return <InternalLinksAnalyzer projectId={project._id} />;
}

function InternalLinksAnalyzer({ projectId }: { projectId: Id<"projects"> }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ recommendations: InternalLinkRecommendation[]; orphanPages: string[]; summary: string } | null>(null);
  const [filter, setFilter] = useState<"all" | "high" | "medium" | "low">("all");

  const analyzeLinks = useAction(api.advanced_seo.actions.analyzeInternalLinks);

  async function handleAnalyze() {
    setLoading(true);
    try {
      const res = await analyzeLinks({ projectId });
      setResult(res);
    } catch (e) {
      if (e instanceof ConvexError) toast.error((e.data as { message: string }).message);
      else toast.error("Failed to analyze internal links");
    } finally {
      setLoading(false);
    }
  }

  const PRIORITY_COLORS = { high: "text-red-500", medium: "text-amber-600", low: "text-blue-500" };

  const filtered = result?.recommendations.filter(
    (r) => filter === "all" || r.priority === filter
  ) ?? [];

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">Internal Linking Engine</h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI-powered internal link recommendations based on your crawled pages
          </p>
        </div>
        <Button onClick={handleAnalyze} disabled={loading}>
          {result ? <RefreshCwIcon className="h-4 w-4 mr-1.5" /> : <SparklesIcon className="h-4 w-4 mr-1.5" />}
          {loading ? "Analyzing…" : result ? "Re-analyze" : "Analyze Links"}
        </Button>
      </div>

      {!result && !loading && (
        <div className="rounded-xl border p-8 text-center space-y-3">
          <LinkIcon className="h-10 w-10 mx-auto text-muted-foreground/40" />
          <div className="text-sm text-muted-foreground">
            Run a site audit first to crawl your pages, then click Analyze to get AI link recommendations.
          </div>
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      )}

      {result && (
        <div className="space-y-5">
          <div className="text-sm text-muted-foreground">{result.summary}</div>

          {/* Orphan pages */}
          {result.orphanPages.length > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400 mb-2">
                <AlertCircleIcon className="h-4 w-4" />
                Orphan Pages — No internal links pointing to these ({result.orphanPages.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {result.orphanPages.map((url, i) => (
                  <Badge key={i} variant="outline" className="text-xs font-mono">{url}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Filter */}
          <div className="flex gap-2">
            {(["all", "high", "medium", "low"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer capitalize ${filter === f ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent/20"}`}
              >
                {f}
                {f !== "all" && ` (${result.recommendations.filter((r) => r.priority === f).length})`}
              </button>
            ))}
          </div>

          {/* Recommendations */}
          <div className="space-y-3">
            {filtered.map((rec, i) => (
              <div key={i} className="rounded-xl border p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="text-xs text-muted-foreground font-mono truncate">{rec.sourcePage}</div>
                    <div className="flex items-center gap-2 text-sm">
                      <LinkIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="font-medium truncate">{rec.targetTitle || rec.targetPage}</span>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono truncate">{rec.targetPage}</div>
                  </div>
                  <Badge
                    variant="secondary"
                    className={`shrink-0 text-xs capitalize ${PRIORITY_COLORS[rec.priority]}`}
                  >
                    {rec.priority}
                  </Badge>
                </div>
                <div className="rounded-md bg-muted/40 px-3 py-1.5 text-xs">
                  Anchor: <span className="font-medium text-primary">"{rec.anchorText}"</span>
                </div>
                <div className="text-xs text-muted-foreground">{rec.reason}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
