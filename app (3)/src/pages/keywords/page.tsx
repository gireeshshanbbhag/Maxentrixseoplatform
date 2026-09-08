import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useCurrentProject } from "@/hooks/use-current-project.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.tsx";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import {
  TargetIcon,
  PlusIcon,
  SearchIcon,
  MoreHorizontalIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  MinusIcon,
  FilterIcon,
  UploadIcon,
  TrashIcon,
  RefreshCwIcon,
  CopyIcon,
  DownloadIcon,
  CheckCircleIcon,
} from "lucide-react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import AddKeywordDialog from "./_components/add-keyword-dialog.tsx";
import CsvImportDialog from "./_components/csv-import-dialog.tsx";
import KeywordDetailSheet from "./_components/keyword-detail-sheet.tsx";
import KeywordStatsBar from "./_components/keyword-stats-bar.tsx";
import SerpDebugPanel from "./_components/serp-debug-panel.tsx";
import ManualSerpChecker from "./_components/manual-serp-checker.tsx";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

const INTENT_LABELS: Record<string, string> = {
  informational: "Info",
  navigational: "Nav",
  commercial: "Comm",
  transactional: "Trans",
};

const INTENT_COLORS: Record<string, string> = {
  informational: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  navigational: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  commercial: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  transactional: "bg-green-500/10 text-green-600 dark:text-green-400",
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-500/10 text-red-600 dark:text-red-400",
  medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  low: "bg-muted text-muted-foreground",
};

function PositionBadge({ position, previous, label }: { position?: number; previous?: number; label?: string }) {
  if (position === undefined) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  // positive change = rank improved (lower number), negative = dropped
  const change = previous !== undefined ? previous - position : undefined;

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex items-center gap-1">
        <span className="font-semibold tabular-nums text-sm">{position}</span>
        {change !== undefined && change > 0 && (
          <span className="flex items-center gap-0.5 text-xs font-medium text-green-600 dark:text-green-400">
            <TrendingUpIcon className="h-3 w-3" />
            {Math.abs(change)}
          </span>
        )}
        {change !== undefined && change < 0 && (
          <span className="flex items-center gap-0.5 text-xs font-medium text-red-500 dark:text-red-400">
            <TrendingDownIcon className="h-3 w-3" />
            {Math.abs(change)}
          </span>
        )}
        {change === 0 && <MinusIcon className="h-3 w-3 text-muted-foreground" />}
      </div>
      {label && <span className="text-[10px] text-muted-foreground leading-none">{label}</span>}
    </div>
  );
}


