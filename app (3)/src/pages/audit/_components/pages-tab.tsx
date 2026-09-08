import { useState } from "react";
import { usePaginatedQuery, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import {
  FileIcon,
  ExternalLinkIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  AlertOctagonIcon,
  CircleXIcon,
  CircleAlertIcon,
  AlertTriangleIcon,
  InfoIcon,
  CheckCircle2Icon,
  CircleIcon,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible.tsx";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty.tsx";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import SeverityBadge from "./severity-badge.tsx";

type PagesTabProps = {
  auditId: Id<"audits">;
};

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "crawled", label: "Crawled" },
  { value: "queued", label: "Queued" },
  { value: "failed", label: "Failed" },
  { value: "skipped", label: "Skipped" },
];

const STATUS_COLORS: Record<string, string> = {
  crawled: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  queued: "bg-muted text-muted-foreground",
  failed: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  skipped: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
};

const SEVERITY_ICONS = {
  critical: { Icon: AlertOctagonIcon, color: "text-red-500" },
  high: { Icon: CircleXIcon, color: "text-orange-500" },
  medium: { Icon: CircleAlertIcon, color: "text-amber-500" },
  low: { Icon: AlertTriangleIcon, color: "text-blue-500" },
  info: { Icon: InfoIcon, color: "text-slate-500" },
};

const CATEGORY_LABELS: Record<string, string> = {
  technical: "Technical",
  content: "Content",
  indexation: "Indexation",
  links: "Links",
};

// ── Inline issue card (no page URL shown since we're already in page context) ──

function PageIssueCard({ issue }: { issue: Doc<"auditIssues"> }) {
  const [open, setOpen] = useState(false);
  const toggleResolved = useMutation(api.audits.queries.toggleIssueResolved);

  const handleToggle = async () => {
    try {
      await toggleResolved({ issueId: issue._id });
    } catch (e) {
      toast.error(e instanceof ConvexError ? (e.data as { message: string }).message : "Failed to update");
    }
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className={cn("rounded-md border bg-background transition-colors", issue.isResolved && "opacity-60")}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-start gap-2 px-3 py-2.5 text-left hover:bg-accent/50 transition-colors rounded-md"
          >
            <div className="mt-0.5 shrink-0 text-muted-foreground">
              {open ? <ChevronDownIcon className="size-3.5" /> : <ChevronRightIcon className="size-3.5" />}
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <SeverityBadge severity={issue.severity} />
                <Badge variant="secondary" className="text-[10px]">
                  {CATEGORY_LABELS[issue.category] ?? issue.category}
                </Badge>
                {issue.isResolved && (
                  <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    Resolved
                  </Badge>
                )}
              </div>
              <p className="text-xs font-medium leading-snug">{issue.title}</p>
              <p className="text-[11px] text-muted-foreground line-clamp-1">{issue.description}</p>
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3 pl-8 space-y-2.5 text-sm">
            {issue.why && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Why this matters</p>
                <p className="text-xs">{issue.why}</p>
              </div>
            )}
            {issue.recommendation && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">How to fix</p>
                <p className="text-xs">{issue.recommendation}</p>
              </div>
            )}
            {issue.developerNote && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Developer note</p>
                <p className="rounded bg-muted px-2 py-1.5 font-mono text-[11px]">{issue.developerNote}</p>
              </div>
            )}
            {issue.contentNote && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Content note</p>
                <p className="text-xs">{issue.contentNote}</p>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggle}
              className={cn(
                "gap-1.5 text-xs h-7 px-2 mt-1",
                issue.isResolved ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
              )}
            >
              {issue.isResolved ? <CheckCircle2Icon className="size-3" /> : <CircleIcon className="size-3" />}
              {issue.isResolved ? "Resolved" : "Mark as resolved"}
            </Button>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// ── Expandable page issues panel ─────────────────────────────────────────────

function PageIssuesPanel({ auditId, pageUrl }: { auditId: Id<"audits">; pageUrl: string }) {
  const issues = useQuery(api.audits.queries.listPageIssues, { auditId, pageUrl });

  if (issues === undefined) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (issues.length === 0) {
    return (
      <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 py-1">
        <CheckCircle2Icon className="size-3.5 shrink-0" />
        No issues found on this page
      </p>
    );
  }

  // Sort by severity weight
  const SEV_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  const sorted = [...issues].sort(
    (a, b) => (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9),
  );

  return (
    <div className="space-y-1.5">
      {sorted.map((issue) => (
        <PageIssueCard key={issue._id} issue={issue} />
      ))}
    </div>
  );
}

// ── Severity summary chips ────────────────────────────────────────────────────

