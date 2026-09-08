import { useState, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useCurrentProject } from "@/hooks/use-current-project.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select.tsx";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog.tsx";
import {
  FileTextIcon, RefreshCwIcon, SearchIcon, Trash2Icon, ExternalLinkIcon,
  MapIcon, CheckCircleIcon, AlertTriangleIcon, XCircleIcon, CheckSquareIcon,
  XSquareIcon, PlugIcon, FilterIcon, EyeOffIcon, LinkIcon,
} from "lucide-react";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";

type CmsPost = {
  id: string | number;
  title: string;
  slug: string;
  url: string;
  status: string;
  type: string;
  date: string;
  modifiedDate: string;
  seoTitle?: string;
  seoDescription?: string;
};

type CmsSitemap = {
  name: string;
  url: string;
  type: string;
};

type Connection = Doc<"cmsConnections">;

const STATUS_COLORS: Record<string, string> = {
  publish: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  draft: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  private: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
  trash: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  archived: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
};

export default function CmsContentPage() {
  return (
    <>
      <AuthLoading><div className="p-8"><Skeleton className="h-64 w-full" /></div></AuthLoading>
      <Unauthenticated><div className="flex justify-center p-8"><SignInButton /></div></Unauthenticated>
      <Authenticated><CmsContentContent /></Authenticated>
    </>
  );
}

