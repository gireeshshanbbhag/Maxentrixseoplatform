import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
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
  SparklesIcon, CheckCircleIcon, AlertTriangleIcon, XCircleIcon,
  BotIcon, ShieldAlertIcon, ZapIcon,
} from "lucide-react";
import { useCurrentProject } from "@/hooks/use-current-project.tsx";
import type { GeoResult } from "@/convex/local_aeo_geo/actions.ts";

export default function GeoPage() {
  return (
    <>
      <AuthLoading><div className="p-8"><Skeleton className="h-64 w-full" /></div></AuthLoading>
      <Unauthenticated><div className="flex justify-center p-8"><SignInButton /></div></Unauthenticated>
      <Authenticated><GeoContent /></Authenticated>
    </>
  );
}

function GeoContent() {
  const { activeProjectId } = useCurrentProject();
  const projects = useQuery(api.projects.list, {});
  const project = projects?.find((p) => p._id === activeProjectId);

  const [robotsTxt, setRobotsTxt] = useState("");
  const [contentSample, setContentSample] = useState("");
  const [hasAuthorBios, setHasAuthorBios] = useState(false);
  const [hasAboutPage, setHasAboutPage] = useState(false);
  const [hasCitations, setHasCitations] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeoResult | null>(null);

  const analyzeGeo = useAction(api.local_aeo_geo.actions.analyzeGeo);

  async function handleAnalyze() {
    if (!project && !contentSample) { toast.error("Select a project or paste content to analyze"); return; }
    setLoading(true);
    try {
      const res = await analyzeGeo({
        websiteUrl: project?.websiteUrl,
        businessName: project?.businessName ?? project?.name ?? "My Business",
        businessDescription: project?.businessDescription,
        contentSample: contentSample || undefined,
        robotsTxtContent: robotsTxt || undefined,
        hasAuthorBios,
        hasAboutPage,
        hasCitations,
        businessType: project?.businessCategory,
      });
      setResult(res);
    } catch (e) {
      if (e instanceof ConvexError) toast.error((e.data as { message: string }).message);
      else toast.error("Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  const CRAWLER_STATUS_ICON = {
    allowed: <CheckCircleIcon className="h-4 w-4 text-green-600 shrink-0" />,
    blocked: <XCircleIcon className="h-4 w-4 text-red-500 shrink-0" />,
    unknown: <AlertTriangleIcon className="h-4 w-4 text-amber-500 shrink-0" />,
  };

  const SIGNAL_STATUS_ICON = {
    present: <CheckCircleIcon className="h-4 w-4 text-green-600 shrink-0" />,
    missing: <XCircleIcon className="h-4 w-4 text-red-500 shrink-0" />,
    partial: <AlertTriangleIcon className="h-4 w-4 text-amber-500 shrink-0" />,
  };

  const GR_STATUS_ICON = {
    ready: <CheckCircleIcon className="h-4 w-4 text-green-600 shrink-0" />,
    needs_work: <AlertTriangleIcon className="h-4 w-4 text-amber-500 shrink-0" />,
    missing: <XCircleIcon className="h-4 w-4 text-red-500 shrink-0" />,
    unknown: <AlertTriangleIcon className="h-4 w-4 text-muted-foreground shrink-0" />,
  };

  const CATEGORY_COLORS: Record<string, string> = {
    Experience: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    Expertise: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    Authoritativeness: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    Trustworthiness: "bg-green-500/10 text-green-600 border-green-500/20",
    "Generative Readiness": "bg-pink-500/10 text-pink-600 border-pink-500/20",
  };

  const geoScoreColor = !result ? "" : result.geoScore >= 70 ? "text-green-600 dark:text-green-400" : result.geoScore >= 50 ? "text-amber-600" : "text-red-500";

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <SparklesIcon className="h-5 w-5 text-primary" />
          GEO — Generative Engine Optimization
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Optimize your content for Google AI Overviews, Bing Copilot, ChatGPT, Perplexity, and other AI-powered answer engines
        </p>
      </div>

      <div className="rounded-xl border p-5 space-y-4">
        {/* Quick toggles */}
        <div className="grid grid-cols-3 gap-3">
          {([
            { label: "Has Author Bios", value: hasAuthorBios, set: setHasAuthorBios },
            { label: "Has About Page", value: hasAboutPage, set: setHasAboutPage },
            { label: "Has External Citations", value: hasCitations, set: setHasCitations },
          ] as const).map((item) => (
            <label key={item.label} className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer hover:bg-muted/30 select-none">
              <input
                type="checkbox"
                checked={item.value}
                onChange={(e) => item.set(e.target.checked)}
                className="rounded shrink-0"
              />
              <span className="text-xs font-medium">{item.label}</span>
            </label>
          ))}
        </div>

        <div>
          <Label className="text-xs font-medium">Robots.txt Content (optional)</Label>
          <Textarea
            value={robotsTxt}
            onChange={(e) => setRobotsTxt(e.target.value)}
            className="mt-1 font-mono text-xs min-h-[80px]"
            placeholder="User-agent: *&#10;Disallow: /admin/&#10;..."
          />
        </div>
        <div>
          <Label className="text-xs font-medium">Sample Content (optional)</Label>
          <Textarea
            value={contentSample}
            onChange={(e) => setContentSample(e.target.value)}
            className="mt-1 text-xs min-h-[80px]"
            placeholder="Paste a sample from your homepage or main content page..."
          />
        </div>

        {project && (
          <p className="text-xs text-muted-foreground">Analyzing: {project.websiteUrl ?? project.name}</p>
        )}

        <Button onClick={handleAnalyze} disabled={loading}>
          <ZapIcon className="h-4 w-4 mr-1.5" />
          {loading ? "Analyzing…" : "Analyze GEO Readiness"}
        </Button>
      </div>

      {loading && <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>}

      {result && (
        <div className="space-y-5">
          {/* Score row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border p-4 text-center">
              <div className={`text-3xl font-bold tabular-nums ${geoScoreColor}`}>{result.geoScore}</div>
              <div className="text-xs text-muted-foreground mt-0.5">GEO Score</div>
            </div>
            <div className="rounded-xl border p-4 text-center">
              <div className={`text-3xl font-bold tabular-nums ${result.eeaatScore >= 70 ? "text-green-600 dark:text-green-400" : result.eeaatScore >= 50 ? "text-amber-600" : "text-red-500"}`}>{result.eeaatScore}</div>
              <div className="text-xs text-muted-foreground mt-0.5">E-E-A-T Score</div>
            </div>
            <div className="rounded-xl border p-4 text-center">
              <div className={`text-3xl font-bold tabular-nums ${result.citationLikelihood >= 60 ? "text-green-600 dark:text-green-400" : result.citationLikelihood >= 40 ? "text-amber-600" : "text-red-500"}`}>{result.citationLikelihood}%</div>
              <div className="text-xs text-muted-foreground mt-0.5">Citation Likelihood</div>
            </div>
          </div>

          <div className="rounded-xl border p-4 text-sm text-muted-foreground italic">{result.summary}</div>

          {/* Doorway warnings */}
          {result.doorwayWarnings.length > 0 && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-red-600">
                <ShieldAlertIcon className="h-4 w-4" />Doorway Page Warnings
              </div>
              {result.doorwayWarnings.map((w, i) => (
                <div key={i} className="text-xs">
                  <span className="font-medium">{w.pattern}</span>
                  <span className="text-muted-foreground"> — {w.description}</span>
                </div>
              ))}
            </div>
          )}

          <Tabs defaultValue="signals">
            <TabsList className="w-full">
              <TabsTrigger value="signals" className="flex-1">E-E-A-T Signals</TabsTrigger>
              <TabsTrigger value="crawlers" className="flex-1">AI Crawlers</TabsTrigger>
              <TabsTrigger value="readiness" className="flex-1">Generative Readiness</TabsTrigger>
              <TabsTrigger value="recs" className="flex-1">Recommendations</TabsTrigger>
            </TabsList>

            <TabsContent value="signals" className="mt-4 space-y-2">
              {result.signals.map((sig, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg border p-3.5">
                  {SIGNAL_STATUS_ICON[sig.status]}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-medium border rounded px-1.5 py-0.5 ${CATEGORY_COLORS[sig.category] ?? "bg-muted text-muted-foreground"}`}>{sig.category}</span>
                      <span className="text-sm font-medium">{sig.item}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{sig.description}</p>
                    {sig.status !== "present" && (
                      <p className="text-xs mt-1"><span className="font-medium">Fix: </span><span className="text-muted-foreground">{sig.fix}</span></p>
                    )}
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="crawlers" className="mt-4 space-y-2">
              <p className="text-xs text-muted-foreground pb-2">
                AI-powered search engines use their own crawlers to index your content. Blocking them means your site won't appear in their responses.
              </p>
              {result.aiCrawlerStatus.map((bot, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border p-3.5">
                  {CRAWLER_STATUS_ICON[bot.status]}
                  <BotIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium flex-1">{bot.bot}</span>
                  <Badge variant="secondary" className={`text-xs capitalize ${bot.status === "allowed" ? "text-green-600" : bot.status === "blocked" ? "text-red-500" : "text-amber-600"}`}>{bot.status}</Badge>
                  <span className={`text-xs capitalize hidden sm:block ${bot.impact === "critical" ? "text-red-500" : bot.impact === "high" ? "text-amber-600" : "text-muted-foreground"}`}>{bot.impact} impact</span>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="readiness" className="mt-4 space-y-2">
              {result.generativeReadinessItems.map((item, i) => {
                const icon = GR_STATUS_ICON[item.status as keyof typeof GR_STATUS_ICON] ?? GR_STATUS_ICON.unknown;
                return (
                  <div key={i} className="flex items-start gap-3 rounded-lg border p-3.5">
                    {icon}
                    <div>
                      <div className="text-sm font-medium">{item.item}</div>
                      <div className="text-xs text-muted-foreground">{item.note}</div>
                    </div>
                  </div>
                );
              })}
            </TabsContent>

            <TabsContent value="recs" className="mt-4 space-y-2">
              {result.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg border p-3">
                  <CheckCircleIcon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm">{rec}</span>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
