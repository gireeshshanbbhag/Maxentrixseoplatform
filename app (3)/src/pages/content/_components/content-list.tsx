import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent,
} from "@/components/ui/empty.tsx";
import { toast } from "sonner";
import {
  PenToolIcon, TrashIcon, SearchIcon, CalendarIcon, FileTextIcon,
} from "lucide-react";
import { format } from "date-fns";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";

const STATUS_COLORS: Record<string, string> = {
  idea: "bg-muted text-muted-foreground",
  brief: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  draft: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  review: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  published: "bg-green-500/15 text-green-600 dark:text-green-400",
  monitor: "bg-primary/15 text-primary",
  refresh: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  blog_post: "Blog Post",
  landing_page: "Landing Page",
  product_page: "Product Page",
  meta: "Meta Tags",
  brief: "Brief",
};

export default function ContentList({
  project,
  onEdit,
}: {
  project: Doc<"projects">;
  onEdit: (id: Id<"contentPieces">) => void;
}) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const pieces = useQuery(
    api.content.queries.list,
    statusFilter !== "all"
      ? { projectId: project._id, status: statusFilter }
      : { projectId: project._id }
  );

  const remove = useMutation(api.content.mutations.remove);
  const update = useMutation(api.content.mutations.update);

  async function handleDelete(id: Id<"contentPieces">) {
    await remove({ id });
    toast.success("Deleted");
  }

  async function handleStatusChange(id: Id<"contentPieces">, status: string) {
    await update({ id, status, ...(status === "published" ? { publishedAt: new Date().toISOString() } : {}) });
  }

  const filtered = (pieces ?? []).filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.targetKeyword?.toLowerCase().includes(search.toLowerCase())
  );

  if (pieces === undefined) {
    return (
      <div className="p-6 space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search content…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-8 text-sm">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {["idea", "brief", "draft", "review", "published", "monitor", "refresh"].map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats row */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>{pieces.length} total</span>
        <span>{pieces.filter((p) => p.status === "published").length} published</span>
        <span>{pieces.filter((p) => p.status === "draft").length} drafts</span>
      </div>

      {filtered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><PenToolIcon /></EmptyMedia>
            <EmptyTitle>No content pieces yet</EmptyTitle>
            <EmptyDescription>Create your first content piece to get started</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-2">
          {filtered.map((piece) => (
            <div
              key={piece._id}
              className="rounded-xl border p-4 hover:bg-accent/20 transition-colors cursor-pointer group"
              onClick={() => onEdit(piece._id)}
            >
              <div className="flex items-start gap-3">
                <FileTextIcon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{piece.title}</span>
                    <Badge
                      variant="secondary"
                      className={`text-xs px-1.5 py-0 capitalize ${STATUS_COLORS[piece.status] ?? ""}`}
                    >
                      {piece.status}
                    </Badge>
                    <Badge variant="outline" className="text-xs px-1.5 py-0">
                      {CONTENT_TYPE_LABELS[piece.contentType] ?? piece.contentType}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                    {piece.targetKeyword && <span>🎯 {piece.targetKeyword}</span>}
                    {piece.wordCount ? <span>{piece.wordCount.toLocaleString()} words</span> : null}
                    {piece.scheduledAt && (
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" />
                        {format(new Date(piece.scheduledAt), "MMM d, yyyy")}
                      </span>
                    )}
                    {piece.qualityScore !== undefined && (
                      <span className={`font-medium ${piece.qualityScore >= 70 ? "text-green-600" : piece.qualityScore >= 50 ? "text-amber-600" : "text-red-500"}`}>
                        Quality: {piece.qualityScore}/100
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={piece.status}
                    onValueChange={(v) => handleStatusChange(piece._id, v)}
                  >
                    <SelectTrigger className="h-7 w-28 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["idea", "brief", "draft", "review", "published", "monitor", "refresh"].map((s) => (
                        <SelectItem key={s} value={s} className="capitalize text-xs">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(piece._id)}
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
