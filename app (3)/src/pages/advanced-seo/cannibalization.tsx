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
import { SparklesIcon, CopyIcon, RefreshCwIcon } from "lucide-react";
import { useCurrentProject } from "@/hooks/use-current-project.tsx";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import type { CannibalizationCluster } from "@/convex/advanced_seo/actions.ts";

export default function CannibalizationPage() {
  return (
    <>
      <AuthLoading><div className="p-8"><Skeleton className="h-64 w-full" /></div></AuthLoading>
      <Unauthenticated><div className="flex justify-center p-8"><SignInButton /></div></Unauthenticated>
      <Authenticated><CannibalizationContent /></Authenticated>
    </>
  );
}

function CannibalizationContent() {
  const { activeProjectId } = useCurrentProject();
  const projects = useQuery(api.projects.list, {});
  const project = projects?.find((p) => p._id === activeProjectId);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-muted-foreground">
        <CopyIcon className="h-12 w-12 opacity-30" />
        <div className="text-lg font-medium">No project selected</div>
      </div>
    );
  }

  return <CannibalizationAnalyzer projectId={project._id} />;
}

function CannibalizationAnalyzer({ projectId }: { projectId: Id<"projects"> }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ clusters: CannibalizationCluster[]; summary: string } | null>(null);

  const analyze = useAction(api.advanced_seo.actions.analyzeCannibalization);

  async function handleAnalyze() {
    setLoading(true);
    try {
      const res = await analyze({ projectId });
      setResult(res);
    } catch (e) {
      if (e instanceof ConvexError) toast.error((e.data as { message: string }).message);
      else toast.error("Failed to detect cannibalization");
    } finally {
      setLoading(false);
    }
  }

  const RISK_CONFIG = {
    high: { bg: "border-red-500/40 bg-red-500/5", badge: "bg-red-500 text-white", label: "High Risk" },
    medium: { bg: "border-amber-500/40 bg-amber-500/5", badge: "bg-amber-500 text-white", label: "Medium Risk" },
    low: { bg: "border-blue-500/40 bg-blue-500/5", badge: "bg-blue-500 text-white", label: "Low Risk" },
  };

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">Cannibalization Detector</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Identify keywords competing with each other and hurting your rankings
          </p>
        </div>
        <Button onClick={handleAnalyze} disabled={loading}>
          {result ? <RefreshCwIcon className="h-4 w-4 mr-1.5" /> : <SparklesIcon className="h-4 w-4 mr-1.5" />}
          {loading ? "Detecting…" : result ? "Re-analyze" : "Detect Cannibalization"}
        </Button>
      </div>

      {!result && !loading && (
        <div className="rounded-xl border p-8 text-center space-y-3">
          <CopyIcon className="h-10 w-10 mx-auto text-muted-foreground/40" />
          <div className="text-sm text-muted-foreground">
            Analyze your tracked keywords to find groups that are competing against each other.
            <br />Add keywords with target URLs for the best results.
          </div>
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-36 w-full" />)}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">{result.summary}</div>

          {result.clusters.length === 0 ? (
            <div className="rounded-xl border p-8 text-center">
              <div className="text-green-600 dark:text-green-400 text-sm font-medium">✓ No significant cannibalization detected</div>
              <div className="text-xs text-muted-foreground mt-2">Your keyword strategy looks healthy</div>
            </div>
          ) : (
            result.clusters
              .sort((a, b) => b.riskScore - a.riskScore)
              .map((cluster, i) => {
                const config = RISK_CONFIG[cluster.riskLevel];
                return (
                  <div key={i} className={`rounded-xl border p-5 space-y-3 ${config.bg}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge className={`text-xs ${config.badge}`}>{config.label}</Badge>
                          <span className="text-xs text-muted-foreground">Score: {cluster.riskScore}/100</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {cluster.keywords.map((kw, j) => (
                            <Badge key={j} variant="secondary" className="text-xs">{kw}</Badge>
                          ))}
                        </div>
                        {cluster.pages.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {cluster.pages.map((page, j) => (
                              <span key={j} className="text-xs font-mono text-muted-foreground bg-muted/40 rounded px-2 py-0.5">{page}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">{cluster.reason}</div>
                    <div className="rounded-md bg-background/60 border px-3 py-2.5 text-sm">
                      <span className="font-medium text-xs uppercase tracking-wide text-muted-foreground">Recommendation: </span>
                      {cluster.recommendation}
                    </div>
                  </div>
                );
              })
          )}
        </div>
      )}
    </div>
  );
}