function CmsContentContent() {
  const { activeProjectId } = useCurrentProject();
  const connections = useQuery(api.cms.queries.listConnections, activeProjectId ? { projectId: activeProjectId } : "skip");

  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);

  // Auto-select first active connection
  useEffect(() => {
    if (connections && connections.length > 0 && !selectedConnection) {
      setSelectedConnection(connections[0]);
    }
  }, [connections]);

  if (!activeProjectId) {
    return (
      <div className="p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><FileTextIcon /></EmptyMedia>
            <EmptyTitle>No project selected</EmptyTitle>
            <EmptyDescription>Select a project to manage CMS content</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  if (connections === undefined) {
    return <div className="p-6"><Skeleton className="h-64 w-full" /></div>;
  }

  if (connections.length === 0) {
    return (
      <div className="p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><PlugIcon /></EmptyMedia>
            <EmptyTitle>No CMS connected</EmptyTitle>
            <EmptyDescription>Connect a CMS to browse and manage your content</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link to="/cms/connections">
              <Button size="sm">Connect a CMS</Button>
            </Link>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  const platformLabel = (p: string) =>
    ({ wordpress: "WordPress", webflow: "Webflow", wix: "Wix", hercules: "Hercules" })[p] ?? p;

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <FileTextIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">CMS Content Manager</h1>
              <p className="text-sm text-muted-foreground">Browse, delete, and manage content across your connected CMS</p>
            </div>
          </div>
          {connections.length > 1 && (
            <Select
              value={selectedConnection?._id ?? ""}
              onValueChange={(id) => setSelectedConnection(connections.find((c) => c._id === id) ?? null)}
            >
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Select CMS" />
              </SelectTrigger>
              <SelectContent>
                {connections.map((c) => (
                  <SelectItem key={c._id} value={c._id}>
                    {platformLabel(c.platform)}: {c.label ?? c.siteUrl}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {selectedConnection && (
        <ContentBrowser connection={selectedConnection} projectId={activeProjectId} />
      )}
    </div>
  );
}

function ContentBrowser({ connection, projectId }: { connection: Connection; projectId: Id<"projects"> }) {
  const [tab, setTab] = useState<"posts" | "pages" | "products" | "sitemaps">("posts");
  const [items, setItems] = useState<CmsPost[]>([]);
  const [sitemaps, setSitemaps] = useState<CmsSitemap[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [permanentDelete, setPermanentDelete] = useState(false);
  // null = not checked yet, false = not available, true = available
  const [wooCommerceAvailable, setWooCommerceAvailable] = useState<boolean | null>(null);

  const listWpContent = useAction(api.cms.actions.listWordPressContent);
  const deleteWpPost = useAction(api.cms.actions.deleteWordPressPost);
  const listWpSitemaps = useAction(api.cms.actions.listWordPressSitemaps);
  const listWebflowPages = useAction(api.cms.actions.listWebflowPages);
  const listWixPages = useAction(api.cms.actions.listWixPages);
  const checkWooCommerce = useAction(api.cms.actions.checkWooCommerce);

  const isWordPress = connection.platform === "wordpress";

  // Probe WooCommerce availability once when a WordPress connection is loaded
  useEffect(() => {
    if (!isWordPress) return;
    setWooCommerceAvailable(null);
    void checkWooCommerce({ siteUrl: connection.siteUrl, credentials: connection.credentials })
      .then(({ available }) => setWooCommerceAvailable(available))
      .catch(() => setWooCommerceAvailable(false));
  }, [connection._id]);

  // If currently on the products tab and WooCommerce turned out unavailable, fall back to posts
  useEffect(() => {
    if (tab === "products" && wooCommerceAvailable === false) {
      setTab("posts");
    }
  }, [wooCommerceAvailable]);

  function getCredentials(): { token?: string; siteId?: string; raw: string } {
    try {
      const parsed = JSON.parse(connection.credentials) as { token?: string; siteId?: string };
      return { ...parsed, raw: connection.credentials };
    } catch {
      return { raw: connection.credentials };
    }
  }

  async function fetchContent() {
    setLoading(true);
    setSelectedIds(new Set());
    try {
      if (connection.platform === "wordpress") {
        if (tab === "sitemaps") {
          const result = await listWpSitemaps({ siteUrl: connection.siteUrl, credentials: connection.credentials });
          setSitemaps(result);
        } else {
          const result = await listWpContent({
            siteUrl: connection.siteUrl,
            credentials: connection.credentials,
            type: tab as "posts" | "pages" | "products",
            status: tab === "products"
              ? (statusFilter !== "all" ? statusFilter : undefined)
              : (statusFilter === "all" ? "publish,draft,private" : statusFilter),
            perPage: 20,
            page: currentPage,
            search: search || undefined,
          });
          setItems(result.items);
          setTotal(result.total);
          setTotalPages(result.totalPages);
        }
      } else if (connection.platform === "webflow") {
        const { token, siteId } = getCredentials();
        if (!token || !siteId) { toast.error("Webflow connection missing API token or Site ID — reconnect it"); return; }
        const result = await listWebflowPages({ apiToken: token, siteId });
        setItems(result.items);
        setTotal(result.total);
      } else if (connection.platform === "wix") {
        const { token, siteId } = getCredentials();
        if (!token || !siteId) { toast.error("Wix connection missing API key or Site ID — reconnect it"); return; }
        const result = await listWixPages({ apiKey: token, siteId });
        setItems(result.items);
        setTotal(result.total);
      } else if (connection.platform === "hercules") {
        // For Hercules apps: use the sitemap to show pages
        toast.info("For Hercules apps, use the Sitemaps page to browse pages and the URL Removal page to remove them");
        return;
      }
    } catch (e) {
      const msg = e instanceof ConvexError ? (e.data as { message: string }).message : "Failed to fetch content";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchContent();
  }, [tab, currentPage, connection._id]);

  async function handleBulkDelete() {
    if (connection.platform !== "wordpress") {
      toast.error(`Deletion is only supported for WordPress. For ${connection.platform}, manage content in their editor.`);
      return;
    }
    const ids = Array.from(selectedIds);
    let deleted = 0;
    for (const id of ids) {
      try {
        await deleteWpPost({ siteUrl: connection.siteUrl, credentials: connection.credentials, postId: Number(id), force: permanentDelete });
        deleted++;
      } catch {
        /* continue */
      }
    }
    toast.success(`${deleted} item${deleted !== 1 ? "s" : ""} ${permanentDelete ? "permanently deleted" : "moved to trash"}`);
    setDeleteDialogOpen(false);
    setSelectedIds(new Set());
    void fetchContent();
  }

  function toggleSelect(id: string | number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() { setSelectedIds(new Set(items.map((i) => i.id))); }
  function clearSelection() { setSelectedIds(new Set()); }

  const canDelete = isWordPress;

  const filteredItems = items.filter((i) =>
    (!search || i.title.toLowerCase().includes(search.toLowerCase()) || i.url.toLowerCase().includes(search.toLowerCase())) &&
    (statusFilter === "all" || i.status === statusFilter)
  );

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Tab bar */}
      <div className="border-b px-6 flex items-center gap-1">
        {(["posts", "pages"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setCurrentPage(1); }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer capitalize ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {t}
            {tab === t && total > 0 && <span className="ml-2 text-xs text-muted-foreground">({total})</span>}
          </button>
        ))}
        {isWordPress && wooCommerceAvailable === true && (
          <button
            onClick={() => { setTab("products"); setCurrentPage(1); }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer ${tab === "products" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            Products
            {tab === "products" && total > 0 && <span className="ml-2 text-xs text-muted-foreground">({total})</span>}
          </button>
        )}
        {isWordPress && (
          <button
            onClick={() => setTab("sitemaps")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer ${tab === "sitemaps" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            Sitemaps
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-5 space-y-4">
        {tab !== "sitemaps" && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="pl-8 h-8 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search titles or URLs…"
                onKeyDown={(e) => e.key === "Enter" && fetchContent()}
              />
            </div>
            {isWordPress && (
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="publish">Published</SelectItem>
                  <SelectItem value="draft">Drafts</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="trash">Trash</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Button size="sm" variant="secondary" onClick={fetchContent} disabled={loading} className="h-8">
              {loading ? <RefreshCwIcon className="h-3.5 w-3.5 animate-spin" /> : <RefreshCwIcon className="h-3.5 w-3.5" />}
            </Button>
            {selectedIds.size > 0 && canDelete && (
              <Button size="sm" variant="destructive" onClick={() => setDeleteDialogOpen(true)} className="h-8 text-xs ml-auto">
                <Trash2Icon className="h-3.5 w-3.5 mr-1.5" />Delete ({selectedIds.size})
              </Button>
            )}
            {filteredItems.length > 0 && (
              <div className="flex gap-2 items-center text-xs text-muted-foreground ml-auto">
                <button onClick={selectAll} className="hover:text-foreground cursor-pointer flex items-center gap-1">
                  <CheckSquareIcon className="h-3.5 w-3.5" />All
                </button>
                {selectedIds.size > 0 && (
                  <button onClick={clearSelection} className="hover:text-foreground cursor-pointer flex items-center gap-1">
                    <XSquareIcon className="h-3.5 w-3.5" />Clear
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {loading && (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        )}

        {!loading && tab === "sitemaps" && (
          <SitemapsList sitemaps={sitemaps} onRefresh={fetchContent} />
        )}

        {!loading && tab !== "sitemaps" && (
          <>
            {filteredItems.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon"><FileTextIcon /></EmptyMedia>
                  <EmptyTitle>No {tab} found</EmptyTitle>
                  <EmptyDescription>
                    {search ? "Try a different search term" : `No ${tab} in this status filter`}
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button size="sm" variant="secondary" onClick={fetchContent}>
                    <RefreshCwIcon className="h-3.5 w-3.5 mr-1.5" />Refresh
                  </Button>
                </EmptyContent>
              </Empty>
            ) : (
              <div className="rounded-xl border overflow-hidden">
                <div className="divide-y max-h-[600px] overflow-auto">
                  {filteredItems.map((item) => (
                    <ContentRow
                      key={item.id}
                      item={item}
                      selected={selectedIds.has(item.id)}
                      onToggle={() => toggleSelect(item.id)}
                      canDelete={canDelete}
                      onDelete={() => {
                        setSelectedIds(new Set([item.id]));
                        setDeleteDialogOpen(true);
                      }}
                    />
                  ))}
                </div>
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="border-t px-4 py-2.5 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Page {currentPage} of {totalPages} · {total} total</span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" className="h-7 text-xs" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)}>← Prev</Button>
                      <Button size="sm" variant="secondary" className="h-7 text-xs" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}>Next →</Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        count={selectedIds.size}
        permanent={permanentDelete}
        onPermanentChange={setPermanentDelete}
        onConfirm={handleBulkDelete}
      />
    </div>
  );
}

function ContentRow({ item, selected, onToggle, canDelete, onDelete }: {
  item: CmsPost;
  selected: boolean;
  onToggle: () => void;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const hasSeoIssues = !item.seoTitle || !item.seoDescription;

  return (
    <div
      className={`px-4 py-3 hover:bg-accent/20 transition-colors flex items-start gap-3 cursor-pointer ${selected ? "bg-primary/5" : ""}`}
      onClick={onToggle}
    >
      <div className="pt-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={selected} onCheckedChange={onToggle} />
      </div>
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate max-w-xs">{item.title || "(No title)"}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[item.status] ?? "bg-muted text-muted-foreground"}`}>
            {item.status}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground capitalize">{item.type}</span>
          {hasSeoIssues && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 flex items-center gap-0.5">
              <AlertTriangleIcon className="h-3 w-3" /> SEO issue
            </span>
          )}
        </div>
        <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
          <a href={item.url} target="_blank" rel="noopener noreferrer"
            className="hover:text-primary flex items-center gap-0.5 truncate max-w-xs"
            onClick={(e) => e.stopPropagation()}>
            {item.url} <ExternalLinkIcon className="h-3 w-3 shrink-0" />
          </a>
          <span>Modified {format(new Date(item.modifiedDate), "MMM d, yyyy")}</span>
          {item.seoTitle && <span className="text-green-600 flex items-center gap-0.5"><CheckCircleIcon className="h-3 w-3" />SEO title</span>}
          {item.seoDescription && <span className="text-green-600 flex items-center gap-0.5"><CheckCircleIcon className="h-3 w-3" />Meta desc</span>}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Link to={`/cms/internal-links?url=${encodeURIComponent(item.url)}&title=${encodeURIComponent(item.title)}`} onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Get internal link suggestions">
            <LinkIcon className="h-3.5 w-3.5" />
          </Button>
        </Link>
        {canDelete && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            title="Delete"
          >
            <Trash2Icon className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function SitemapsList({ sitemaps, onRefresh }: { sitemaps: CmsSitemap[]; onRefresh: () => void }) {
  if (sitemaps.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><MapIcon /></EmptyMedia>
          <EmptyTitle>No sitemaps found</EmptyTitle>
          <EmptyDescription>Click refresh to detect Yoast / RankMath sitemaps</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button size="sm" variant="secondary" onClick={onRefresh}>
            <RefreshCwIcon className="h-3.5 w-3.5 mr-1.5" />Refresh
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="rounded-xl border overflow-hidden">
      <div className="px-4 py-2.5 border-b bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Detected Sitemaps ({sitemaps.length})
      </div>
      <div className="divide-y">
        {sitemaps.map((s) => (
          <div key={s.url} className="px-4 py-3 flex items-center gap-3">
            <MapIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{s.name}</p>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                {s.url} <ExternalLinkIcon className="h-3 w-3" />
              </a>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">{s.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DeleteConfirmDialog({
  open, onOpenChange, count, permanent, onPermanentChange, onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  count: number;
  permanent: boolean;
  onPermanentChange: (v: boolean) => void;
  onConfirm: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    await onConfirm();
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2Icon className="h-5 w-5" /> Delete {count} item{count !== 1 ? "s" : ""}?
          </DialogTitle>
          <DialogDescription>
            This will delete the selected content from your WordPress site.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent/30" onClick={() => onPermanentChange(false)}>
            <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${!permanent ? "border-primary" : "border-muted"}`}>
              {!permanent && <div className="h-2 w-2 rounded-full bg-primary" />}
            </div>
            <div>
              <p className="text-sm font-medium">Move to trash</p>
              <p className="text-xs text-muted-foreground">Recoverable from WordPress trash</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent/30" onClick={() => onPermanentChange(true)}>
            <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${permanent ? "border-destructive" : "border-muted"}`}>
              {permanent && <div className="h-2 w-2 rounded-full bg-destructive" />}
            </div>
            <div>
              <p className="text-sm font-medium text-destructive">Permanently delete</p>
              <p className="text-xs text-muted-foreground">Cannot be undone</p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading}>
            {loading ? <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" /> : <Trash2Icon className="h-4 w-4 mr-2" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