export default function KeywordsPage() {
  const { activeProjectId } = useCurrentProject();
  const projects = useQuery(api.projects.list, {});
  const project = projects?.find((p) => p._id === activeProjectId);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [intentFilter, setIntentFilter] = useState<string | undefined>(undefined);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [selectedKeywordId, setSelectedKeywordId] = useState<Id<"keywords"> | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState("keywords");

  const deleteKeyword = useMutation(api.keywords.mutations.deleteKeyword);
  const deleteKeywordsBulk = useMutation(api.keywords.mutations.deleteKeywordsBulk);
  const syncRankings = useAction(api.keywords.actions.syncRankings);

  // Get GSC connection to know if sync is available
  const gscConnection = useQuery(api.gsc.queries.getConnection, {});

  const keywordsData = useQuery(
    api.keywords.queries.listKeywords,
    project
      ? {
          projectId: project._id,
          status: statusFilter,
          intent: intentFilter,
          paginationOpts: { numItems: 200, cursor: null },
        }
      : "skip"
  );

  const keywords = keywordsData?.page;

  const filtered = keywords?.filter((kw) =>
    search ? kw.keyword.includes(search.toLowerCase()) : true
  );

  async function handleSyncRankings() {
    if (!project || !gscConnection) return;
    const selectedProperty = gscConnection.selectedProperties?.[project._id];
    if (!selectedProperty) {
      toast.error("No GSC property selected. Go to Search Console and select a property first.");
      return;
    }
    setIsSyncing(true);
    const toastId = toast.loading("Syncing rankings from Google Search Console…");
    try {
      const result = await syncRankings({ projectId: project._id, propertyUrl: selectedProperty });
      toast.dismiss(toastId);
      toast.success("Rankings synced", {
        description: `${result.synced} keywords updated, ${result.notFound} not found in GSC.`,
        duration: 6000,
      });
    } catch (e) {
      toast.dismiss(toastId);
      if (e instanceof ConvexError) {
        toast.error((e.data as { message: string }).message);
      } else {
        toast.error("Failed to sync rankings");
      }
    } finally {
      setIsSyncing(false);
    }
  }



  function handleExportCSV() {
    const kwList = filtered ?? [];
    if (kwList.length === 0) {
      toast.info("No keywords to export");
      return;
    }
    const rows = ["keyword", ...kwList.map((kw) => `"${kw.keyword.replace(/"/g, '""')}"`)] ;
    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `keywords-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${kwList.length} keyword${kwList.length !== 1 ? "s" : ""}`);
  }

  function handleCopyKeywords() {
    const kwList = filtered ?? [];
    if (kwList.length === 0) {
      toast.info("No keywords to copy");
      return;
    }
    const csv = kwList.map((kw) => kw.keyword).join(", ");
    navigator.clipboard.writeText(csv).then(() => {
      toast.success(`Copied ${kwList.length} keyword${kwList.length !== 1 ? "s" : ""}`, {
        description: "Comma-separated values copied to clipboard",
        duration: 4000,
      });
    }).catch(() => {
      toast.error("Failed to copy to clipboard");
    });
  }

  async function handleDelete(keywordId: Id<"keywords">) {
    try {
      await deleteKeyword({ keywordId });
      toast.success("Keyword removed");
    } catch (e) {
      if (e instanceof ConvexError) {
        toast.error((e.data as { message: string }).message);
      } else {
        toast.error("Failed to delete keyword");
      }
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    try {
      const ids = Array.from(selectedIds) as Id<"keywords">[];
      await deleteKeywordsBulk({ keywordIds: ids });
      toast.success(`Removed ${ids.length} keywords`);
      setSelectedIds(new Set());
    } catch {
      toast.error("Failed to delete keywords");
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (!filtered) return;
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((k) => k._id)));
    }
  }

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TargetIcon />
            </EmptyMedia>
            <EmptyTitle>No project selected</EmptyTitle>
            <EmptyDescription>Select a project to manage keywords</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Keywords</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Track and manage keyword rankings for {project.name}
            </p>
          </div>
          {activeTab === "keywords" && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleExportCSV}>
                <DownloadIcon className="h-4 w-4 mr-1.5" />Export CSV
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCopyKeywords}>
                <CopyIcon className="h-4 w-4 mr-1.5" />Copy Keywords
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setCsvDialogOpen(true)}>
                <UploadIcon className="h-4 w-4 mr-1.5" />Import CSV
              </Button>
              <Button size="sm" onClick={() => setAddDialogOpen(true)}>
                <PlusIcon className="h-4 w-4 mr-1.5" />Add Keywords
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 overflow-hidden">
        <div className="px-6 border-b">
          <TabsList className="h-10 bg-transparent p-0 gap-0">
            <TabsTrigger value="keywords" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 h-10">
              Keywords
            </TabsTrigger>
            <TabsTrigger value="serp-setup" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 h-10">
              SERP Rank
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── Keywords tab ── */}
        <TabsContent value="keywords" className="flex flex-col flex-1 overflow-hidden mt-0 data-[state=inactive]:hidden">
          {/* Stats bar */}
          <KeywordStatsBar projectId={project._id} />

          {/* Filters */}
          <div className="px-6 py-3 border-b flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search keywords..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-8 text-sm"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8">
                  <FilterIcon className="h-3.5 w-3.5 mr-1.5" />
                  {statusFilter ? `Status: ${statusFilter}` : "Status"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setStatusFilter(undefined)}>All</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("tracking")}>Tracking</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("paused")}>Paused</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("archived")}>Archived</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8">
                  {intentFilter ? `Intent: ${intentFilter}` : "Intent"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setIntentFilter(undefined)}>All intents</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIntentFilter("informational")}>Informational</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIntentFilter("navigational")}>Navigational</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIntentFilter("commercial")}>Commercial</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIntentFilter("transactional")}>Transactional</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-muted-foreground font-medium">{selectedIds.size} selected</span>
                <Button variant="destructive" size="sm" className="h-8 cursor-pointer" onClick={handleBulkDelete}>
                  <TrashIcon className="h-3.5 w-3.5 mr-1.5" />Delete {selectedIds.size}
                </Button>
              </div>
            )}
          </div>

      {/* Table */}
          <div className="flex-1 overflow-auto">
        {keywords === undefined ? (
          <div className="p-6 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : filtered?.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <TargetIcon />
                </EmptyMedia>
                <EmptyTitle>
                  {search || statusFilter || intentFilter
                    ? "No keywords match your filters"
                    : "No keywords yet"}
                </EmptyTitle>
                <EmptyDescription>
                  {search || statusFilter || intentFilter
                    ? "Try adjusting your search or filters"
                    : "Add keywords to start tracking your rankings"}
                </EmptyDescription>
              </EmptyHeader>
              {!search && !statusFilter && !intentFilter && (
                <EmptyContent>
                  <Button size="sm" onClick={() => setAddDialogOpen(true)}>
                    <PlusIcon className="h-4 w-4 mr-1.5" />
                    Add your first keyword
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-muted-foreground text-xs uppercase tracking-wide">
                <th className="w-10 pl-6 py-2.5 text-left">
                  <input
                    type="checkbox"
                    className="cursor-pointer"
                    checked={
                      (filtered?.length ?? 0) > 0 &&
                      selectedIds.size === (filtered?.length ?? 0)
                    }
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="py-2.5 px-3 text-left font-medium">Keyword</th>
                <th className="py-2.5 px-3 text-center font-medium w-28">
                  <div className="flex flex-col items-center gap-0.5">
                    <span>SERP Rank</span>
                    <span className="text-[10px] normal-case text-muted-foreground/70 font-normal">Manual / Auto</span>
                  </div>
                </th>
                <th className="py-2.5 px-3 text-center font-medium w-24">Intent</th>
                <th className="py-2.5 px-3 text-center font-medium w-20">Priority</th>
                <th className="py-2.5 px-3 text-left font-medium hidden lg:table-cell">Location</th>
                <th className="py-2.5 px-3 text-center font-medium w-20 hidden md:table-cell">Best</th>
                <th className="w-12 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {filtered?.map((kw) => (
                <tr
                  key={kw._id}
                  className="border-b hover:bg-muted/20 cursor-pointer transition-colors"
                  onClick={() => setSelectedKeywordId(kw._id)}
                >
                  <td
                    className="pl-6 py-3"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(kw._id);
                    }}
                  >
                    <input
                      type="checkbox"
                      className="cursor-pointer"
                      checked={selectedIds.has(kw._id)}
                      onChange={() => toggleSelect(kw._id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium truncate max-w-[280px]">{kw.keyword}</span>
                      {kw.targetUrl && (
                        <span className="text-xs text-muted-foreground truncate max-w-[280px]">
                          {kw.targetUrl}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <PositionBadge
                      position={kw.serpPosition}
                      previous={kw.serpPreviousPosition}
                    />
                  </td>
                  <td className="py-3 px-3 text-center">
                    {kw.intent ? (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${INTENT_COLORS[kw.intent] ?? "bg-muted text-muted-foreground"}`}
                      >
                        {INTENT_LABELS[kw.intent] ?? kw.intent}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {kw.priority ? (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${PRIORITY_COLORS[kw.priority] ?? "bg-muted text-muted-foreground"}`}
                      >
                        {kw.priority}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-3 px-3 hidden lg:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {[kw.city, kw.state, kw.country].filter(Boolean).join(", ") || "—"}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center hidden md:table-cell">
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {kw.bestPosition ?? "—"}
                    </span>
                  </td>
                  <td
                    className="py-3 pr-4 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontalIcon className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedKeywordId(kw._id)}>
                          View details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(kw._id)}
                        >
                          Remove keyword
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
          </div>
        </TabsContent>

        {/* ── Manual SERP Checker tab ── */}
        <TabsContent value="serp-setup" className="flex flex-col flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
          <ManualSerpChecker
            projectId={project._id}
            projectDomain={project.websiteUrl ?? "your domain"}
            keywords={(keywords ?? []).map((k) => ({
              _id: k._id,
              keyword: k.keyword,
              serpPosition: k.serpPosition,
              serpPreviousPosition: k.serpPreviousPosition,
              country: k.country,
              city: k.city,
              state: k.state,
            }))}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AddKeywordDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        projectId={project._id}
        projectCountry={project.country}
      />
      <CsvImportDialog
        open={csvDialogOpen}
        onOpenChange={setCsvDialogOpen}
        projectId={project._id}
      />
      {selectedKeywordId && (
        <KeywordDetailSheet
          keywordId={selectedKeywordId}
          open={!!selectedKeywordId}
          onOpenChange={(open) => !open && setSelectedKeywordId(null)}
        />
      )}
    </div>
  );
}
