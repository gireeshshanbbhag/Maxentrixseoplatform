import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { ConvexError } from "convex/values";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { BugIcon, CheckCircleIcon, XCircleIcon, RefreshCwIcon } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

type Kw = {
  _id: Id<"keywords">;
  keyword: string;
};

type DebugResult = {
  keyword: string;
  targetDomain: string;
  htmlLength: number;
  urlsFound: number;
  urls: string[];
  position: number | null;
  matchedUrl: string | null;
  hasGoogleCaptcha: boolean;
  htmlSnippet: string;
};

export default function SerpDebugPanel({
  projectId,
  keywords,
}: {
  projectId: Id<"projects">;
  keywords: Kw[] | undefined;
}) {
  const [selectedKwId, setSelectedKwId] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<DebugResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const debugCheck = useAction(api.rankTracker.actions.debugCheck);

  async function handleRun() {
    if (!selectedKwId) return;
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      const res = await debugCheck({
        projectId,
        keywordId: selectedKwId as Id<"keywords">,
      });
      setResult(res);
    } catch (e) {
      if (e instanceof ConvexError) {
        setError((e.data as { message: string }).message);
      } else {
        setError(String(e));
      }
    } finally {
      setRunning(false);
    }
  }

  const kwList = keywords ?? [];

  return (
    <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <BugIcon className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-semibold">Debug SERP Check</p>
        <span className="text-xs text-muted-foreground">— See exactly what Google returns for a keyword</span>
      </div>

      <div className="flex items-center gap-2">
        <Select value={selectedKwId} onValueChange={setSelectedKwId}>
          <SelectTrigger className="h-8 text-sm max-w-xs">
            <SelectValue placeholder="Pick a keyword to test…" />
          </SelectTrigger>
          <SelectContent>
            {kwList.map((kw) => (
              <SelectItem key={kw._id} value={kw._id}>
                {kw.keyword}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="secondary"
          className="h-8 cursor-pointer"
          onClick={handleRun}
          disabled={running || !selectedKwId}
        >
          <RefreshCwIcon className={`h-3.5 w-3.5 mr-1.5 ${running ? "animate-spin" : ""}`} />
          {running ? "Running…" : "Run Debug Check"}
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-3 text-xs">
          {/* Summary row */}
          <div className="flex flex-wrap gap-3">
            <span className="rounded bg-muted px-2 py-1 font-mono">
              HTML length: <strong>{result.htmlLength.toLocaleString()}</strong> chars
            </span>
            <span className="rounded bg-muted px-2 py-1 font-mono">
              URLs extracted: <strong>{result.urlsFound}</strong>
            </span>
            <span className="rounded bg-muted px-2 py-1 font-mono">
              Target: <strong>{result.targetDomain}</strong>
            </span>
            {result.hasGoogleCaptcha && (
              <span className="rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-1 font-semibold">
                ⚠ CAPTCHA detected
              </span>
            )}
          </div>

          {/* Position result */}
          {result.position !== null ? (
            <div className="flex items-center gap-2 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-3 py-2">
              <CheckCircleIcon className="h-4 w-4 text-green-600 shrink-0" />
              <div>
                <p className="font-semibold text-green-700 dark:text-green-300">
                  Found at position #{result.position}
                </p>
                <p className="text-green-600 dark:text-green-400 font-mono break-all">{result.matchedUrl}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2">
              <XCircleIcon className="h-4 w-4 text-amber-600 shrink-0" />
              <p className="text-amber-700 dark:text-amber-300">
                Domain not found in top 100. {result.urlsFound === 0 ? "No URLs extracted — Google may be blocking or returning different HTML." : `${result.urlsFound} other domains found.`}
              </p>
            </div>
          )}

          {/* URL list */}
          {result.urls.length > 0 && (
            <div>
              <p className="font-semibold text-muted-foreground mb-1.5">First {result.urls.length} URLs Google returned:</p>
              <div className="rounded-md bg-muted/60 border p-2 max-h-48 overflow-auto space-y-0.5 font-mono">
                {result.urls.map((u, i) => (
                  <div key={i} className={`flex gap-2 ${u.includes(result.targetDomain.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]) ? "text-green-600 dark:text-green-400 font-bold" : "text-muted-foreground"}`}>
                    <span className="shrink-0 w-5 text-right">{i + 1}.</span>
                    <span className="break-all">{u}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* HTML snippet */}
          <details className="group">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground select-none">
              Show raw HTML snippet (first 1500 chars)
            </summary>
            <pre className="mt-2 rounded-md bg-muted/60 border p-2 text-[10px] font-mono overflow-auto max-h-48 whitespace-pre-wrap break-all">
              {result.htmlSnippet}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
