import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import {
  ExternalLinkIcon, RefreshCwIcon, CheckCircleIcon, XCircleIcon,
  AlertTriangleIcon, SearchIcon, GitBranchIcon, CodeIcon,
  ImageIcon, FileTextIcon, LinkIcon, ShieldCheckIcon,
} from "lucide-react";
import { useCurrentProject } from "@/hooks/use-current-project.tsx";
import { useQuery } from "convex/react";
import { format } from "date-fns";
import {
  Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription,
} from "@/components/ui/empty.tsx";

type InspectResult = {
  finalUrl: string;
  statusCode: number;
  redirectChain: string[];
  title: string | null;
  metaDescription: string | null;
  canonical: string | null;
  robotsMeta: string | null;
  h1: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  hasSchemaMarkup: boolean;
  schemaTypes: string[];
  isIndexable: boolean;
  indexabilityIssues: string[];
  loadTimeMs: number;
  inspectedAt: string;
};

export default function UrlInspectionPage() {
  return (
    <>
      <AuthLoading><div className="p-8"><Skeleton className="h-64 w-full" /></div></AuthLoading>
      <Unauthenticated><div className="flex justify-center p-8"><SignInButton /></div></Unauthenticated>
      <Authenticated><UrlInspectionContent /></Authenticated>
    </>
  );
}

