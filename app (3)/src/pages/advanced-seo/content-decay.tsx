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
import { SparklesIcon, TrendingDownIcon, MinusIcon, TrendingUpIcon, RefreshCwIcon } from "lucide-react";
import { useCurrentProject } from "@/hooks/use-current-project.tsx";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import type { ContentDecayItem } from "@/convex/advanced_seo/actions.ts";

export default function ContentDecayPage() {
  return (
    <>
      <AuthLoading><div className="p-8"><Skeleton className="h-64 w-full" /></div></AuthLoading>
      <Unauthenticated><div className="flex justify-center p-8"><SignInButton /></div></Unauthenticated>
      <Authenticated><ContentDecayContent /></Authenticated>
    </>
  );
}

function ContentDecayContent() {
  const { activeProjectId } = useCurrentProject();
  const projects = useQuery(api.projects.list, {});
  const project = projects?.find((p) => p._id === activeProjectId);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-muted-foreground">
        <TrendingDownIcon className="h-12 w-12 opacity-30" />
        <div className="text-lg font-medium">No project selected</div>
      </div>
    );
  }

  return <ContentDecayAnalyzer projectId={project._id} />;
}

function ContentDecayAnalyzer({ projectId }: { projectId: Id<"projects"> }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ decaying: ContentDecayItem[]; summary: string } | null>(null);
  const [trendFilter, setTrendFilter] = useState<"all" | "declining" | "stagnant" | "recovering">("all");

  const analyze = useAction(api.advanced_seo.actions.analyzeContentDecay);

  async function handleAnalyze() {
    setLoading(true);
    try {
      const res = await analyze({ projectId });
      setResult(res);
    } catch (e) {
      if (e instanceof ConvexError) toast.error((e.data as { message: string }).message);
      else toast.error("Failed to detect content decay");
    } finally {
      setLoading(false);
    }
  }

  const TREND_CONFIG = {
    declining: { icon: TrendingDownIcon, color: "text-red-500", bg: "bg-red-500/10", badge: "bg-red-500 text-white" },
    stagnant: { icon: MinusIcon, color: "text-amber-600", bg: "bg-amber-500/10", badge: "bg-amber-500 text-white" },
    recovering: { icon: TrendingUpIcon, color: "text-green-600 dark:text-green-400", bg: "bg-green-500/10", badge: "bg-green-600 text-white" },
  };

  const filtered = result?.decaying.filter((d) => trendFilter === "all" || d.trend === trendFilter) ?? [];

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">Content Decay Detector</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Find content losing rankings over time so you can refresh it before traffic drops
          </p>
        </div>
        <Button onClick={handleAnalyze} disabled={loading}>
          {result ? <RefreshCwIcon className="h-4 w-4 mr-1.5" /> : <SparklesIcon className="h-4 w-4 mr-1.5" />}
          {loading ? "Detecting…" : result ? "Re-detect" : "Detect Content Decay"}
        </Button>
      </div>

      {!result && !loading && (
        <div className="rounded-xl border p-8 text-center space-y-3">
          <TrendingDownIcon className="h-10 w-10 mx-auto text-muted-foreground/40" />
          <div className="text-sm text-muted-foreground">
            Requires rank history data. Track keywords over time and collect snapshots to detect decay trends.
          </div>
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="text-sm text-muted-foreground">{result.summary}</div>
            <div className="flex gap-1 flex-wrap">
              {(["all", "declining", "stagnant", "recovering"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTrendFilter(t)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium border cursor-pointer capitalize ${trendFilter === t ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent/20"}`}
                >
                  {t} {t !== "all" && `(${result.decaying.filter((d) => d.trend === t).length})`}
                </button>
              ))}
            </div>
          </div>

          {result.decaying.length === 0 ? (
            <div className="rounded-xl border p-8 text-center">
              <div className="text-green-600 dark:text-green-400 text-sm font-medium">✓ No content decay detected</div>
              <div className="text-xs text-muted-foreground mt-2">Your content is holding or improving its rankings</div>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((item, i) => {
                const cfg = TREND_CONFIG[item.trend];
                const TrendIcon = cfg.icon;
                return (
                  <div key={i} className={`rounded-xl border p-4 space-y-2 ${cfg.bg}`}>
                    <div className="flex items-start gap-3">
                      <TrendIcon className={`h-5 w-5 mt-0.5 shrink-0 ${cfg.color}`} />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{item.keyword}</span>
                          <Badge className={`text-xs ${cfg.badge} capitalize`}>{item.trend}</Badge>
                          <span className="text-xs text-muted-foreground">Decay score: {item.decayScore}/100</span>
                        </div>
                        {item.targetUrl && (
                          <div className="text-xs font-mono text-muted-foreground truncate">{item.targetUrl}</div>
                        )}

                        {/* Position trend */}
                        <div className="flex items-center gap-4 mt-1.5">
                          {[
                            { label: "Now", val: item.positionNow },
                            { label: "30d ago", val: item.position30d },
                            { label: "60d ago", val: item.position60d },
                          ].map(({ label, val }) => (
                            <div key={label} className="text-center">
                              <div className="text-xs text-muted-foreground">{label}</div>
                              <div className="text-sm font-bold tabular-nums">#{val}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="rounded-md bg-background/60 border px-3 py-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Action: </span>{item.recommendation}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
