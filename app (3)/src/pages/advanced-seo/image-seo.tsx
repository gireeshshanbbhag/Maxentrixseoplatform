import { useState } from "react";
import { useAction, useQuery } from "convex/react";
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
import { SparklesIcon, ImageIcon, AlertTriangleIcon, CheckCircleIcon } from "lucide-react";
import { useCurrentProject } from "@/hooks/use-current-project.tsx";

type ImageIssue = {
  type: string;
  severity: "high" | "medium" | "low";
  description: string;
  fix: string;
};

type ImageAnalysisResult = {
  overallScore: number;
  totalImages: number;
  issueCount: number;
  issues: ImageIssue[];
  passedChecks: string[];
  recommendations: string[];
};

export default function ImageSeoPage() {
  return (
    <>
      <AuthLoading><div className="p-8"><Skeleton className="h-64 w-full" /></div></AuthLoading>
      <Unauthenticated><div className="flex justify-center p-8"><SignInButton /></div></Unauthenticated>
      <Authenticated><ImageSeoContent /></Authenticated>
    </>
  );
}

function ImageSeoContent() {
  const { activeProjectId } = useCurrentProject();
  const projects = useQuery(api.projects.list, {});
  const project = projects?.find((p) => p._id === activeProjectId);
  const [htmlContent, setHtmlContent] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImageAnalysisResult | null>(null);

  const analyzeImageSeo = useAction(api.advanced_seo.actions.analyzeImageSeo);

  async function handleAnalyze() {
    if (!htmlContent.trim()) { toast.error("Paste page HTML or image tags to analyze"); return; }
    setLoading(true);
    try {
      const res = await analyzeImageSeo({
        htmlContent,
        pageUrl: pageUrl || undefined,
        websiteContext: project?.businessDescription ?? project?.name ?? "",
      });
      setResult(res);
    } catch (e) {
      if (e instanceof ConvexError) toast.error((e.data as { message: string }).message);
      else toast.error("Failed to analyze image SEO");
    } finally {
      setLoading(false);
    }
  }

  const SEVERITY_COLOR = { high: "text-red-500", medium: "text-amber-600", low: "text-blue-500" };
  const SEVERITY_BG = { high: "border-red-500/30 bg-red-500/5", medium: "border-amber-500/30 bg-amber-500/5", low: "border-blue-500/30 bg-blue-500/5" };

  const scoreColor = result
    ? result.overallScore >= 70 ? "text-green-600 dark:text-green-400"
      : result.overallScore >= 50 ? "text-amber-600"
        : "text-red-500"
    : "";

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold">Image SEO Analyzer</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Audit image alt text, file formats, lazy loading, and structured data for better visual search rankings
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-xs font-medium">Page URL (optional)</Label>
          <Input value={pageUrl} onChange={(e) => setPageUrl(e.target.value)} className="mt-1 text-sm" placeholder="https://example.com/page" />
        </div>
        <div>
          <Label className="text-xs font-medium">Paste HTML or &lt;img&gt; tags</Label>
          <Textarea
            value={htmlContent}
            onChange={(e) => setHtmlContent(e.target.value)}
            placeholder={`<img src="/hero.jpg" alt="...">\n<img src="/product.png">\n...\nor paste the full page HTML`}
            className="mt-1 font-mono text-xs min-h-[160px]"
          />
        </div>
        <Button onClick={handleAnalyze} disabled={loading || !htmlContent.trim()}>
          <SparklesIcon className="h-4 w-4 mr-1.5" />
          {loading ? "Analyzing…" : "Analyze Image SEO"}
        </Button>
      </div>

      {loading && <div className="space-y-3">{[1,2,3].map((i)=><Skeleton key={i} className="h-20"/>)}</div>}

      {result && (
        <div className="space-y-5">
          <div className="rounded-xl border p-5 flex items-center gap-6">
            <div>
              <div className={`text-4xl font-bold tabular-nums ${scoreColor}`}>{result.overallScore}</div>
              <div className="text-xs text-muted-foreground">Image SEO Score</div>
            </div>
            <div className="flex-1">
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full ${result.overallScore >= 70 ? "bg-green-500" : result.overallScore >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${result.overallScore}%` }} />
              </div>
              <div className="text-xs text-muted-foreground mt-1">{result.totalImages} images · {result.issueCount} issues</div>
            </div>
          </div>

          {result.passedChecks.length > 0 && (
            <div className="rounded-xl border p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400 mb-2">
                <CheckCircleIcon className="h-4 w-4" />Passed Checks
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.passedChecks.map((c, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{c}</Badge>
                ))}
              </div>
            </div>
          )}

          {result.issues.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-600">
                <AlertTriangleIcon className="h-4 w-4" />Issues Found ({result.issues.length})
              </div>
              {result.issues.map((issue, i) => (
                <div key={i} className={`rounded-xl border p-4 space-y-1.5 ${SEVERITY_BG[issue.severity]}`}>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className={`text-xs capitalize ${SEVERITY_COLOR[issue.severity]}`}>{issue.severity}</Badge>
                    <span className="text-sm font-medium capitalize">{issue.type.replace(/_/g, " ")}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{issue.description}</div>
                  <div className="text-xs">
                    <span className="font-medium">Fix: </span>
                    <span className="text-muted-foreground">{issue.fix}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {result.recommendations.length > 0 && (
            <div className="rounded-xl border p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Recommendations</div>
              <ul className="space-y-1.5">
                {result.recommendations.map((rec, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
