import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { PlusIcon, TrashIcon, RefreshCwIcon, CheckCircleIcon, AlertCircleIcon } from "lucide-react";

type Props = {
  siteUrl: string;
};

type Sitemap = {
  path?: string;
  lastSubmitted?: string;
  isPending?: boolean;
  isSitemapsIndex?: boolean;
  type?: string;
  lastDownloaded?: string;
  warnings?: number;
  errors?: number;
  contents?: Array<{ type?: string; submitted?: number; indexed?: number }>;
};

type SitemapsResponse = {
  sitemap?: Sitemap[];
};

export default function GscSitemaps({ siteUrl }: Props) {
  const [sitemaps, setSitemaps] = useState<Sitemap[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const listSitemaps = useAction(api.gsc.actions.listSitemaps);
  const submitSitemap = useAction(api.gsc.actions.submitSitemap);
  const deleteSitemap = useAction(api.gsc.actions.deleteSitemap);

  async function load() {
    setLoading(true);
    try {
      const data = await listSitemaps({ siteUrl }) as SitemapsResponse;
      setSitemaps(data.sitemap ?? []);
      setLoaded(true);
    } catch (e) {
      if (e instanceof ConvexError) {
        toast.error((e.data as { message: string }).message);
      } else {
        toast.error("Failed to load sitemaps");
      }
    } finally {
      setLoading(false);
    }
  }

  if (!loaded && !loading) load();

  async function handleSubmit() {
    if (!newUrl.trim()) return;
    setSubmitting(true);
    try {
      await submitSitemap({ siteUrl, feedpath: newUrl.trim() });
      toast.success("Sitemap submitted");
      setNewUrl("");
      setLoaded(false);
      setSitemaps(null);
      load();
    } catch (e) {
      if (e instanceof ConvexError) {
        toast.error((e.data as { message: string }).message);
      } else {
        toast.error("Failed to submit sitemap");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(feedpath: string) {
    try {
      await deleteSitemap({ siteUrl, feedpath });
      toast.success("Sitemap removed");
      setSitemaps((prev) => prev?.filter((s) => s.path !== feedpath) ?? null);
    } catch (e) {
      if (e instanceof ConvexError) {
        toast.error((e.data as { message: string }).message);
      } else {
        toast.error("Failed to remove sitemap");
      }
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Sitemaps</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage XML sitemaps submitted to Google Search Console
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { setLoaded(false); setSitemaps(null); load(); }}
          disabled={loading}
        >
          <RefreshCwIcon className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Submit new */}
      <div className="flex gap-2">
        <Input
          placeholder="https://example.com/sitemap.xml"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          className="flex-1"
        />
        <Button onClick={handleSubmit} disabled={submitting || !newUrl.trim()} size="sm">
          <PlusIcon className="h-4 w-4 mr-1.5" />
          Submit
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : sitemaps?.length === 0 ? (
        <div className="rounded-xl border py-10 text-center text-sm text-muted-foreground">
          No sitemaps submitted yet
        </div>
      ) : (
        <div className="rounded-xl border divide-y overflow-hidden">
          {sitemaps?.map((sm) => {
            const hasErrors = (sm.errors ?? 0) > 0;
            const hasWarnings = (sm.warnings ?? 0) > 0;
            const contents = sm.contents?.[0];
            return (
              <div key={sm.path} className="px-4 py-3 flex items-start gap-3">
                <div className="mt-0.5">
                  {hasErrors ? (
                    <AlertCircleIcon className="h-4 w-4 text-red-500" />
                  ) : (
                    <CheckCircleIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{sm.path}</div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {contents && (
                      <>
                        <span className="text-xs text-muted-foreground">
                          {contents.submitted?.toLocaleString()} submitted
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {contents.indexed?.toLocaleString()} indexed
                        </span>
                      </>
                    )}
                    {hasErrors && (
                      <Badge variant="destructive" className="text-xs px-1.5 py-0">
                        {sm.errors} errors
                      </Badge>
                    )}
                    {hasWarnings && (
                      <Badge variant="secondary" className="text-xs px-1.5 py-0 text-amber-600">
                        {sm.warnings} warnings
                      </Badge>
                    )}
                    {sm.lastSubmitted && (
                      <span className="text-xs text-muted-foreground">
                        Submitted {new Date(sm.lastSubmitted).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => sm.path && handleDelete(sm.path)}
                >
                  <TrashIcon className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
