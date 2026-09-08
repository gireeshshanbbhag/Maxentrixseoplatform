import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { SparklesIcon, CopyIcon, CheckIcon } from "lucide-react";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import type { MetaVariation } from "@/convex/content/actions.ts";

export default function MetaGenerator({ project }: { project: Doc<"projects"> }) {
  const [keyword, setKeyword] = useState("");
  const [pageType, setPageType] = useState("blog post");
  const [loading, setLoading] = useState(false);
  const [variations, setVariations] = useState<MetaVariation[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const generateMeta = useAction(api.content.actions.generateMeta);

  async function handleGenerate() {
    if (!keyword.trim()) { toast.error("Enter a keyword"); return; }
    setLoading(true);
    try {
      const result = await generateMeta({
        keyword,
        pageType,
        brand: project.businessName ?? project.name,
      });
      setVariations(result);
    } catch (e) {
      if (e instanceof ConvexError) toast.error((e.data as { message: string }).message);
      else toast.error("Failed to generate meta tags");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  function titleColor(len: number) {
    if (len <= 60) return "text-green-600 dark:text-green-400";
    if (len <= 65) return "text-amber-600";
    return "text-red-500";
  }

  function descColor(len: number) {
    if (len <= 160) return "text-green-600 dark:text-green-400";
    if (len <= 170) return "text-amber-600";
    return "text-red-500";
  }

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-bold">Meta Tag Generator</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Generate 5 diverse meta title and description variations — each with a different angle.
        </p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Label className="text-xs font-medium">Target Keyword</Label>
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
            placeholder="e.g. project management software"
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs font-medium">Page Type</Label>
          <Select value={pageType} onValueChange={setPageType}>
            <SelectTrigger className="mt-1 w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["blog post","landing page","product page","homepage","category page"].map((t) => (
                <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button onClick={handleGenerate} disabled={loading || !keyword.trim()}>
            <SparklesIcon className="h-4 w-4 mr-1.5" />
            {loading ? "Generating…" : "Generate 5 Variations"}
          </Button>
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      )}

      {variations.length > 0 && (
        <div className="space-y-3">
          {variations.map((v, i) => (
            <div key={i} className="rounded-xl border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">Variation {i + 1}</span>
              </div>

              {/* Title */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">Meta Title</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${titleColor(v.title.length)}`}>
                      {v.title.length}/60
                    </span>
                    <button
                      onClick={() => handleCopy(v.title, `title-${i}`)}
                      className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      {copied === `title-${i}` ? (
                        <CheckIcon className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <CopyIcon className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
                <p className="text-sm font-medium bg-muted/40 rounded px-3 py-2">{v.title}</p>
              </div>

              {/* Description */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">Meta Description</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${descColor(v.description.length)}`}>
                      {v.description.length}/160
                    </span>
                    <button
                      onClick={() => handleCopy(v.description, `desc-${i}`)}
                      className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      {copied === `desc-${i}` ? (
                        <CheckIcon className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <CopyIcon className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground bg-muted/40 rounded px-3 py-2">{v.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
