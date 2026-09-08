import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { SearchIcon, ExternalLinkIcon, CheckCircleIcon, AlertCircleIcon, XCircleIcon } from "lucide-react";

type Props = {
  siteUrl: string;
};

type InspectionResult = {
  inspectionResult?: {
    indexStatusResult?: {
      verdict?: string;
      coverageState?: string;
      crawledAs?: string;
      googleCanonical?: string;
      userCanonical?: string;
      lastCrawlTime?: string;
      indexingState?: string;
      robotsTxtState?: string;
      pageFetchState?: string;
    };
    richResultsResult?: {
      verdict?: string;
      detectedItems?: Array<{ richResultType?: string }>;
    };
  };
};

export default function GscUrlInspector({ siteUrl }: Props) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InspectionResult | null>(null);

  const inspectUrl = useAction(api.gsc.actions.inspectUrl);

  async function handleInspect() {
    if (!url.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await inspectUrl({ siteUrl, inspectionUrl: url.trim() });
      setResult(data as InspectionResult);
    } catch (e) {
      if (e instanceof ConvexError) {
        toast.error((e.data as { message: string }).message);
      } else {
        toast.error("URL inspection failed");
      }
    } finally {
      setLoading(false);
    }
  }

  const indexStatus = result?.inspectionResult?.indexStatusResult;

  function verdictIcon(verdict?: string) {
    if (verdict === "PASS") return <CheckCircleIcon className="h-4 w-4 text-green-600 dark:text-green-400" />;
    if (verdict === "FAIL") return <XCircleIcon className="h-4 w-4 text-red-500" />;
    return <AlertCircleIcon className="h-4 w-4 text-amber-500" />;
  }

  function verdictColor(verdict?: string) {
    if (verdict === "PASS") return "text-green-600 dark:text-green-400";
    if (verdict === "FAIL") return "text-red-500";
    return "text-amber-500";
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h3 className="text-sm font-semibold mb-1">URL Inspection</h3>
        <p className="text-xs text-muted-foreground">
          Check how Google sees a specific URL — indexing status, crawl info, and rich results.
        </p>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="https://example.com/page"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleInspect()}
            className="pl-9"
          />
        </div>
        <Button onClick={handleInspect} disabled={loading || !url.trim()}>
          {loading ? <Spinner className="h-4 w-4" /> : "Inspect"}
        </Button>
      </div>

      {result && indexStatus && (
        <div className="rounded-xl border overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/20 flex items-center gap-2">
            {verdictIcon(indexStatus.verdict)}
            <span className={`text-sm font-medium ${verdictColor(indexStatus.verdict)}`}>
              {indexStatus.coverageState ?? indexStatus.verdict ?? "Unknown status"}
            </span>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-xs text-muted-foreground hover:text-foreground"
            >
              <ExternalLinkIcon className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="p-4 grid grid-cols-2 gap-y-3 text-sm">
            {[
              ["Indexing state", indexStatus.indexingState],
              ["Crawled as", indexStatus.crawledAs],
              ["Robots.txt", indexStatus.robotsTxtState],
              ["Page fetch", indexStatus.pageFetchState],
              ["Last crawled", indexStatus.lastCrawlTime ? new Date(indexStatus.lastCrawlTime).toLocaleDateString() : undefined],
              ["Google canonical", indexStatus.googleCanonical],
              ["User canonical", indexStatus.userCanonical],
            ]
              .filter(([, v]) => v)
              .map(([label, value]) => (
                <div key={label as string}>
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="font-medium text-xs mt-0.5 break-all">{value}</div>
                </div>
              ))}
          </div>

          {result.inspectionResult?.richResultsResult && (
            <div className="border-t px-4 py-3">
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">Rich Results</div>
              <div className={`text-sm font-medium ${verdictColor(result.inspectionResult.richResultsResult.verdict)}`}>
                {result.inspectionResult.richResultsResult.verdict ?? "Unknown"}
              </div>
              {result.inspectionResult.richResultsResult.detectedItems?.map((item, i) => (
                <Badge key={i} variant="secondary" className="mr-1 mt-1 text-xs">
                  {item.richResultType}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
