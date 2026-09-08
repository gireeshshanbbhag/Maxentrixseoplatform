import { useState, useEffect, useRef } from "react";
import { useAction, useQuery } from "convex/react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useCurrentProject } from "@/hooks/use-current-project.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { GaugeIcon, SmartphoneIcon, MonitorIcon, RefreshCwIcon, ZapIcon, AlertTriangleIcon, Loader2Icon } from "lucide-react";
import type { PageSpeedResult, CwvMetric } from "@/convex/pagespeed/actions.ts";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

// ── localStorage helpers ──────────────────────────────────────────────────
function runningKey(projectId: string) { return `psi-running-${projectId}`; }
function setRunning(projectId: string, running: boolean) {
  try {
    if (running) localStorage.setItem(runningKey(projectId), "1");
    else localStorage.removeItem(runningKey(projectId));
  } catch { /* ignore */ }
}
function isRunning(projectId: string) {
  try { return localStorage.getItem(runningKey(projectId)) === "1"; } catch { return false; }
}

// ── Score helpers ─────────────────────────────────────────────────────────
const CWV_COLORS = {
  good: "text-green-600 dark:text-green-400",
  "needs-improvement": "text-amber-600 dark:text-amber-400",
  poor: "text-red-500",
};
const SCORE_COLORS = { good: "bg-green-500", "needs-improvement": "bg-amber-500", poor: "bg-red-500" };

function scoreCategory(score: number | null): "good" | "needs-improvement" | "poor" {
  if (score === null) return "poor";
  if (score >= 90) return "good";
  if (score >= 50) return "needs-improvement";
  return "poor";
}
function metricCategory(id: string, numericValue?: number): "good" | "needs-improvement" | "poor" {
  if (!numericValue) return "good";
  const thresholds: Record<string, [number, number]> = {
    "largest-contentful-paint": [2500, 4000],
    "first-contentful-paint": [1800, 3000],
    "total-blocking-time": [200, 600],
    "cumulative-layout-shift": [0.1, 0.25],
    "speed-index": [3400, 5800],
    "interactive": [3800, 7300],
  };
  const t = thresholds[id];
  if (!t) return "good";
  if (numericValue <= t[0]) return "good";
  if (numericValue <= t[1]) return "needs-improvement";
  return "poor";
}

function ScoreRing({ score }: { score: number | null }) {
  const cat = scoreCategory(score);
  const color = cat === "good" ? "#22c55e" : cat === "needs-improvement" ? "#f59e0b" : "#ef4444";
  const pct = score ?? 0;
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="relative flex items-center justify-center">
      <svg width={100} height={100} className="-rotate-90">
        <circle cx={50} cy={50} r={r} fill="none" stroke="var(--border)" strokeWidth={8} />
        <circle cx={50} cy={50} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-bold tabular-nums" style={{ color }}>{score ?? "—"}</div>
        <div className="text-[10px] text-muted-foreground uppercase">Score</div>
      </div>
    </div>
  );
}

