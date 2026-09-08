import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { SignInButton } from "@/components/ui/signin.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import {
  MapPinIcon, SparklesIcon, CheckCircleIcon, AlertTriangleIcon,
  XCircleIcon, ExternalLinkIcon, CopyIcon, CheckIcon,
} from "lucide-react";
import { useCurrentProject } from "@/hooks/use-current-project.tsx";
import type { LocalSeoResult } from "@/convex/local_aeo_geo/actions.ts";

export default function LocalSeoPage() {
  return (
    <>
      <AuthLoading><div className="p-8"><Skeleton className="h-64 w-full" /></div></AuthLoading>
      <Unauthenticated><div className="flex justify-center p-8"><SignInButton /></div></Unauthenticated>
      <Authenticated><LocalSeoContent /></Authenticated>
    </>
  );
}

function LocalSeoContent() {
  const { activeProjectId } = useCurrentProject();
  const projects = useQuery(api.projects.list, {});
  const project = projects?.find((p) => p._id === activeProjectId);

  const [businessName, setBusinessName] = useState(project?.businessName ?? project?.name ?? "");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LocalSeoResult | null>(null);
  const [copiedSchema, setCopiedSchema] = useState(false);

  const analyzeLocalSeo = useAction(api.local_aeo_geo.actions.analyzeLocalSeo);

  async function handleAnalyze() {
    if (!businessName.trim()) { toast.error("Enter a business name"); return; }
    setLoading(true);
    try {
      const res = await analyzeLocalSeo({
        businessName,
        address: address || undefined,
        phone: phone || undefined,
        website: project?.websiteUrl,
        businessCategory: project?.businessCategory,
        city: project?.city,
        country: project?.country,
        primaryServices: project?.primaryServices,
        gbpStatus: project?.gbpStatus,
      });
      setResult(res);
    } catch (e) {
      if (e instanceof ConvexError) toast.error((e.data as { message: string }).message);
      else toast.error("Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  const schemaJson = result
    ? JSON.stringify({ "@context": "https://schema.org", ...result.localSchemaFields }, null, 2)
    : "";

  async function copySchema() {
    await navigator.clipboard.writeText(schemaJson);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2000);
  }

  const SEVERITY_BADGE: Record<string, string> = {
    high: "text-red-500",
    medium: "text-amber-600",
    low: "text-blue-500",
  };

  const STATUS_ICON = {
    complete: <CheckCircleIcon className="h-4 w-4 text-green-600 shrink-0" />,
    missing: <XCircleIcon className="h-4 w-4 text-red-500 shrink-0" />,
    needs_attention: <AlertTriangleIcon className="h-4 w-4 text-amber-500 shrink-0" />,
  };

  const IMPACT_DOT: Record<string, string> = {
    high: "bg-red-500",
    medium: "bg-amber-500",
    low: "bg-blue-400",
  };

  const PRIORITY_COLORS: Record<string, string> = {
    essential: "bg-red-500/10 text-red-600 border-red-500/20",
    important: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    useful: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  };

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <MapPinIcon className="h-5 w-5 text-primary" />
          Local SEO Analyzer
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          NAP consistency, GBP optimization checklist, citation opportunities, and LocalBusiness schema
        </p>
      </div>

      <div className="rounded-xl border p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-medium">Business Name *</Label>
            <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="mt-1" placeholder="Acme Plumbing Co." />
          </div>
          <div>
            <Label className="text-xs font-medium">Phone Number</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" placeholder="+1-555-123-4567" />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs font-medium">Business Address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1" placeholder="123 Main St, Springfield, IL 62701" />
          </div>
        </div>
        {project && (
          <p className="text-xs text-muted-foreground">
            Using project context: {project.businessCategory ?? "no category"} · {project.city ?? ""}{project.country ? `, ${project.country}` : ""}
          </p>
        )}
        <Button onClick={handleAnalyze} disabled={loading || !businessName.trim()}>
          <SparklesIcon className="h-4 w-4 mr-1.5" />
          {loading ? "Analyzing…" : "Analyze Local SEO"}
        </Button>
      </div>

      {loading && <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>}

      {result && (
        <div className="space-y-5">
          {/* Summary row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border p-4 text-center">
              <div className={`text-3xl font-bold tabular-nums ${result.napScore >= 80 ? "text-green-600 dark:text-green-400" : result.napScore >= 60 ? "text-amber-600" : "text-red-500"}`}>{result.napScore}</div>
              <div className="text-xs text-muted-foreground mt-0.5">NAP Score</div>
            </div>
            <div className="rounded-xl border p-4 text-center">
              <div className="text-3xl font-bold tabular-nums">
                {result.gbpChecklist.filter((i) => i.status === "complete").length}/{result.gbpChecklist.length}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">GBP Checks Passed</div>
            </div>
            <div className="rounded-xl border p-4 text-center">
              <div className="text-3xl font-bold tabular-nums">{result.citationSources.length}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Citation Sources</div>
            </div>
          </div>

          <div className="rounded-xl border p-4 text-sm text-muted-foreground italic">{result.summary}</div>

          <Tabs defaultValue="gbp">
            <TabsList className="w-full">
              <TabsTrigger value="gbp" className="flex-1">GBP Checklist</TabsTrigger>
              <TabsTrigger value="nap" className="flex-1">NAP Issues</TabsTrigger>
              <TabsTrigger value="keywords" className="flex-1">Near-Me Keywords</TabsTrigger>
              <TabsTrigger value="citations" className="flex-1">Citations</TabsTrigger>
              <TabsTrigger value="schema" className="flex-1">Schema</TabsTrigger>
            </TabsList>

            <TabsContent value="gbp" className="mt-4 space-y-2">
              {result.gbpChecklist.map((item, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg border p-3.5">
                  {STATUS_ICON[item.status]}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{item.item}</span>
                      <div className={`h-1.5 w-1.5 rounded-full ${IMPACT_DOT[item.impact]}`} />
                      <span className="text-xs text-muted-foreground capitalize">{item.impact} impact</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="nap" className="mt-4 space-y-3">
              {result.napIssues.length === 0 ? (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 p-4">
                  <CheckCircleIcon className="h-5 w-5" />
                  <span className="text-sm font-medium">No NAP issues found — great consistency!</span>
                </div>
              ) : result.napIssues.map((issue, i) => (
                <div key={i} className="rounded-xl border p-4 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className={`text-xs capitalize ${SEVERITY_BADGE[issue.severity]}`}>{issue.severity}</Badge>
                    <span className="text-sm font-medium capitalize">{issue.field}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{issue.issue}</p>
                  <p className="text-xs"><span className="font-medium">Fix: </span><span className="text-muted-foreground">{issue.fix}</span></p>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="keywords" className="mt-4">
              <div className="flex flex-wrap gap-2">
                {result.nearMeKeywords.map((kw, i) => (
                  <div key={i} className={`rounded-lg border px-3 py-2 text-xs font-medium ${kw.priority === "high" ? "border-primary/40 bg-primary/5" : kw.priority === "medium" ? "border-amber-500/30 bg-amber-500/5" : "border-muted bg-muted/30"}`}>
                    <div className="font-medium">{kw.keyword}</div>
                    <div className="text-muted-foreground">{kw.intent}</div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="citations" className="mt-4 space-y-2">
              {result.citationSources.map((src, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className={`text-xs font-medium border rounded px-2 py-0.5 capitalize ${PRIORITY_COLORS[src.priority]}`}>{src.priority}</div>
                  <div className="flex-1">
                    <span className="text-sm font-medium">{src.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{src.category}</span>
                  </div>
                  <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary cursor-pointer">
                    <ExternalLinkIcon className="h-3.5 w-3.5" />
                  </a>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="schema" className="mt-4">
              <div className="rounded-xl border overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">LocalBusiness JSON-LD</span>
                  <button onClick={copySchema} className="text-xs flex items-center gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer">
                    {copiedSchema ? <CheckIcon className="h-3.5 w-3.5 text-green-600" /> : <CopyIcon className="h-3.5 w-3.5" />}
                    {copiedSchema ? "Copied!" : "Copy"}
                  </button>
                </div>
                <pre className="p-4 text-xs font-mono overflow-x-auto bg-muted/10 text-foreground">{schemaJson}</pre>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
