import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useCurrentProject } from "@/hooks/use-current-project.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select.tsx";
import {
  MapIcon, RefreshCwIcon, ExternalLinkIcon, CheckCircleIcon,
  AlertTriangleIcon, SearchIcon, ChevronRightIcon, FileTextIcon,
  LayersIcon, Trash2Icon, CheckSquareIcon, XSquareIcon, SendIcon,
} from "lucide-react";
import {
  Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription,
} from "@/components/ui/empty.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { format } from "date-fns";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

type SitemapUrl = {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
};

type SitemapResult = {
  urls: SitemapUrl[];
  sitemapIndexUrls: string[];
  totalCount: number;
  isSitemapIndex: boolean;
  fetchedAt: string;
};

export default function SitemapsPage() {
  return (
    <>
      <AuthLoading><div className="p-8"><Skeleton className="h-64 w-full" /></div></AuthLoading>
      <Unauthenticated><div className="flex justify-center p-8"><SignInButton /></div></Unauthenticated>
      <Authenticated><SitemapsContent /></Authenticated>
    </>
  );
}

function SitemapsContent() {
  const { activeProjectId } = useCurrentProject();
  const projects = useQuery(api.projects.list, {});
  const project = projects?.find((p) => p._id === activeProjectId);

  const fetchSitemap = useAction(api.technical_seo.actions.fetchSitemap);
  const fetchRobotsTxt = useAction(api.technical_seo.actions.fetchRobotsTxt);
  const addRemovalRequests = useMutation(api.url_removal.mutations.addRequests);

  const [loading, setLoading] = useState(false);
  const [customUrl, setCustomUrl] = useState("");
  const [sitemapResult, setSitemapResult] = useState<SitemapResult | null>(null);
  const [sitemapSource, setSitemapSource] = useState("");
  const [robotsSitemaps, setRobotsSitemaps] = useState<string[]>([]);
  const [robotsLoaded, setRobotsLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [removalDialogOpen, setRemovalDialogOpen] = useState(false);

  if (!activeProjectId || !project) {
    return (
      <div className="p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><MapIcon /></EmptyMedia>
            <EmptyTitle>No project selected</EmptyTitle>
            <EmptyDescription>Select a project to manage sitemaps</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const defaultSitemapUrl = project.websiteUrl.replace(/\/$/, "") + "/sitemap.xml";

  async function discoverFromRobots() {
    setLoading(true);
    try {
      const result = await fetchRobotsTxt({ websiteUrl: project!.websiteUrl });
      setRobotsSitemaps(result.sitemapUrls);
      setRobotsLoaded(true);
      if (result.sitemapUrls.length === 0) {
        toast.info("No sitemaps declared in robots.txt");
      } else {
        toast.success(`Found ${result.sitemapUrls.length} sitemap(s) in robots.txt`);
      }
    } catch (e) {
      const msg = e instanceof ConvexError ? (e.data as { message: string }).message : "Failed to fetch robots.txt";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function loadSitemap(url: string) {
    setLoading(true);
    setSitemapSource(url);
    setSelectedUrls(new Set());
    try {
      const result = await fetchSitemap({ sitemapUrl: url });
      setSitemapResult(result);
      toast.success(`Loaded ${result.totalCount} URL(s) from sitemap`);
    } catch (e) {
      const msg = e instanceof ConvexError ? (e.data as { message: string }).message : "Failed to fetch sitemap";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  const filteredUrls = sitemapResult?.urls.filter((u) =>
    !search || u.loc.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const withLastmod = sitemapResult?.urls.filter((u) => u.lastmod).length ?? 0;
  const withPriority = sitemapResult?.urls.filter((u) => u.priority).length ?? 0;
  const highPriority = sitemapResult?.urls.filter((u) => parseFloat(u.priority ?? "0") >= 0.8).length ?? 0;
  const noLastmod = (sitemapResult?.urls.length ?? 0) - withLastmod;

  function toggleUrl(url: string) {
    setSelectedUrls((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  }

  function selectAll() {
    setSelectedUrls(new Set(filteredUrls.slice(0, 200).map((u) => u.loc)));
  }

  function clearSelection() {
    setSelectedUrls(new Set());
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <MapIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Sitemaps</h1>
              <p className="text-sm text-muted-foreground">Fetch, validate, and submit URL removal requests</p>
            </div>
          </div>
          <a href="https://search.google.com/search-console/removals" target="_blank" rel="noopener noreferrer">
            <Button variant="secondary" size="sm">
              <ExternalLinkIcon className="h-3.5 w-3.5 mr-1.5" />
              Open GSC Removals Tool
            </Button>
          </a>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-5xl">

        {/* Load Sitemap Panel */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="font-semibold flex items-center gap-2 text-sm">
            <MapIcon className="h-4 w-4 text-primary" /> Load a Sitemap
          </h2>

          <div className="space-y-3">
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={discoverFromRobots} disabled={loading}>
                <SearchIcon className="h-3.5 w-3.5 mr-1.5" />
                Discover from robots.txt
              </Button>
              <Button size="sm" onClick={() => loadSitemap(defaultSitemapUrl)} disabled={loading}>
                {loading ? <RefreshCwIcon className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <MapIcon className="h-3.5 w-3.5 mr-1.5" />}
                Load /sitemap.xml
              </Button>
            </div>

            {robotsLoaded && robotsSitemaps.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Sitemaps from robots.txt:</p>
                {robotsSitemaps.map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <button onClick={() => loadSitemap(s)} className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer">
                      <ChevronRightIcon className="h-3 w-3" />
                      {s.length > 70 ? s.slice(0, 67) + "…" : s}
                    </button>
                    <a href={s} target="_blank" rel="noopener noreferrer">
                      <ExternalLinkIcon className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                    </a>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://yoursite.com/sitemap-news.xml"
                className="text-sm"
                onKeyDown={(e) => e.key === "Enter" && customUrl && loadSitemap(customUrl)}
              />
              <Button size="sm" variant="secondary" onClick={() => customUrl && loadSitemap(customUrl)} disabled={!customUrl || loading}>
                Load
              </Button>
            </div>
          </div>
        </div>

        {/* Results */}
        {sitemapResult && (
          <>
            {/* Summary */}
            <div className="rounded-xl border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="font-semibold">Sitemap Analysis</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {sitemapSource.length > 60 ? "…" + sitemapSource.slice(-57) : sitemapSource}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {sitemapResult.isSitemapIndex && (
                    <Badge variant="secondary" className="text-xs flex items-center gap-1">
                      <LayersIcon className="h-3 w-3" /> Sitemap Index
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-xs">
                    {sitemapResult.totalCount.toLocaleString()} URL{sitemapResult.totalCount !== 1 ? "s" : ""}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Fetched {format(new Date(sitemapResult.fetchedAt), "MMM d, h:mm a")}
                  </span>
                </div>
              </div>

              {!sitemapResult.isSitemapIndex && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">Total URLs</p>
                    <p className="text-xl font-bold mt-1">{sitemapResult.totalCount.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">With Last Modified</p>
                    <p className="text-xl font-bold mt-1">{withLastmod}</p>
                    {noLastmod > 0 && <p className="text-xs text-amber-600 mt-0.5">{noLastmod} missing</p>}
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">With Priority</p>
                    <p className="text-xl font-bold mt-1">{withPriority}</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">High Priority (≥0.8)</p>
                    <p className="text-xl font-bold mt-1">{highPriority}</p>
                  </div>
                </div>
              )}

              {sitemapResult.isSitemapIndex && sitemapResult.sitemapIndexUrls.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Child Sitemaps ({sitemapResult.sitemapIndexUrls.length})</p>
                  <div className="space-y-1">
                    {sitemapResult.sitemapIndexUrls.map((s) => (
                      <div key={s} className="flex items-center gap-2 text-sm">
                        <FileTextIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <button onClick={() => loadSitemap(s)} className="text-primary hover:underline text-left truncate cursor-pointer">{s}</button>
                        <a href={s} target="_blank" rel="noopener noreferrer">
                          <ExternalLinkIcon className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* URL List with bulk select */}
            {!sitemapResult.isSitemapIndex && sitemapResult.urls.length > 0 && (
              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <h2 className="font-semibold text-sm">URLs in Sitemap</h2>
                    {selectedUrls.size > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {selectedUrls.size} selected
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Bulk selection controls */}
                    <button onClick={selectAll} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer">
                      <CheckSquareIcon className="h-3.5 w-3.5" /> Select all
                    </button>
                    {selectedUrls.size > 0 && (
                      <button onClick={clearSelection} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer">
                        <XSquareIcon className="h-3.5 w-3.5" /> Clear
                      </button>
                    )}
                    {selectedUrls.size > 0 && (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 text-xs"
                        onClick={() => setRemovalDialogOpen(true)}
                      >
                        <Trash2Icon className="h-3.5 w-3.5 mr-1.5" />
                        Request removal ({selectedUrls.size})
                      </Button>
                    )}
                    <div className="relative">
                      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        className="pl-8 h-8 text-xs w-56"
                        placeholder="Filter URLs…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <div className="divide-y max-h-[500px] overflow-auto">
                  {filteredUrls.slice(0, 200).map((url) => (
                    <div
                      key={url.loc}
                      className={`px-4 py-2.5 hover:bg-accent/30 transition-colors flex items-start gap-3 cursor-pointer ${selectedUrls.has(url.loc) ? "bg-primary/5" : ""}`}
                      onClick={() => toggleUrl(url.loc)}
                    >
                      <div className="pt-0.5 shrink-0">
                        <Checkbox
                          checked={selectedUrls.has(url.loc)}
                          onCheckedChange={() => toggleUrl(url.loc)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <a
                          href={url.loc}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline truncate block"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {url.loc}
                        </a>
                        <div className="flex gap-3 mt-1">
                          {url.lastmod && <span className="text-[10px] text-muted-foreground">Modified: {url.lastmod}</span>}
                          {url.changefreq && <span className="text-[10px] text-muted-foreground capitalize">{url.changefreq}</span>}
                          {url.priority && <span className="text-[10px] text-muted-foreground">Priority: {url.priority}</span>}
                        </div>
                      </div>
                      <button
                        className="shrink-0 p-1 text-muted-foreground hover:text-destructive transition-colors cursor-pointer rounded"
                        title="Request removal for this URL"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedUrls(new Set([url.loc]));
                          setRemovalDialogOpen(true);
                        }}
                      >
                        <Trash2Icon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {filteredUrls.length > 200 && (
                    <div className="px-4 py-2 text-xs text-muted-foreground text-center">
                      Showing first 200 of {filteredUrls.length} results
                    </div>
                  )}
                </div>
                {/* Sticky bottom selection bar */}
                {selectedUrls.size > 0 && (
                  <div className="border-t bg-muted/60 px-4 py-2.5 flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">{selectedUrls.size} URL{selectedUrls.size !== 1 ? "s" : ""} selected</span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={clearSelection} className="h-7 text-xs">
                        Clear selection
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setRemovalDialogOpen(true)} className="h-7 text-xs">
                        <Trash2Icon className="h-3.5 w-3.5 mr-1.5" />
                        Request removal ({selectedUrls.size})
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {!sitemapResult && !loading && (
          <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
            <MapIcon className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Click "Load /sitemap.xml" or "Discover from robots.txt" to get started</p>
          </div>
        )}

      </div>

      {removalDialogOpen && activeProjectId && (
        <RemovalRequestDialog
          open={removalDialogOpen}
          onOpenChange={setRemovalDialogOpen}
          projectId={activeProjectId}
          urls={Array.from(selectedUrls)}
          onSuccess={() => {
            setSelectedUrls(new Set());
            setRemovalDialogOpen(false);
          }}
        />
      )}
    </div>
  );
}

function RemovalRequestDialog({
  open, onOpenChange, projectId, urls, onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: Id<"projects">;
  urls: string[];
  onSuccess: () => void;
}) {
  const [reason, setReason] = useState("outdated_content");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const addRequests = useMutation(api.url_removal.mutations.addRequests);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const result = await addRequests({ projectId, urls, reason, notes: notes || undefined });
      toast.success(`Added ${result.added} URL${result.added !== 1 ? "s" : ""} to removal queue${result.skipped > 0 ? ` (${result.skipped} already queued)` : ""}`);
      onSuccess();
    } catch (e) {
      const msg = e instanceof ConvexError ? (e.data as { message: string }).message : "Failed to add requests";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2Icon className="h-5 w-5 text-destructive" />
            Request URL Removal from Google
          </DialogTitle>
          <DialogDescription>
            Google does not have a direct API for URL removal. These URLs will be saved to your removal queue, and you can submit them one-by-one via Google Search Console's URL Removal Tool.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Info banner */}
          <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-3 flex items-start gap-2">
            <AlertTriangleIcon className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
              URL removal must be done manually in Google Search Console — Google does not allow automated removal submissions. We'll save these to your queue and open GSC for you.
            </p>
          </div>

          {/* URLs summary */}
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs font-semibold text-muted-foreground mb-2">{urls.length} URL{urls.length !== 1 ? "s" : ""} to remove:</p>
            <div className="space-y-1 max-h-32 overflow-auto">
              {urls.slice(0, 10).map((u) => (
                <p key={u} className="text-xs text-foreground truncate">{u}</p>
              ))}
              {urls.length > 10 && (
                <p className="text-xs text-muted-foreground">…and {urls.length - 10} more</p>
              )}
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="outdated_content">Outdated content</SelectItem>
                <SelectItem value="other_content">Other content issue</SelectItem>
                <SelectItem value="clear_cache">Clear cached version only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Pages deleted, 404s, old content no longer relevant"
              rows={2}
              className="resize-none text-sm"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting
              ? <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />
              : <SendIcon className="h-4 w-4 mr-2" />
            }
            Save to Queue
          </Button>
          <a
            href="https://search.google.com/search-console/removals"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="secondary" type="button">
              <ExternalLinkIcon className="h-4 w-4 mr-2" />
              Open GSC Tool
            </Button>
          </a>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
