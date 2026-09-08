import { useState } from "react";
import { usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { AlertTriangleIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty.tsx";
import IssueRow from "./issue-row.tsx";

type IssuesTabProps = {
  auditId: Id<"audits">;
};

const SEVERITY_OPTIONS = [
  { value: "all", label: "All severities" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
  { value: "info", label: "Info" },
];

const CATEGORY_OPTIONS = [
  { value: "all", label: "All categories" },
  { value: "technical", label: "Technical" },
  { value: "content", label: "Content" },
  { value: "indexation", label: "Indexation" },
  { value: "links", label: "Links" },
];

export default function IssuesTab({ auditId }: IssuesTabProps) {
  const [severityFilter, setSeverityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showResolved, setShowResolved] = useState(false);

  const { results, status, loadMore } = usePaginatedQuery(
    api.audits.queries.listIssues,
    {
      auditId,
      severityFilter: severityFilter === "all" ? undefined : severityFilter,
      categoryFilter: categoryFilter === "all" ? undefined : categoryFilter,
      showResolved,
    },
    { initialNumItems: 25 },
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SEVERITY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Checkbox
            id="show-resolved"
            checked={showResolved}
            onCheckedChange={(checked) => setShowResolved(checked === true)}
          />
          <Label
            htmlFor="show-resolved"
            className="text-sm font-normal cursor-pointer"
          >
            Show resolved
          </Label>
        </div>
      </div>

      {/* Issues list */}
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
              <AlertTriangleIcon />
            </EmptyMedia>
            <EmptyTitle>No issues found</EmptyTitle>
            <EmptyDescription>
              {showResolved
                ? "No issues match your current filters."
                : "No unresolved issues match your filters. Try enabling 'Show resolved'."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-2">
          {results.map((issue) => (
            <IssueRow key={issue._id} issue={issue} />
          ))}
          {status === "CanLoadMore" && (
            <div className="flex justify-center pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => loadMore(25)}
              >
                Load more issues
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
