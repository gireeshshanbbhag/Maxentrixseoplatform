import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { SignInButton } from "@/components/ui/signin.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import {
  MessageSquareIcon, SparklesIcon, CheckCircleIcon, AlertTriangleIcon,
  CopyIcon, CheckIcon,
} from "lucide-react";
import { useCurrentProject } from "@/hooks/use-current-project.tsx";
import type { AeoResult } from "@/convex/local_aeo_geo/actions.ts";

export default function AeoPage() {
  return (
    <>
      <AuthLoading><div className="p-8"><Skeleton className="h-64 w-full" /></div></AuthLoading>
      <Unauthenticated><div className="flex justify-center p-8"><SignInButton /></div></Unauthenticated>
      <Authenticated><AeoContent /></Authenticated>
    </>
  );
}

function AeoContent() {
  const { activeProjectId } = useCurrentProject();
  const projects = useQuery(api.projects.list, {});
  const project = projects?.find((p) => p._id === activeProjectId);

  const [topic, setTopic] = useState("");
  const [existingContent, setExistingContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AeoResult | null>(null);
  const [copiedFaq, setCopiedFaq] = useState<number | null>(null);

  const analyzeAeo = useAction(api.local_aeo_geo.actions.analyzeAeo);

  async function handleAnalyze() {
    if (!topic.trim()) { toast.error("Enter a topic to analyze"); return; }
    setLoading(true);
    try {
      const res = await analyzeAeo({
        topic,
        niche: project?.businessCategory,
        existingContent: existingContent || undefined,
        targetAudience: project?.primaryAudience,
      });
      setResult(res);
    } catch (e) {
      if (e instanceof ConvexError) toast.error((e.data as { message: string }).message);
      else toast.error("Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  async function copyFaq(idx: number, q: string, a: string) {
    const schema = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [{ "@type": "Question", "name": q, "acceptedAnswer": { "@type": "Answer", "text": a } }],
    }, null, 2);
    await navigator.clipboard.writeText(schema);
    setCopiedFaq(idx);
    setTimeout(() => setCopiedFaq(null), 2000);
  }

  const QUESTION_TYPE_COLORS: Record<string, string> = {
    how: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    what: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    why: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    when: "bg-green-500/10 text-green-600 border-green-500/20",
    who: "bg-pink-500/10 text-pink-600 border-pink-500/20",
    which: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    comparison: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    list: "bg-teal-500/10 text-teal-600 border-teal-500/20",
  };

  const SNIPPET_ICONS: Record<string, string> = {
    paragraph: "¶",
    list: "☰",
    table: "⊞",
    steps: "①",
  };

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <MessageSquareIcon className="h-5 w-5 text-primary" />
          Answer Engine Optimization (AEO)
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Optimize for featured snippets, People Also Ask, and voice search — get your answers surfaced by AI engines
        </p>
      </div>

      <div className="rounded-xl border p-5 space-y-4">
        <div>
          <Label className="text-xs font-medium">Topic or Page URL *</Label>
          <Input value={topic} onChange={(e) => setTopic(e.target.value)} className="mt-1" placeholder="e.g. best CRM software for small business" />
        </div>
        <div>
          <Label className="text-xs font-medium">Paste Existing Content (optional)</Label>
          <Textarea
            value={existingContent}
            onChange={(e) => setExistingContent(e.target.value)}
            className="mt-1 text-xs min-h-[100px]"
            placeholder="Paste your existing page content to get gap analysis..."
          />
        </div>
        <Button onClick={handleAnalyze} disabled={loading || !topic.trim()}>
          <SparklesIcon className="h-4 w-4 mr-1.5" />
          {loading ? "Analyzing…" : "Analyze Answer Readiness"}
        </Button>
      </div>

      {loading && <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>}

      {result && (
        <div className="space-y-5">
          {/* Score + summary */}
          <div className="flex gap-4 items-start">
            <div className="rounded-xl border p-4 text-center shrink-0">
              <div className={`text-3xl font-bold tabular-nums ${result.answerReadinessScore >= 70 ? "text-green-600 dark:text-green-400" : result.answerReadinessScore >= 50 ? "text-amber-600" : "text-red-500"}`}>
                {result.answerReadinessScore}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Answer Readiness</div>
            </div>
            <div className="rounded-xl border p-4 flex-1 text-sm text-muted-foreground italic">{result.summary}</div>
          </div>

          {/* Content gaps */}
          {result.contentGaps.length > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400 mb-2">
                <AlertTriangleIcon className="h-4 w-4" /> Content Gaps
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.contentGaps.map((gap, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{gap}</Badge>
                ))}
              </div>
            </div>
          )}

          <Tabs defaultValue="questions">
            <TabsList className="w-full">
              <TabsTrigger value="questions" className="flex-1">Question Clusters</TabsTrigger>
              <TabsTrigger value="faqs" className="flex-1">FAQ Schema</TabsTrigger>
              <TabsTrigger value="snippets" className="flex-1">Snippet Templates</TabsTrigger>
              <TabsTrigger value="recs" className="flex-1">Recommendations</TabsTrigger>
            </TabsList>

            <TabsContent value="questions" className="mt-4 space-y-4">
              {result.questionClusters.map((cluster, ci) => (
                <div key={ci} className="rounded-xl border p-4 space-y-3">
                  <div className="text-sm font-semibold">{cluster.theme}</div>
                  <div className="space-y-1.5">
                    {cluster.questions.map((q, qi) => (
                      <div key={qi} className="flex items-center gap-2">
                        <span className={`text-[10px] font-medium border rounded px-1.5 py-0.5 uppercase ${QUESTION_TYPE_COLORS[q.type] ?? "bg-muted text-muted-foreground"}`}>{q.type}</span>
                        <span className="text-sm">{q.question}</span>
                        <span className={`ml-auto text-[10px] text-muted-foreground capitalize`}>{q.priority}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="faqs" className="mt-4 space-y-3">
              {result.faqOpportunities.map((faq, i) => (
                <div key={i} className="rounded-xl border p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-medium">{faq.question}</div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {faq.schemaReady && <Badge variant="secondary" className="text-xs text-green-600">Schema Ready</Badge>}
                      <button
                        onClick={() => copyFaq(i, faq.question, faq.answer)}
                        className="text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {copiedFaq === i ? <CheckIcon className="h-3.5 w-3.5 text-green-600" /> : <CopyIcon className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="snippets" className="mt-4 space-y-3">
              {result.snippetOpportunities.map((opp, i) => (
                <div key={i} className="rounded-xl border p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-mono">{SNIPPET_ICONS[opp.snippetType]}</span>
                    <Badge variant="secondary" className="text-xs capitalize">{opp.snippetType}</Badge>
                    <span className="text-sm font-medium">{opp.keyword}</span>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3 text-xs font-mono text-muted-foreground whitespace-pre-wrap">{opp.template}</div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="recs" className="mt-4">
              <div className="space-y-2">
                {result.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-lg border p-3">
                    <CheckCircleIcon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">{rec}</span>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
