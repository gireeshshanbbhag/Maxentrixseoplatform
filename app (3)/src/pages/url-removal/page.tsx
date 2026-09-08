import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useCurrentProject } from "@/hooks/use-current-project.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select.tsx";
import {
  Trash2Icon, ExternalLinkIcon, RefreshCwIcon, CheckCircleIcon,
  ClockIcon, XCircleIcon, AlertTriangleIcon, SendIcon, FilterIcon,
  SquareXIcon,
} from "lucide-react";
import {
  Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent,
} from "@/components/ui/empty.tsx";
import { format } from "date-fns";
import type { Id, Doc } from "@/convex/_generated/dataModel.d.ts";
import { Link } from "react-router-dom";

type RemovalRequest = Doc<"urlRemovalRequests">;

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  queued: {
    label: "Queued",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    icon: <ClockIcon className="h-3 w-3" />,
  },
  submitted: {
    label: "Submitted",
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    icon: <SendIcon className="h-3 w-3" />,
  },
  removed: {
    label: "Removed",
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    icon: <CheckCircleIcon className="h-3 w-3" />,
  },
  denied: {
    label: "Denied",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    icon: <XCircleIcon className="h-3 w-3" />,
  },
};

export default function UrlRemovalPage() {
  return (
    <>
      <AuthLoading><div className="p-8"><Skeleton className="h-64 w-full" /></div></AuthLoading>
      <Unauthenticated><div className="flex justify-center p-8"><SignInButton /></div></Unauthenticated>
      <Authenticated><UrlRemovalContent /></Authenticated>
    </>
  );
}

