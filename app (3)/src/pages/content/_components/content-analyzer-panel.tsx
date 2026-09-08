import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { SparklesIcon, CheckCircleIcon, AlertTriangleIcon, XCircleIcon } from "lucide-react";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import type { ContentAnalysis } from "@/convex/content/actions.ts";

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = value >= 70 ? "bg-green-500" : value >= 50 ? "bg-amber-500" : "bg-red-500";
  const textColor = value >= 70 ? "text-green-600 dark:text-green-400" : value >= 50 ? "text-amber-600" : "text-red-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-semibold ${textColor}`}>{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function ContentAnalyzerPanel({ project }: { project: Doc<"projects"> }) {
  const [content, setContent] = useState("");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<ContentAnalysis | null>(null);

  const analyzeContent = useAction(api.content.actions.analyzeContent);

  async function handleAnalyze() {
    if (!content.trim()) { toast.error("Paste some content to analyze"); return; }
    setLoading(true);
    try {
      const result = await analyzeContent({ content, keyword: keyword || undefined });
      setAnalysis(result);
    } catch (e) {
      if (e instanceof ConvexError) toast.error((e.data as { message: string }).message);
      else toast.error("Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div>
        <h2 className="text-xl font-bold">Content Analyzer</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Paste any content to get a Google People-First quality check with E-E-A-T scoring and actionable improvements.
        </p>
      </div>

      <div className="grid md:grid-cols-4 gap-3">
        <div className="md:col-span-3">
          <Label className="text-xs font-medium">Content to Analyze</Label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste your content here…"
            className="mt-1 min-h-[200px] font-mono text-sm"
          />
        </div>
        <div className="space-y-3">
          <div>
            <Label className="text-xs font-medium">Target Keyword (optional)</Label>
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="keyword"
              className="mt-1 text-sm"
            />
          </div>
          <Button
            onClick={handleAnalyze}
            disabled={loading || !content.trim()}
            className="w-full"
          >
            <SparklesIcon className="h-4 w-4 mr-1.5" />
            {loading ? "Analyzing…" : "Analyze Content"}
          </Button>
          {content && (
            <div className="text-xs text-muted-foreground text-center">
              {content.split(/\s+/).filter(Boolean).length} words
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="grid md:grid-cols-2 gap-4">
          {[1,2,3,4].map((i) => <Skeleton key={i} className="h-48" />)}
        </div>
      )}

      {analysis && (
        <div className="space-y-5">
          {/* Score overview */}
          <div className="rounded-xl border p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-3xl font-bold tabular-nums">{analysis.overallScore}</div>
                <div className="text-sm text-muted-foreground">Overall Score</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{analysis.wordCount.toLocaleString()} words</div>
                <div className="text-xs text-muted-foreground">{analysis.keywordDensity.toFixed(1)}% keyword density</div>
              </div>
            </div>
            <div className="space-y-3">
              <ScoreBar label="People-First" value={analysis.peopleFirstScore} />
              <ScoreBar label="E-E-A-T (Expertise, Experience, Authority, Trust)" value={analysis.eeatScore} />
              <ScoreBar label="SEO" value={analysis.seoScore} />
              <ScoreBar label="Readability" value={analysis.readabilityScore} />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {/* Passed checks */}
            <div className="rounded-xl border p-4">
              <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-green-600 dark:text-green-400">
                <CheckCircleIcon className="h-4 w-4" />Passed
              </div>
              <ul className="space-y-2">
                {[...analysis.passedChecks, ...analysis.strengths].slice(0,8).map((item, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <div className="mt-1 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Suggestions */}
            <div className="rounded-xl border p-4">
              <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-amber-600">
                <AlertTriangleIcon className="h-4 w-4" />Improvements
              </div>
              <ul className="space-y-2">
                {analysis.suggestions.map((item, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <div className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* People-first flags */}
            <div className="rounded-xl border p-4">
              <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-red-500">
                <XCircleIcon className="h-4 w-4" />People-First Flags
              </div>
              {analysis.peopleFirstFlags.length === 0 ? (
                <p className="text-xs text-green-600 dark:text-green-400">No issues detected ✓</p>
              ) : (
                <ul className="space-y-2">
                  {analysis.peopleFirstFlags.map((item, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <div className="mt-1 h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 pt-3 border-t">
                <div className="text-xs font-medium text-muted-foreground mb-1.5">Weaknesses</div>
                <ul className="space-y-1.5">
                  {analysis.weaknesses.map((item, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <div className="mt-1 h-1.5 w-1.5 rounded-full bg-muted-foreground shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
