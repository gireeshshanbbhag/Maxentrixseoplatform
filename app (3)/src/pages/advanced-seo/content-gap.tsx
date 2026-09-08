import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { SignInButton } from "@/components/ui/signin.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { SparklesIcon, SearchIcon, RefreshCwIcon } from "lucide-react";
import { useCurrentProject } from "@/hooks/use-current-project.tsx";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import type { ContentGap } from "@/convex/advanced_seo/actions.ts";

export default function ContentGapPage() {
  return (
    <>
      <AuthLoading><div className="p-8"><Skeleton className="h-64 w-full" /></div></AuthLoading>
      <Unauthenticated><div className="flex justify-center p-8"><SignInButton /></div></Unauthenticated>
      <Authenticated><ContentGapContent /></Authenticated>
    </>
  );
}

function ContentGapContent() {
  const { activeProjectId } = useCurrentProject();
  const projects = useQuery(api.projects.list, {});
  const project = projects?.find((p) => p._id === activeProjectId);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-muted-foreground">
        <SearchIcon className="h-12 w-12 opacity-30" />
        <div className="text-lg font-medium">No project selected</div>
      </div>
    );
  }

  return <ContentGapAnalyzer projectId={project._id} niche={project.businessCategory ?? ""} />;
}

function ContentGapAnalyzer({ projectId, niche: defaultNiche }: { projectId: Id<"projects">; niche: string }) {
  const [loading, setLoading] = useState(false);
  const [niche, setNiche] = useState(defaultNiche);
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [result, setResult] = useState<{ gaps: ContentGap[]; summary: string } | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<"all" | "high" | "medium" | "low">("all");

  const analyze = useAction(api.advanced_seo.actions.analyzeContentGap);

  async function handleAnalyze() {
    setLoading(true);
    try {
      const res = await analyze({
        projectId,
        niche: niche || undefined,
        competitorUrl: competitorUrl || undefined,
      });
      setResult(res);
    } catch (e) {
      if (e instanceof ConvexError) toast.error((e.data as { message: string }).message);
      else toast.error("Failed to analyze content gap");
    } finally {
      setLoading(false);
    }
  }

  const PRIORITY_BADGE: Record<string, string> = {
    high: "bg-red-500 text-white",
    medium: "bg-amber-500 text-white",
    low: "bg-blue-500 text-white",
  };

  const filtered = result?.gaps.filter((g) => priorityFilter === "all" || g.priority === priorityFilter) ?? [];

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold">Content Gap Analyzer</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Discover high-opportunity topics your site is not yet covering
        </p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Label className="text-xs font-medium">Industry / Niche</Label>
          <Input value={niche} onChange={(e) => setNiche(e.target.value)} className="mt-1 text-sm" placeholder="e.g. SaaS CRM software" />
        </div>
        <div className="flex-1 min-w-[200px]">
          <Label className="text-xs font-medium">Competitor URL (optional)</Label>
          <Input value={competitorUrl} onChange={(e) => setCompetitorUrl(e.target.value)} className="mt-1 text-sm" placeholder="https://competitor.com" />
        </div>
        <div className="flex items-end">
          <Button onClick={handleAnalyze} disabled={loading}>
            {result ? <RefreshCwIcon className="h-4 w-4 mr-1.5" /> : <SparklesIcon className="h-4 w-4 mr-1.5" />}
            {loading ? "Analyzing…" : result ? "Re-analyze" : "Find Content Gaps"}
          </Button>
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="text-sm text-muted-foreground">{result.summary}</div>
            <div className="flex gap-1">
              {(["all", "high", "medium", "low"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriorityFilter(p)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium border cursor-pointer capitalize ${priorityFilter === p ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent/20"}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3">
            {filtered.map((gap, i) => (
              <div key={i} className="rounded-xl border p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{gap.topic}</span>
                      <Badge className={`text-xs ${PRIORITY_BADGE[gap.priority] ?? ""}`}>{gap.priority}</Badge>
                    </div>
                    <div className="text-xs font-mono text-primary mt-0.5">🎯 {gap.suggestedKeyword}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-muted-foreground">Volume</div>
                    <div className="text-xs font-medium">{gap.estimatedVolume}</div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{gap.opportunity}</p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Suggested type:</span>
                  <Badge variant="outline">{gap.contentType}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