function UrlRemovalContent() {
  const { activeProjectId } = useCurrentProject();
  const [statusFilter, setStatusFilter] = useState("all");

  const requests = useQuery(
    api.url_removal.queries.list,
    activeProjectId ? { projectId: activeProjectId } : "skip"
  );

  const updateStatus = useMutation(api.url_removal.mutations.updateStatus);
  const deleteRequest = useMutation(api.url_removal.mutations.deleteRequest);
  const markSubmitted = useMutation(api.url_removal.mutations.markSubmitted);

  if (!activeProjectId) {
    return (
      <div className="p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Trash2Icon /></EmptyMedia>
            <EmptyTitle>No project selected</EmptyTitle>
            <EmptyDescription>Select a project to view URL removal requests</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  if (requests === undefined) {
    return <div className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  }

  const filtered = statusFilter === "all"
    ? requests
    : requests.filter((r) => r.status === statusFilter);

  const queued = requests.filter((r) => r.status === "queued");
  const submitted = requests.filter((r) => r.status === "submitted");
  const removed = requests.filter((r) => r.status === "removed");

  async function handleStatusChange(id: Id<"urlRemovalRequests">, status: string) {
    try {
      await updateStatus({ id, status });
      toast.success(`Status updated to ${STATUS_CONFIG[status]?.label ?? status}`);
    } catch {
      toast.error("Failed to update status");
    }
  }

  async function handleDelete(id: Id<"urlRemovalRequests">) {
    try {
      await deleteRequest({ id });
      toast.success("Request removed from queue");
    } catch {
      toast.error("Failed to delete");
    }
  }

  async function handleMarkAllSubmitted() {
    const ids = queued.map((r) => r._id);
    if (ids.length === 0) return;
    try {
      await markSubmitted({ ids });
      toast.success(`Marked ${ids.length} URL${ids.length !== 1 ? "s" : ""} as submitted`);
    } catch {
      toast.error("Failed to update");
    }
  }

  function buildGscRemovalUrl(url: string) {
    return `https://search.google.com/search-console/removals?url=${encodeURIComponent(url)}`;
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10">
              <Trash2Icon className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">URL Removal Queue</h1>
              <p className="text-sm text-muted-foreground">Track URLs queued for removal from Google Search</p>
            </div>
          </div>
          <a href="https://search.google.com/search-console/removals" target="_blank" rel="noopener noreferrer">
            <Button size="sm">
              <ExternalLinkIcon className="h-3.5 w-3.5 mr-1.5" />
              Open GSC Removals Tool
            </Button>
          </a>
        </div>
      </div>

      <div className="p-6 space-y-5 max-w-4xl">

        {/* Info Banner */}
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-4 flex items-start gap-3">
          <AlertTriangleIcon className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-200 space-y-1">
            <p className="font-semibold">Manual submission required</p>
            <p className="text-xs leading-relaxed">
              Google does not allow automated URL removal submissions. For each URL below, click <strong>Submit in GSC</strong> to open Google Search Console pre-filled with that URL. After submitting, mark it as "Submitted" to track progress.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">Queued</p>
            <p className="text-2xl font-bold mt-1 text-blue-600">{queued.length}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">Submitted to GSC</p>
            <p className="text-2xl font-bold mt-1 text-amber-600">{submitted.length}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">Removed</p>
            <p className="text-2xl font-bold mt-1 text-green-600">{removed.length}</p>
          </div>
        </div>

        {/* Toolbar */}
        {requests.length > 0 && (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <FilterIcon className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="queued">Queued</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="removed">Removed</SelectItem>
                  <SelectItem value="denied">Denied</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {queued.length > 0 && (
              <Button size="sm" variant="secondary" onClick={handleMarkAllSubmitted}>
                <CheckCircleIcon className="h-3.5 w-3.5 mr-1.5" />
                Mark all queued as submitted
              </Button>
            )}
          </div>
        )}

        {/* List */}
        {requests.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><Trash2Icon /></EmptyMedia>
              <EmptyTitle>No removal requests yet</EmptyTitle>
              <EmptyDescription>
                Select URLs from the{" "}
                <Link to="/sitemaps" className="text-primary underline">Sitemaps page</Link>{" "}
                and click "Request removal" to add them here.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Link to="/sitemaps">
                <Button size="sm" variant="secondary">Go to Sitemaps</Button>
              </Link>
            </EmptyContent>
          </Empty>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">No requests match this filter</div>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <div className="divide-y max-h-[600px] overflow-auto">
              {filtered.map((req) => (
                <RemovalRow
                  key={req._id}
                  req={req}
                  onStatusChange={(status) => handleStatusChange(req._id, status)}
                  onDelete={() => handleDelete(req._id)}
                  gscUrl={buildGscRemovalUrl(req.url)}
                />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function RemovalRow({
  req, onStatusChange, onDelete, gscUrl,
}: {
  req: RemovalRequest;
  onStatusChange: (status: string) => void;
  onDelete: () => void;
  gscUrl: string;
}) {
  const statusCfg = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.queued;

  return (
    <div className="px-4 py-3 hover:bg-accent/20 transition-colors">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={req.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline truncate max-w-xs md:max-w-lg flex items-center gap-1"
            >
              {req.url}
              <ExternalLinkIcon className="h-3 w-3 shrink-0" />
            </a>
            <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${statusCfg.color}`}>
              {statusCfg.icon} {statusCfg.label}
            </span>
          </div>
          <div className="flex gap-3 flex-wrap">
            {req.reason && (
              <span className="text-xs text-muted-foreground capitalize">{req.reason.replace(/_/g, " ")}</span>
            )}
            <span className="text-xs text-muted-foreground">
              Added {format(new Date(req.createdAt), "MMM d, yyyy")}
            </span>
            {req.submittedAt && (
              <span className="text-xs text-muted-foreground">
                Submitted {format(new Date(req.submittedAt), "MMM d")}
              </span>
            )}
            {req.notes && <span className="text-xs text-muted-foreground italic">{req.notes}</span>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {req.status === "queued" && (
            <a href={gscUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="h-7 text-xs">
                <SendIcon className="h-3 w-3 mr-1" />
                Submit in GSC
              </Button>
            </a>
          )}
          <Select value={req.status} onValueChange={onStatusChange}>
            <SelectTrigger className="h-7 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="queued">Queued</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="removed">Removed</SelectItem>
              <SelectItem value="denied">Denied</SelectItem>
            </SelectContent>
          </Select>
          <button
            onClick={onDelete}
            className="p-1.5 text-muted-foreground hover:text-destructive transition-colors cursor-pointer rounded"
            title="Delete from queue"
          >
            <SquareXIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
