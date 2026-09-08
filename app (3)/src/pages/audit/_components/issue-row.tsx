import { useState } from "react";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CheckCircle2Icon,
  CircleIcon,
  ExternalLinkIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible.tsx";
import SeverityBadge from "./severity-badge.tsx";

type IssueRowProps = {
  issue: Doc<"auditIssues">;
};

const CATEGORY_LABELS: Record<string, string> = {
  technical: "Technical",
  content: "Content",
  indexation: "Indexation",
  links: "Links",
};

export default function IssueRow({ issue }: IssueRowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const toggleResolved = useMutation(api.audits.queries.toggleIssueResolved);

  const handleToggleResolved = async () => {
    try {
      await toggleResolved({ issueId: issue._id });
    } catch (error) {
      if (error instanceof ConvexError) {
        const data = error.data as { code: string; message: string };
        toast.error(data.message);
      } else {
        toast.error("Failed to update issue");
      }
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        className={cn(
          "rounded-lg border transition-colors",
          issue.isResolved && "opacity-60",
        )}
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-start gap-3 p-3 text-left hover:bg-accent/50 transition-colors rounded-lg"
          >
            <div className="mt-0.5 shrink-0 text-muted-foreground">
              {isOpen ? (
                <ChevronDownIcon className="size-4" />
              ) : (
                <ChevronRightIcon className="size-4" />
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <SeverityBadge severity={issue.severity} />
                <Badge variant="secondary" className="text-[10px]">
                  {CATEGORY_LABELS[issue.category] ?? issue.category}
                </Badge>
                {issue.isResolved && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  >
                    Resolved
                  </Badge>
                )}
              </div>
              <p className="text-sm font-medium leading-snug">{issue.title}</p>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {issue.pageUrl}
              </p>
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 pl-10 space-y-3">
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">{issue.description}</p>

              {issue.why && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Why this matters
                  </p>
                  <p className="text-sm">{issue.why}</p>
                </div>
              )}

              {issue.recommendation && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Recommendation
                  </p>
                  <p className="text-sm">{issue.recommendation}</p>
                </div>
              )}

              {issue.developerNote && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Developer note
                  </p>
                  <p className="rounded bg-muted p-2 font-mono text-xs">
                    {issue.developerNote}
                  </p>
                </div>
              )}

              {issue.contentNote && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Content note
                  </p>
                  <p className="text-sm">{issue.contentNote}</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleResolved}
                className={cn(
                  "gap-1.5 text-xs",
                  issue.isResolved
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-muted-foreground",
                )}
              >
                {issue.isResolved ? (
                  <CheckCircle2Icon className="size-3.5" />
                ) : (
                  <CircleIcon className="size-3.5" />
                )}
                {issue.isResolved ? "Resolved" : "Mark as resolved"}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs text-muted-foreground"
                asChild
              >
                <a
                  href={issue.pageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLinkIcon className="size-3" />
                  View page
                </a>
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