function UrlInspectionContent() {
  const { activeProjectId } = useCurrentProject();
  const projects = useQuery(api.projects.list, {});
  const project = projects?.find((p) => p._id === activeProjectId);

  const [url, setUrl] = useState(project?.websiteUrl ?? "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InspectResult | null>(null);
  const [history, setHistory] = useState<Array<{ url: string; isIndexable: boolean; statusCode: number; inspectedAt: string }>>([]);

  const inspectUrl = useAction(api.technical_seo.actions.inspectUrl);

  async function handleInspect(targetUrl?: string) {
    const inspectTarget = targetUrl ?? url.trim();
    if (!inspectTarget) return;
    setLoading(true);
    try {
      const res = await inspectUrl({ url: inspectTarget });
      setResult(res);
      setUrl(res.finalUrl);
      setHistory((prev) => [
        { url: res.finalUrl, isIndexable: res.isIndexable, statusCode: res.statusCode, inspectedAt: res.inspectedAt },
        ...prev.filter((h) => h.url !== res.finalUrl).slice(0, 9),
      ]);
    } catch (e) {
      const msg = e instanceof ConvexError ? (e.data as { message: string }).message : "Inspection failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <ExternalLinkIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">URL Inspection</h1>
            <p className="text-sm text-muted-foreground">Live SEO analysis of any URL — meta tags, indexability, schema, redirects</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-4xl">

        {/* URL Input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="https://yoursite.com/page-to-inspect"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInspect()}
            />
          </div>
          <Button onClick={() => handleInspect()} disabled={loading || !url.trim()}>
            {loading
              ? <><RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />Inspecting…</>
              : <><SearchIcon className="h-4 w-4 mr-2" />Inspect URL</>
            }
          </Button>
        </div>

        {/* Quick access: project pages */}
        {project && (
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground self-center">Quick:</span>
            {["/", "/about", "/contact", "/services"].map((path) => {
              const full = project.websiteUrl.replace(/\/$/, "") + path;
              return (
                <button key={path} onClick={() => { setUrl(full); handleInspect(full); }}
                  className="text-xs px-2.5 py-1 rounded-full border hover:bg-accent cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                  {path}
                </button>
              );
            })}
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-xs text-muted-foreground">Recent:</span>
            {history.map((h) => (
              <button key={h.url} onClick={() => { setUrl(h.url); handleInspect(h.url); }}
                className="text-xs px-2.5 py-1 rounded-full border hover:bg-accent cursor-pointer flex items-center gap-1">
                {h.isIndexable
                  ? <CheckCircleIcon className="h-3 w-3 text-green-600" />
                  : <XCircleIcon className="h-3 w-3 text-red-500" />
                }
                <span className="text-muted-foreground max-w-[200px] truncate">{h.url.replace(/^https?:\/\//, "")}</span>
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-32" /><Skeleton className="h-32" />
            </div>
          </div>
        )}

        {!loading && result && (
          <div className="space-y-4">
            {/* Indexability Banner */}
            <div className={`rounded-xl border p-4 flex items-start gap-3 ${
              result.isIndexable
                ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
            }`}>
              {result.isIndexable
                ? <CheckCircleIcon className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                : <XCircleIcon className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              }
              <div className="flex-1">
                <p className={`font-semibold ${result.isIndexable ? "text-green-900 dark:text-green-100" : "text-red-900 dark:text-red-100"}`}>
                  {result.isIndexable ? "Page appears indexable" : `${result.indexabilityIssues.length} indexability issue(s) found`}
                </p>
                {result.indexabilityIssues.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {result.indexabilityIssues.map((issue) => (
                      <li key={issue} className="text-sm text-red-700 dark:text-red-300 flex items-center gap-1.5">
                        <AlertTriangleIcon className="h-3.5 w-3.5 shrink-0" />{issue}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="text-right shrink-0">
                <span className={`text-2xl font-bold ${result.statusCode >= 400 ? "text-red-500" : result.statusCode >= 300 ? "text-amber-600" : "text-green-600"}`}>
                  {result.statusCode}
                </span>
                <p className="text-xs text-muted-foreground">{result.loadTimeMs}ms</p>
              </div>
            </div>

            {/* Redirect Chain */}
            {result.redirectChain.length > 0 && (
              <div className="rounded-xl border bg-card p-4">
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <GitBranchIcon className="h-4 w-4 text-amber-600" /> Redirect Chain
                </h3>
                <div className="space-y-1">
                  {result.redirectChain.map((u, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="text-amber-600">→</span>
                      <a href={u} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{u}</a>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 text-xs">
                    <CheckCircleIcon className="h-3.5 w-3.5 text-green-600" />
                    <a href={result.finalUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">{result.finalUrl}</a>
                    <Badge variant="secondary" className="text-[10px]">Final</Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Meta Tags */}
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <FileTextIcon className="h-4 w-4 text-primary" /> Page Meta Data
              </h3>
              <div className="grid gap-3">
                <MetaRow label="Title" value={result.title} maxLength={60} />
                <MetaRow label="Meta Description" value={result.metaDescription} maxLength={160} />
                <MetaRow label="H1 Tag" value={result.h1} />
                <MetaRow label="Canonical URL" value={result.canonical} isUrl />
                <MetaRow label="Robots Meta" value={result.robotsMeta ?? "Not set (default: index, follow)"} />
              </div>
            </div>

            {/* Open Graph */}
            {(result.ogTitle || result.ogDescription || result.ogImage) && (
              <div className="rounded-xl border bg-card p-4 space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-primary" /> Open Graph / Social Preview
                </h3>
                {result.ogImage && (
                  <img src={result.ogImage} alt="OG" className="rounded-lg w-full max-h-48 object-cover border" />
                )}
                <div className="grid gap-2">
                  <MetaRow label="OG Title" value={result.ogTitle} />
                  <MetaRow label="OG Description" value={result.ogDescription} />
                  <MetaRow label="OG Image URL" value={result.ogImage} isUrl />
                </div>
              </div>
            )}

            {/* Schema Markup */}
            <div className="rounded-xl border bg-card p-4">
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
                <CodeIcon className="h-4 w-4 text-primary" /> Structured Data (Schema)
              </h3>
              {result.hasSchemaMarkup ? (
                <div className="flex flex-wrap gap-2 items-center">
                  <CheckCircleIcon className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-700 dark:text-green-400">Schema markup detected</span>
                  {result.schemaTypes.map((t) => (
                    <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertTriangleIcon className="h-4 w-4 text-amber-600" />
                  No structured data found — consider adding JSON-LD schema markup
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground text-right">
              Inspected at {format(new Date(result.inspectedAt), "MMMM d, yyyy h:mm:ss a")}
            </p>
          </div>
        )}

        {!loading && !result && (
          <div className="rounded-xl border border-dashed p-12 text-center">
            <ExternalLinkIcon className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground text-sm">Enter a URL above to inspect it</p>
            <p className="text-xs text-muted-foreground mt-1">Live HTTP fetch — shows real indexability status, meta tags, redirects, and schema</p>
          </div>
        )}

      </div>
    </div>
  );
}

function MetaRow({ label, value, maxLength, isUrl }: {
  label: string; value: string | null; maxLength?: number; isUrl?: boolean;
}) {
  const hasValue = !!value;
  const isTooLong = maxLength && value && value.length > maxLength;

  return (
    <div className="rounded-lg bg-muted/40 p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        <div className="flex items-center gap-1.5">
          {maxLength && value && (
            <span className={`text-[10px] ${isTooLong ? "text-amber-600" : "text-muted-foreground"}`}>
              {value.length}/{maxLength}
            </span>
          )}
          {hasValue
            ? <CheckCircleIcon className="h-3.5 w-3.5 text-green-600" />
            : <XCircleIcon className="h-3.5 w-3.5 text-red-500" />
          }
        </div>
      </div>
      {hasValue ? (
        isUrl ? (
          <a href={value!} target="_blank" rel="noopener noreferrer"
            className="text-xs text-primary hover:underline break-all flex items-center gap-1">
            {value}
            <ExternalLinkIcon className="h-3 w-3 shrink-0" />
          </a>
        ) : (
          <p className={`text-sm break-words ${isTooLong ? "text-amber-700 dark:text-amber-400" : ""}`}>{value}</p>
        )
      ) : (
        <p className="text-sm text-red-500">Missing</p>
      )}
    </div>
  );
}