function SeveritySummary({ count, severity }: { count: number; severity: string }) {
  const cfg = SEVERITY_ICONS[severity as keyof typeof SEVERITY_ICONS];
  if (!cfg || count === 0) return null;
  const { Icon, color } = cfg;
  return (
    <span className={cn("flex items-center gap-0.5 text-xs tabular-nums", color)}>
      <Icon className="size-3" />
      {count}
    </span>
  );
}

// ── Page row ─────────────────────────────────────────────────────────────────

function PageRow({
  page,
  auditId,
  severityCounts,
}: {
  page: Doc<"auditPages">;
  auditId: Id<"audits">;
  severityCounts?: Record<string, number>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const statusColor = STATUS_COLORS[page.crawlStatus] ?? "";
  const hasIssues = (page.issueCount ?? 0) > 0;

  return (
    <Collapsible open={isOpen} onOpenChange={hasIssues ? setIsOpen : undefined}>
      <div className={cn("rounded-lg border transition-colors", isOpen && "bg-accent/20")}>
        <CollapsibleTrigger
          asChild
          disabled={!hasIssues}
        >
          <button
            type="button"
            className={cn(
              "flex w-full items-start gap-3 p-3 text-left transition-colors rounded-lg",
              hasIssues ? "hover:bg-accent/50 cursor-pointer" : "cursor-default",
            )}
          >
            {/* Expand chevron */}
            <div className="mt-1 shrink-0 text-muted-foreground w-4">
              {hasIssues ? (
                isOpen ? <ChevronDownIcon className="size-4" /> : <ChevronRightIcon className="size-4" />
              ) : null}
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              {/* Title */}
              <p className="text-sm font-medium truncate leading-snug">
                {page.title || (() => { try { return new URL(page.url).pathname; } catch { return page.url; } })()}
              </p>

              {/* Clickable URL */}
              <a
                href={page.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-primary hover:underline flex items-center gap-1 min-w-0 w-fit max-w-full"
              >
                <span className="truncate">{page.url}</span>
                <ExternalLinkIcon className="size-3 shrink-0" />
              </a>

              {/* Meta row */}
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="outline" className={cn("text-[10px] border", statusColor)}>
                  {page.crawlStatus}
                </Badge>
                {page.statusCode !== undefined && (
                  <span className={cn("text-xs tabular-nums", page.statusCode >= 400 ? "text-red-500" : "text-muted-foreground")}>
                    {page.statusCode}
                  </span>
                )}
                {page.loadTimeMs !== undefined && (
                  <span className={cn("text-xs tabular-nums", page.loadTimeMs > 3000 ? "text-amber-500" : "text-muted-foreground")}>
                    {(page.loadTimeMs / 1000).toFixed(1)}s
                  </span>
                )}
                {page.wordCount !== undefined && (
                  <span className="text-xs text-muted-foreground">{page.wordCount.toLocaleString()} words</span>
                )}
              </div>
            </div>

            {/* Right: issues summary */}
            {hasIssues && (
              <div className="shrink-0 flex items-center gap-2">
                {severityCounts && (
                  <div className="flex items-center gap-1.5">
                    {["critical", "high", "medium", "low", "info"].map((s) => (
                      <SeveritySummary key={s} count={severityCounts[s] ?? 0} severity={s} />
                    ))}
                  </div>
                )}
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400 whitespace-nowrap">
                  {page.issueCount} {page.issueCount === 1 ? "issue" : "issues"}
                </span>
              </div>
            )}
          </button>
        </CollapsibleTrigger>

        {hasIssues && (
          <CollapsibleContent>
            <div className="px-4 pb-4 pl-10 border-t bg-muted/20">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5">
                Issues on this page
              </p>
              <PageIssuesPanel auditId={auditId} pageUrl={page.url} />
            </div>
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  );
}

// ── Main tab ─────────────────────────────────────────────────────────────────

export default function PagesTab({ auditId }: PagesTabProps) {
  const [statusFilter, setStatusFilter] = useState("all");

  const { results, status, loadMore } = usePaginatedQuery(
    api.audits.queries.listPages,
    {
      auditId,
      statusFilter: statusFilter === "all" ? undefined : statusFilter,
    },
    { initialNumItems: 25 },
  );

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Click a page with issues to see what to fix
        </p>
      </div>

      {/* Pages list */}
      {status === "LoadingFirstPage" ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileIcon />
            </EmptyMedia>
            <EmptyTitle>No pages found</EmptyTitle>
            <EmptyDescription>
              No pages match your current filter. Try selecting a different status.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-2">
          {results.map((page) => (
            <PageRow key={page._id} page={page} auditId={auditId} />
          ))}
          {status === "CanLoadMore" && (
            <div className="flex justify-center pt-2">
              <Button variant="ghost" size="sm" onClick={() => loadMore(25)}>
                Load more pages
              </Button>
            </div>
          )}
          {status === "LoadingMore" && (
            <div className="flex justify-center pt-2">
              <Skeleton className="h-8 w-32" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
