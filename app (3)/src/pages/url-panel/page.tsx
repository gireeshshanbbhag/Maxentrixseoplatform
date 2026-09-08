import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { SignInButton } from "@/components/ui/signin.tsx";
import {
  GlobeIcon, ZapIcon, CheckCircle2Icon, XCircleIcon,
  TrendingUpIcon, AlertTriangleIcon, ClipboardCopyIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";

type AnalysisResult = {
  score: number;
  grade: string;
  quickWins: Array<{ title: string; impact: "high" | "medium" | "low"; type: string }>;
  optimizedTitle: string;
  optimizedMeta: string;
  recommendations: string[];
  technicalChecks: Array<{ label: string; pass: boolean; note: string }>;
};

export default function UrlSeoPanel() {
  return (
    <>
      <AuthLoading><div className="p-8"><Skeleton className="h-64 w-full" /></div></AuthLoading>
      <Unauthenticated><div className="flex justify-center p-8"><SignInButton /></div></Unauthenticated>
      <Authenticated><UrlPanelContent /></Authenticated>
    </>
  );
}

function UrlPanelContent() {
  const analyzeUrl = useAction(api.url_panel.actions.analyzeUrl);

  const [url, setUrl] = useState("");
  const [keyword, setKeyword] = useState("");
  const [title, setTitle] = useState("");
  const [meta, setMeta] = useState("");
  const [h1, setH1] = useState("");
  const [wordCount, setWordCount] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  async function analyze() {
    if (!url) { toast.error("Enter a URL first"); return; }
    setLoading(true);
    setResult(null);
    try {
      const res = await analyzeUrl({
        url,
        keyword: keyword || undefined,
        title: title || undefined,
        metaDescription: meta || undefined,
        h1: h1 || undefined,
        wordCount: wordCount ? Number(wordCount) : undefined,
      });
      setResult(res);
    } catch {
      toast.error("Analysis failed — check your input and try again");
    } finally {
      setLoading(false);
    }
  }

  const impactColors = {
    high: "text-red-600 bg-red-500/10 border-red-500/20",
    medium: "text-amber-600 bg-amber-500/10 border-amber-500/20",
    low: "text-blue-600 bg-blue-500/10 border-blue-500/20",
  };

  const gradeColors: Record<string, string> = {
    A: "text-green-600", B: "text-teal-600", C: "text-amber-600", D: "text-orange-600", F: "text-red-600",
  };

  return (
    <div className="p-6 max-w-4xl space-y-5">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <GlobeIcon className="h-5 w-5 text-primary" />URL SEO Panel
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Consolidated on-page SEO analysis with AI-powered quick wins and optimized suggestions
        </p>
      </div>

      {/* Input form */}
      <div className="rounded-xl border p-5 space-y-4">
        <div className="text-sm font-semibold">Page Details</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">URL <span className="text-red-500">*</span></label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/page" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Target Keyword</label>
            <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="best running shoes" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Word Count</label>
            <Input type="number" value={wordCount} onChange={(e) => setWordCount(e.target.value)} placeholder="1200" />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Current Title Tag</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Best Running Shoes 2024 | BrandName" />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Current Meta Description</label>
            <Input value={meta} onChange={(e) => setMeta(e.target.value)} placeholder="Discover the best running shoes..." />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">H1 Tag</label>
            <Input value={h1} onChange={(e) => setH1(e.target.value)} placeholder="The Best Running Shoes for Every Runner" />
          </div>
        </div>
        <Button onClick={analyze} disabled={loading || !url} className="w-full sm:w-auto">
          <ZapIcon className="h-4 w-4 mr-1.5" />
          {loading ? "Analyzing…" : "Analyze Page"}
        </Button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-4">
          {/* Score header */}
          <div className="rounded-xl border p-5 flex items-center gap-6">
            <div className="text-center">
              <div className={`text-5xl font-black tabular-nums ${gradeColors[result.grade] ?? "text-foreground"}`}>{result.grade}</div>
              <div className="text-xs text-muted-foreground mt-1">Grade</div>
            </div>
            <div>
              <div className="text-3xl font-bold tabular-nums">{result.score}<span className="text-lg text-muted-foreground font-normal">/100</span></div>
              <div className="text-xs text-muted-foreground mt-1">SEO Score</div>
              {/* Score bar */}
              <div className="w-48 h-2 bg-muted/50 rounded-full mt-2 overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", result.score >= 80 ? "bg-green-500" : result.score >= 60 ? "bg-amber-500" : "bg-red-500")}
                  style={{ width: `${result.score}%` }}
                />
              </div>
            </div>
          </div>

          {/* Quick wins */}
          <div className="rounded-xl border p-5 space-y-3">
            <div className="text-sm font-semibold flex items-center gap-2">
              <TrendingUpIcon className="h-4 w-4 text-primary" />Quick Wins
            </div>
            <div className="space-y-2">
              {result.quickWins.map((w, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/20">
                  <span className={`text-[10px] font-semibold border rounded px-1.5 py-0.5 shrink-0 mt-0.5 ${impactColors[w.impact]}`}>{w.impact.toUpperCase()}</span>
                  <div>
                    <div className="text-sm">{w.title}</div>
                    <div className="text-xs text-muted-foreground">{w.type}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Optimized suggestions */}
          <div className="rounded-xl border p-5 space-y-4">
            <div className="text-sm font-semibold flex items-center gap-2">
              <ZapIcon className="h-4 w-4 text-primary" />AI-Optimized Suggestions
            </div>
            <OptimizedField label="Optimized Title Tag" value={result.optimizedTitle} charTarget={60} />
            <OptimizedField label="Optimized Meta Description" value={result.optimizedMeta} charTarget={155} />
          </div>

          {/* Technical checks */}
          <div className="rounded-xl border p-5 space-y-3">
            <div className="text-sm font-semibold">Technical Checks</div>
            <div className="space-y-2">
              {result.technicalChecks.map((c, i) => (
                <div key={i} className="flex items-start gap-3">
                  {c.pass
                    ? <CheckCircle2Icon className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    : <XCircleIcon className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />}
                  <div>
                    <div className="text-sm font-medium">{c.label}</div>
                    <div className="text-xs text-muted-foreground">{c.note}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div className="rounded-xl border p-5 space-y-3">
            <div className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangleIcon className="h-4 w-4 text-amber-500" />Recommendations
            </div>
            <ul className="space-y-2">
              {result.recommendations.map((r, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="text-muted-foreground shrink-0 tabular-nums">{i + 1}.</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function OptimizedField({ label, value, charTarget }: { label: string; value: string; charTarget: number }) {
  const len = value.length;
  const inRange = len >= charTarget - 15 && len <= charTarget + 15;

  function copy() {
    navigator.clipboard.writeText(value);
    toast.success("Copied to clipboard");
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        <div className="flex items-center gap-2">
          <span className={`text-xs tabular-nums ${inRange ? "text-green-600" : "text-amber-600"}`}>{len} chars</span>
          <Button size="icon" variant="ghost" className="h-6 w-6 cursor-pointer" onClick={copy}>
            <ClipboardCopyIcon className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <div className="rounded-lg bg-muted/30 border px-3 py-2 text-sm">{value}</div>
    </div>
  );
}
