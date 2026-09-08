import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  TrendingUpIcon,
  TrendingDownIcon,
  MinusIcon,
  CalendarIcon,
  PlusIcon,
  InfoIcon,
} from "lucide-react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { format, parseISO } from "date-fns";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import RankHistoryChart from "./rank-history-chart.tsx";

type Props = {
  keywordId: Id<"keywords">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function KeywordDetailSheet({ keywordId, open, onOpenChange }: Props) {
  const keyword = useQuery(api.keywords.queries.getKeyword, { keywordId });
  const history = useQuery(api.keywords.queries.getRankHistory, { keywordId, limit: 30 });

  const updateKeyword = useMutation(api.keywords.mutations.updateKeyword);
  const addRankSnapshot = useMutation(api.keywords.mutations.addRankSnapshot);

  const [editing, setEditing] = useState(false);
  const [editIntent, setEditIntent] = useState("");
  const [editPriority, setEditPriority] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editTargetUrl, setEditTargetUrl] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Manual rank entry
  const [manualPos, setManualPos] = useState("");
  const [manualDate, setManualDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [addingRank, setAddingRank] = useState(false);

  function startEdit() {
    if (!keyword) return;
    setEditIntent(keyword.intent ?? "none");
    setEditPriority(keyword.priority ?? "medium");
    setEditStatus(keyword.status ?? "tracking");
    setEditTargetUrl(keyword.targetUrl ?? "");
    setEditNotes(keyword.notes ?? "");
    setEditing(true);
  }

  async function saveEdit() {
    if (!keyword) return;
    try {
      await updateKeyword({
        keywordId,
        intent: editIntent === "none" ? undefined : editIntent,
        priority: editPriority,
        status: editStatus,
        targetUrl: editTargetUrl || undefined,
        notes: editNotes || undefined,
      });
      toast.success("Keyword updated");
      setEditing(false);
    } catch (e) {
      if (e instanceof ConvexError) {
        toast.error((e.data as { message: string }).message);
      } else {
        toast.error("Failed to update keyword");
      }
    }
  }

  async function handleAddRank() {
    const pos = manualPos ? parseInt(manualPos, 10) : undefined;
    if (pos !== undefined && (isNaN(pos) || pos < 1 || pos > 1000)) {
      toast.error("Position must be between 1 and 1000");
      return;
    }
    setAddingRank(true);
    try {
      await addRankSnapshot({
        keywordId,
        snapshotDate: manualDate,
        position: pos,
        source: "manual",
      });
      toast.success("Rank entry added");
      setManualPos("");
    } catch (e) {
      if (e instanceof ConvexError) {
        toast.error((e.data as { message: string }).message);
      } else {
        toast.error("Failed to add rank");
      }
    } finally {
      setAddingRank(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {!keyword ? (
          <div className="space-y-4 pt-6">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <>
            <SheetHeader className="pb-4">
              <SheetTitle className="text-lg font-semibold capitalize pr-8">
                {keyword.keyword}
              </SheetTitle>
              <SheetDescription asChild>
                <div className="flex items-center gap-2 flex-wrap">
                  {keyword.status && (
                    <Badge variant="secondary" className="capitalize text-xs">
                      {keyword.status}
                    </Badge>
                  )}
                  {keyword.source && (
                    <span className="text-xs text-muted-foreground">
                      Source: {keyword.source}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    Added {format(parseISO(keyword.addedAt), "MMM d, yyyy")}
                  </span>
                </div>
              </SheetDescription>
            </SheetHeader>

            {/* Current position */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* GSC */}
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">GSC Rank</div>
                <div className="flex items-end justify-between">
                  <span className="text-3xl font-bold tabular-nums">
                    {keyword.gscPosition ?? "—"}
                  </span>
                  {keyword.gscPosition !== undefined && keyword.gscPreviousPosition !== undefined && (
                    (() => {
                      const change = keyword.gscPreviousPosition - keyword.gscPosition;
                      return change > 0 ? (
                        <span className="flex items-center gap-0.5 text-sm font-semibold text-green-600 dark:text-green-400 mb-1">
                          <TrendingUpIcon className="h-4 w-4" />+{Math.abs(change)}
                        </span>
                      ) : change < 0 ? (
                        <span className="flex items-center gap-0.5 text-sm font-semibold text-red-500 mb-1">
                          <TrendingDownIcon className="h-4 w-4" />{change}
                        </span>
                      ) : (
                        <MinusIcon className="h-4 w-4 text-muted-foreground mb-1" />
                      );
                    })()
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">Search Console</div>
              </div>
              {/* SERP */}
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">SERP Rank</div>
                <div className="flex items-end justify-between">
                  <span className="text-3xl font-bold tabular-nums">
                    {keyword.serpPosition ?? "—"}
                  </span>
                  {keyword.serpPosition !== undefined && keyword.serpPreviousPosition !== undefined && (
                    (() => {
                      const change = keyword.serpPreviousPosition - keyword.serpPosition;
                      return change > 0 ? (
                        <span className="flex items-center gap-0.5 text-sm font-semibold text-green-600 dark:text-green-400 mb-1">
                          <TrendingUpIcon className="h-4 w-4" />+{Math.abs(change)}
                        </span>
                      ) : change < 0 ? (
                        <span className="flex items-center gap-0.5 text-sm font-semibold text-red-500 mb-1">
                          <TrendingDownIcon className="h-4 w-4" />{change}
                        </span>
                      ) : (
                        <MinusIcon className="h-4 w-4 text-muted-foreground mb-1" />
                      );
                    })()
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">SpySERP</div>
              </div>
            </div>
            {/* Best ever */}
            <div className="rounded-lg border p-3 mb-6 flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Best Ever Position</div>
                <div className="text-2xl font-bold tabular-nums text-primary mt-0.5">
                  {keyword.bestPosition ?? "—"}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Last synced</div>
                <div className="text-xs font-medium">{keyword.latestPositionDate ?? "—"}</div>
              </div>
            </div>

            {/* Rank history chart */}
            {history && history.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium mb-2">Position History</h3>
                <RankHistoryChart data={history} />
              </div>
            )}

            {/* Data source disclosure */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 mb-6 text-xs text-muted-foreground">
              <InfoIcon className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                <strong className="text-foreground">GSC Rank</strong> is sourced from Google Search Console (average position over last 7 days). 
                <strong className="text-foreground"> SERP Rank</strong> is sourced from SpySERP (scheduled rank tracking). Run "Sync GSC" or "Sync SpySERP" from the keywords page to update.
              </span>
            </div>

            {/* Manual rank entry */}
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-3">Add Manual Rank Entry</h3>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type="date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="text-sm h-9"
                  />
                </div>
                <div className="w-28">
                  <Input
                    type="number"
                    placeholder="Position"
                    min={1}
                    max={1000}
                    value={manualPos}
                    onChange={(e) => setManualPos(e.target.value)}
                    className="text-sm h-9"
                  />
                </div>
                <Button
                  size="sm"
                  className="h-9"
                  onClick={handleAddRank}
                  disabled={addingRank}
                >
                  <PlusIcon className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Leave position empty to record "not in top 100"
              </p>
            </div>

            {/* Recent history table */}
            {history && history.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium mb-2">Recent History</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/50 border-b text-muted-foreground uppercase tracking-wide">
                        <th className="py-2 px-3 text-left font-medium">Date</th>
                        <th className="py-2 px-3 text-center font-medium">Position</th>
                        <th className="py-2 px-3 text-center font-medium hidden sm:table-cell">Clicks</th>
                        <th className="py-2 px-3 text-center font-medium hidden sm:table-cell">Impr.</th>
                        <th className="py-2 px-3 text-left font-medium">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.slice(0, 15).map((s) => (
                        <tr key={s._id} className="border-b last:border-0">
                          <td className="py-2 px-3 text-muted-foreground">
                            {format(parseISO(s.snapshotDate + "T00:00:00"), "MMM d, yyyy")}
                          </td>
                          <td className="py-2 px-3 text-center font-semibold tabular-nums">
                            {s.position ?? "—"}
                          </td>
                          <td className="py-2 px-3 text-center text-muted-foreground hidden sm:table-cell">
                            {s.clicks ?? "—"}
                          </td>
                          <td className="py-2 px-3 text-center text-muted-foreground hidden sm:table-cell">
                            {s.impressions ?? "—"}
                          </td>
                          <td className="py-2 px-3 text-muted-foreground capitalize">
                            {s.source === "brightdata" ? "Bright Data" : s.source === "gsc" ? "GSC" : s.source === "spyserp" ? "SpySERP" : s.source}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Edit fields */}
            {!editing ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Keyword Settings</h3>
                  <Button variant="ghost" size="sm" onClick={startEdit}>
                    Edit
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <span className="text-muted-foreground">Intent</span>
                  <span className="capitalize">{keyword.intent ?? "—"}</span>
                  <span className="text-muted-foreground">Priority</span>
                  <span className="capitalize">{keyword.priority ?? "—"}</span>
                  <span className="text-muted-foreground">Status</span>
                  <span className="capitalize">{keyword.status ?? "—"}</span>
                  <span className="text-muted-foreground">Target URL</span>
                  <span className="truncate text-xs">{keyword.targetUrl ?? "—"}</span>
                  {keyword.notes && (
                    <>
                      <span className="text-muted-foreground">Notes</span>
                      <span className="text-xs">{keyword.notes}</span>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Edit Keyword</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Intent</Label>
                    <Select value={editIntent} onValueChange={setEditIntent}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unknown</SelectItem>
                        <SelectItem value="informational">Informational</SelectItem>
                        <SelectItem value="navigational">Navigational</SelectItem>
                        <SelectItem value="commercial">Commercial</SelectItem>
                        <SelectItem value="transactional">Transactional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Priority</Label>
                    <Select value={editPriority} onValueChange={setEditPriority}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Status</Label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tracking">Tracking</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Target URL</Label>
                  <Input
                    value={editTargetUrl}
                    onChange={(e) => setEditTargetUrl(e.target.value)}
                    placeholder="https://example.com/page"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveEdit} className="flex-1">
                    Save changes
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditing(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