function MetricCard({ metric }: { metric: CwvMetric }) {
  const cat = metric.score !== null ? metricCategory(metric.id, metric.numericValue) : "poor";
  return (
    <div className="rounded-xl border p-4">
      <div className="text-xs text-muted-foreground font-medium mb-1">{metric.title}</div>
      <div className={`text-xl font-bold tabular-nums ${CWV_COLORS[cat]}`}>{metric.displayValue || "—"}</div>
      <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${SCORE_COLORS[cat]}`}
          style={{ width: `${(metric.score ?? 0) * 100}%` }} />
      </div>
    </div>
  );
}

function ResultPanel({ result }: { result: PageSpeedResult }) {
  const cat = scoreCategory(result.performanceScore);
  return (
    <div className="space-y-6">
      <div className="rounded-xl border p-6 flex flex-col sm:flex-row items-center gap-6">
        <ScoreRing score={result.performanceScore} />
        <div className="flex-1 text-center sm:text-left">
          <div className="font-semibold text-lg">Performance Score</div>
          <div className={`text-sm font-medium mt-0.5 ${CWV_COLORS[cat]}`}>
            {cat === "good" ? "Good" : cat === "needs-improvement" ? "Needs Improvement" : "Poor"}
          </div>
          <div className="text-xs text-muted-foreground mt-1 truncate">{result.url}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {result.strategy === "mobile" ? "Mobile" : "Desktop"} · Analyzed {new Date(result.fetchedAt).toLocaleString()}
          </div>
        </div>
      </div>
      <div>
        <div className="text-sm font-semibold mb-3">Core Web Vitals</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {result.metrics.map((m) => <MetricCard key={m.id} metric={m} />)}
        </div>
      </div>
      {result.opportunities.length > 0 && (
        <div>
          <div className="text-sm font-semibold mb-3 flex items-center gap-2">
            <ZapIcon className="h-4 w-4 text-amber-500" />Opportunities to improve
          </div>
          <div className="rounded-xl border divide-y overflow-hidden">
            {result.opportunities.map((opp) => (
              <div key={opp.id} className="px-4 py-3 flex items-start gap-3">
                <AlertTriangleIcon className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{opp.title}</div>
                  {opp.displayValue && (
                    <div className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-0.5">{opp.displayValue}</div>
                  )}
                </div>
                {opp.savings && (
                  <div className="text-xs text-muted-foreground shrink-0">~{(opp.savings / 1000).toFixed(1)}s savings</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main content ──────────────────────────────────────────────────────────

function PerformanceContent() {
  const { activeProjectId } = useCurrentProject();
  const projects = useQuery(api.projects.list, {});
  const project = projects?.find((p) => p._id === activeProjectId);

  const [url, setUrl] = useState("");
  const [urlEdited, setUrlEdited] = useState(false);
  const [activeTab, setActiveTab] = useState<"mobile" | "desktop">("mobile");
  const [running, setRunningState] = useState(false);
  const runningRef = useRef(false);

  const runPageSpeed = useAction(api.pagespeed.actions.runPageSpeed);

  // Subscribe reactively to cached results for this project
  const cachedResults = useQuery(
    api.pagespeed.queries.getProjectResults,
    activeProjectId ? { projectId: activeProjectId } : "skip"
  );

  // Derive mobile/desktop results from cache
  const mobileCache = cachedResults?.find((r) => r.strategy === "mobile");
  const desktopCache = cachedResults?.find((r) => r.strategy === "desktop");
  const mobileResult: PageSpeedResult | null = mobileCache ? JSON.parse(mobileCache.data) as PageSpeedResult : null;
  const desktopResult: PageSpeedResult | null = desktopCache ? JSON.parse(desktopCache.data) as PageSpeedResult : null;

  // Sync URL from project (once only, unless user edits)
  useEffect(() => {
    if (project && !urlEdited) setUrl(project.websiteUrl);
  }, [project?._id]);

  // On project load: check localStorage running state + auto-trigger if cache is stale/empty
  useEffect(() => {
    if (!activeProjectId || !project || cachedResults === undefined) return;

    // Restore running indicator from localStorage (user navigated away mid-run)
    if (isRunning(activeProjectId)) {
      setRunningState(true);
      runningRef.current = true;
    }

    // If cache is empty or all results older than 24h, auto-trigger
    const now = Date.now();
    const STALE_MS = 24 * 60 * 60 * 1000;
    const allFresh = cachedResults.length >= 2 &&
      cachedResults.every((r) => now - new Date(r.fetchedAt).getTime() < STALE_MS);

    if (!allFresh && !runningRef.current) {
      triggerBoth(project._id, project.websiteUrl, false);
    }
  }, [activeProjectId, cachedResults !== undefined]);

  // When results come in while running, clear the running state
  useEffect(() => {
    if (!activeProjectId || !runningRef.current) return;
    if (mobileResult && desktopResult) {
      setRunningState(false);
      runningRef.current = false;
      setRunning(activeProjectId, false);
    }
  }, [mobileResult?.fetchedAt, desktopResult?.fetchedAt]);

  function handleError(e: unknown) {
    if (e instanceof ConvexError) {
      const msg = (e.data as { message: string }).message;
      if (msg.includes("429") || msg.includes("Quota") || msg.includes("rateLimitExceeded")) {
        toast.error("PageSpeed API quota exceeded", {
          description: "Add a PAGESPEED_API_KEY secret (Advanced → Secrets) to use a higher quota.",
          duration: 8000,
        });
      } else {
        toast.error(msg);
      }
    } else {
      toast.error("PageSpeed analysis failed");
    }
  }

  async function triggerBoth(projectId: Id<"projects">, targetUrl: string, showToast: boolean) {
    if (runningRef.current) return;
    runningRef.current = true;
    setRunningState(true);
    setRunning(projectId, true);
    if (showToast) toast.info("Analysis started — runs in the background. You can navigate away.");

    try {
      await Promise.all([
        runPageSpeed({ projectId, url: targetUrl.trim(), strategy: "mobile", forceRefresh: true }),
        runPageSpeed({ projectId, url: targetUrl.trim(), strategy: "desktop", forceRefresh: true }),
      ]);
    } catch (e) {
      handleError(e);
    } finally {
      runningRef.current = false;
      setRunningState(false);
      setRunning(projectId, false);
    }
  }

  async function handleRefresh() {
    if (!project || !url.trim()) return;
    await triggerBoth(project._id, url, true);
  }

  if (projects === undefined) {
    return <div className="p-6 space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!project) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <GaugeIcon className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-semibold">No project selected</h3>
        <p className="text-sm text-muted-foreground mt-1">Select a project to run PageSpeed analysis.</p>
      </div>
    );
  }

  const hasAnyResult = mobileResult || desktopResult;
  const activeResult = activeTab === "mobile" ? mobileResult : desktopResult;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Performance & Core Web Vitals</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Google PageSpeed Insights — results persist and update in the background
          </p>
        </div>
        {running && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted rounded-lg px-3 py-2 shrink-0">
            <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
            Analyzing…
          </div>
        )}
      </div>

      {/* URL + refresh */}
      <div className="rounded-xl border p-4 space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="https://example.com"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setUrlEdited(true); }}
            onKeyDown={(e) => e.key === "Enter" && handleRefresh()}
            className="flex-1"
          />
          <Button onClick={handleRefresh} disabled={running || !url.trim()} className="cursor-pointer shrink-0">
            {running
              ? <><Loader2Icon className="h-4 w-4 animate-spin mr-1.5" />Analyzing</>
              : <><RefreshCwIcon className="h-4 w-4 mr-1.5" />Re-analyze</>}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Analysis runs automatically and persists for 24 hours. Navigate away freely — results will appear here when ready.
        </p>
      </div>

      {/* Strategy tabs — only when results exist */}
      {hasAnyResult && (
        <div className="flex gap-1 rounded-lg border p-1 w-fit bg-muted">
          {(["mobile", "desktop"] as const).map((s) => {
            const r = s === "mobile" ? mobileResult : desktopResult;
            const cat = r ? scoreCategory(r.performanceScore) : null;
            const color = cat === "good" ? "text-green-600" : cat === "needs-improvement" ? "text-amber-600" : cat === "poor" ? "text-red-500" : "text-muted-foreground";
            return (
              <button key={s} onClick={() => setActiveTab(s)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${activeTab === s ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                {s === "mobile" ? <SmartphoneIcon className="h-3.5 w-3.5" /> : <MonitorIcon className="h-3.5 w-3.5" />}
                {s === "mobile" ? "Mobile" : "Desktop"}
                {r ? (
                  <span className={`text-xs font-bold ${color}`}>{r.performanceScore}</span>
                ) : running ? (
                  <Loader2Icon className="h-3 w-3 animate-spin text-muted-foreground" />
                ) : null}
              </button>
            );
          })}
        </div>
      )}

      {/* Loading skeletons while first run in progress */}
      {running && !hasAnyResult && (
        <div className="space-y-4">
          <div className="rounded-xl border p-6 flex items-center gap-4">
            <Skeleton className="h-[100px] w-[100px] rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-64" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[1,2,3,4,5,6].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        </div>
      )}

      {/* Active result */}
      {activeResult && <ResultPanel result={activeResult} />}

      {/* Stale tab placeholder: result not yet ready for this strategy */}
      {!activeResult && hasAnyResult && running && (
        <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
          <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Analyzing {activeTab} performance…</p>
        </div>
      )}

      {/* Empty state — only shown when not running and no cache */}
      {!running && !hasAnyResult && cachedResults !== undefined && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <GaugeIcon className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">Starting analysis…</p>
          <p className="text-xs text-muted-foreground mt-1">Results are cached for 24 hours per URL.</p>
        </div>
      )}
    </div>
  );
}

export default function PerformancePage() {
  return (
    <>
      <AuthLoading><div className="p-6"><Skeleton className="h-40 w-full" /></div></AuthLoading>
      <Unauthenticated><div className="p-6 text-center"><SignInButton /></div></Unauthenticated>
      <Authenticated><PerformanceContent /></Authenticated>
    </>
  );
}
