import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { SignInButton } from "@/components/ui/signin.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { SparklesIcon } from "lucide-react";
import type { EntityItem } from "@/convex/advanced_seo/actions.ts";

export default function EntitySeoPage() {
  return (
    <>
      <AuthLoading><div className="p-8"><Skeleton className="h-64 w-full" /></div></AuthLoading>
      <Unauthenticated><div className="flex justify-center p-8"><SignInButton /></div></Unauthenticated>
      <Authenticated><EntitySeoContent /></Authenticated>
    </>
  );
}

function EntitySeoContent() {
  const [content, setContent] = useState("");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    entities: EntityItem[];
    missingEntities: string[];
    recommendations: string[];
    entityCoverageScore: number;
  } | null>(null);

  const analyze = useAction(api.advanced_seo.actions.analyzeEntitySeo);

  async function handleAnalyze() {
    if (!content.trim()) { toast.error("Paste content to analyze"); return; }
    setLoading(true);
    try {
      const res = await analyze({ content, targetKeyword: keyword || undefined });
      setResult(res);
    } catch (e) {
      if (e instanceof ConvexError) toast.error((e.data as { message: string }).message);
      else toast.error("Failed to analyze entities");
    } finally {
      setLoading(false);
    }
  }

  const ENTITY_TYPE_COLORS: Record<string, string> = {
    Person: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
    Organization: "bg-purple-500/20 text-purple-600 dark:text-purple-400",
    Place: "bg-green-500/20 text-green-600 dark:text-green-400",
    Product: "bg-orange-500/20 text-orange-600 dark:text-orange-400",
    Concept: "bg-muted text-muted-foreground",
  };

  const scoreColor = result
    ? result.entityCoverageScore >= 70
      ? "text-green-600 dark:text-green-400"
      : result.entityCoverageScore >= 50
        ? "text-amber-600"
        : "text-red-500"
    : "";

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold">Entity SEO Intelligence</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Analyze entity coverage for Knowledge Graph and semantic search optimization
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <Label className="text-xs font-medium">Content to Analyze</Label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste your page content here…"
            className="mt-1 min-h-[160px] font-mono text-sm"
          />
        </div>
        <div className="space-y-3">
          <div>
            <Label className="text-xs font-medium">Target Keyword (optional)</Label>
            <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} className="mt-1 text-sm" placeholder="main keyword" />
          </div>
          <Button onClick={handleAnalyze} disabled={loading || !content.trim()} className="w-full">
            <SparklesIcon className="h-4 w-4 mr-1.5" />
            {loading ? "Analyzing…" : "Analyze Entities"}
          </Button>
        </div>
      </div>

      {loading && <div className="space-y-3">{[1,2,3].map((i)=><Skeleton key={i} className="h-32"/>)}</div>}

      {result && (
        <div className="space-y-5">
          {/* Score */}
          <div className="rounded-xl border p-4 flex items-center gap-6">
            <div>
              <div className={`text-4xl font-bold tabular-nums ${scoreColor}`}>{result.entityCoverageScore}</div>
              <div className="text-xs text-muted-foreground">Entity Coverage Score</div>
            </div>
            <div className="flex-1">
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${result.entityCoverageScore >= 70 ? "bg-green-500" : result.entityCoverageScore >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                  style={{ width: `${result.entityCoverageScore}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground mt-1">{result.entities.length} entities found · {result.missingEntities.length} missing</div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Found entities */}
            <div className="rounded-xl border p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Entities Found</div>
              <div className="space-y-2">
                {result.entities.map((entity, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{entity.name}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${ENTITY_TYPE_COLORS[entity.type] ?? "bg-muted text-muted-foreground"}`}>
                          {entity.type}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{entity.description}</div>
                    </div>
                    <div className="text-xs font-medium text-muted-foreground shrink-0">{entity.salience}%</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {/* Missing entities */}
              <div className="rounded-xl border p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Missing Entities</div>
                {result.missingEntities.length === 0 ? (
                  <div className="text-xs text-green-600 dark:text-green-400">No missing entities detected ✓</div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {result.missingEntities.map((e, i) => (
                      <Badge key={i} variant="outline" className="text-xs border-amber-500/50 text-amber-600">{e}</Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Recommendations */}
              <div className="rounded-xl border p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Recommendations</div>
                <ul className="space-y-2">
                  {result.recommendations.map((rec, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      {rec}
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
