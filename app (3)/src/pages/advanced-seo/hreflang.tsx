import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { SignInButton } from "@/components/ui/signin.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import {
  PlusIcon, TrashIcon, CopyIcon, CheckIcon, GlobeIcon,
  AlertTriangleIcon, CheckCircleIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import type { HreflangEntry } from "@/convex/advanced_seo/actions.ts";

export default function HreflangPage() {
  return (
    <>
      <AuthLoading><div className="p-8"><Skeleton className="h-64 w-full" /></div></AuthLoading>
      <Unauthenticated><div className="flex justify-center p-8"><SignInButton /></div></Unauthenticated>
      <Authenticated><HreflangContent /></Authenticated>
    </>
  );
}

type PageEntry = { url: string; lang: string };

function HreflangContent() {
  const [pages, setPages] = useState<PageEntry[]>([
    { url: "", lang: "en" },
    { url: "", lang: "es" },
  ]);
  const [addXDefault, setAddXDefault] = useState(true);
  const [xDefaultUrl, setXDefaultUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    htmlTags: string;
    xmlEntries: string;
    entries: HreflangEntry[];
    warnings: string[];
  } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const generate = useAction(api.advanced_seo.actions.generateHreflang);

  function addPage() {
    setPages((p) => [...p, { url: "", lang: "en" }]);
  }

  function removePage(i: number) {
    setPages((p) => p.filter((_, j) => j !== i));
  }

  function updatePage(i: number, field: keyof PageEntry, value: string) {
    setPages((p) => p.map((item, j) => j === i ? { ...item, [field]: value } : item));
  }

  async function handleGenerate() {
    const validPages = pages.filter((p) => p.url && p.lang);
    if (validPages.length === 0) { toast.error("Add at least one page with URL and language"); return; }
    setLoading(true);
    try {
      const res = await generate({
        pages: validPages,
        addXDefault,
        xDefaultUrl: xDefaultUrl || undefined,
      });
      setResult(res);
    } catch (e) {
      if (e instanceof ConvexError) toast.error((e.data as { message: string }).message);
      else toast.error("Failed to generate hreflang");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  const COMMON_LANGS = [
    "en", "en-US", "en-GB", "en-AU", "en-CA",
    "es", "es-ES", "es-MX", "es-AR",
    "fr", "fr-FR", "fr-CA",
    "de", "de-DE", "de-AT",
    "pt", "pt-BR", "pt-PT",
    "it", "ja", "ko", "zh", "zh-TW",
    "ar", "nl", "pl", "ru", "sv", "tr",
    "x-default",
  ];

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold">International SEO (Hreflang)</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate hreflang tags for multilingual and multi-regional websites
        </p>
      </div>

      <div className="rounded-xl border p-5 space-y-4">
        <div className="text-sm font-semibold">Page Versions</div>
        <div className="space-y-2">
          {pages.map((page, i) => (
            <div key={i} className="flex gap-2 items-end">
              <div className="flex-1">
                {i === 0 && <Label className="text-xs font-medium">Absolute URL</Label>}
                <Input
                  value={page.url}
                  onChange={(e) => updatePage(i, "url", e.target.value)}
                  className="mt-1 text-sm font-mono"
                  placeholder="https://example.com/page"
                />
              </div>
              <div className="w-36">
                {i === 0 && <Label className="text-xs font-medium">Language Tag</Label>}
                <Input
                  list="lang-list"
                  value={page.lang}
                  onChange={(e) => updatePage(i, "lang", e.target.value)}
                  className="mt-1 text-sm"
                  placeholder="en-US"
                />
              </div>
              <button
                onClick={() => removePage(i)}
                className="mb-1 text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
                disabled={pages.length <= 1}
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
          <datalist id="lang-list">
            {COMMON_LANGS.map((l) => <option key={l} value={l} />)}
          </datalist>
        </div>

        <Button variant="secondary" size="sm" onClick={addPage}>
          <PlusIcon className="h-3.5 w-3.5 mr-1.5" />Add language version
        </Button>

        {/* x-default */}
        <div className="pt-2 border-t space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={addXDefault}
              onChange={(e) => setAddXDefault(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm font-medium">Add x-default tag</span>
          </label>
          {addXDefault && (
            <div>
              <Label className="text-xs font-medium">x-default URL</Label>
              <Input
                value={xDefaultUrl}
                onChange={(e) => setXDefaultUrl(e.target.value)}
                className="mt-1 text-sm font-mono"
                placeholder="https://example.com/page (fallback URL)"
              />
            </div>
          )}
        </div>

        <Button onClick={handleGenerate} disabled={loading}>
          <GlobeIcon className="h-4 w-4 mr-1.5" />
          {loading ? "Generating…" : "Generate Hreflang Tags"}
        </Button>
      </div>

      {result && (
        <div className="space-y-4">
          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-600">
                <AlertTriangleIcon className="h-4 w-4" />Validation Warnings
              </div>
              {result.warnings.map((w, i) => (
                <div key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <div className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                  {w}
                </div>
              ))}
            </div>
          )}

          {result.warnings.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircleIcon className="h-4 w-4" />
              No validation issues found
            </div>
          )}

          {/* HTML tags */}
          <div className="rounded-xl border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">HTML &lt;head&gt; Tags</span>
              <button
                onClick={() => handleCopy(result.htmlTags, "html")}
                className="text-xs flex items-center gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {copied === "html" ? <CheckIcon className="h-3.5 w-3.5 text-green-600" /> : <CopyIcon className="h-3.5 w-3.5" />}
                {copied === "html" ? "Copied!" : "Copy"}
              </button>
            </div>
            <Textarea
              readOnly
              value={result.htmlTags}
              className="font-mono text-xs rounded-none border-0 min-h-[100px] resize-none bg-muted/10"
            />
          </div>

          {/* XML entries */}
          <div className="rounded-xl border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">XML Sitemap Entries</span>
              <button
                onClick={() => handleCopy(result.xmlEntries, "xml")}
                className="text-xs flex items-center gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {copied === "xml" ? <CheckIcon className="h-3.5 w-3.5 text-green-600" /> : <CopyIcon className="h-3.5 w-3.5" />}
                {copied === "xml" ? "Copied!" : "Copy"}
              </button>
            </div>
            <Textarea
              readOnly
              value={result.xmlEntries}
              className="font-mono text-xs rounded-none border-0 min-h-[100px] resize-none bg-muted/10"
            />
          </div>

          {/* Entries table */}
          <div className="rounded-xl border overflow-hidden">
            <div className="px-4 py-3 border-b text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Generated Entries ({result.entries.length})
            </div>
            <div className="divide-y">
              {result.entries.map((entry, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                  <Badge variant="secondary" className="text-xs font-mono shrink-0">{entry.hreflangValue}</Badge>
                  <span className="text-xs font-mono text-muted-foreground truncate">{entry.url}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
