import { Link } from "react-router-dom";
import { format } from "date-fns";
import { AlertTriangleIcon, FileIcon } from "lucide-react";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import AuditStatusBadge from "./audit-status-badge.tsx";
import HealthScoreRing from "@/pages/dashboard/_components/health-score-ring.tsx";

type AuditCardProps = {
  audit: Doc<"audits">;
};

export default function AuditCard({ audit }: AuditCardProps) {
  const isRunning = audit.status === "crawling" || audit.status === "queued";
  const progress =
    audit.maxPages > 0
      ? Math.round((audit.pagesCrawled / audit.maxPages) * 100)
      : 0;
  const auditDate = format(
    new Date(audit._creationTime),
    "MMM d, yyyy 'at' h:mm a",
  );

  return (
    <Link to={`/audit/${audit._id}`} className="block group">
      <Card className="cursor-pointer transition-colors hover:border-primary/30">
        <CardContent className="flex items-center gap-4 py-4">
          {/* Score ring */}
          <div className="shrink-0">
            <HealthScoreRing score={audit.overallScore ?? null} size="sm" />
          </div>

          {/* Main info */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">{auditDate}</span>
              <AuditStatusBadge status={audit.status} />
            </div>

            {isRunning && (
              <div className="flex items-center gap-3">
                <Progress
                  value={progress}
                  className="h-1.5 flex-1 max-w-xs"
                />
                <span className="text-xs text-muted-foreground tabular-nums">
                  {audit.pagesCrawled}/{audit.maxPages} pages
                </span>
              </div>
            )}

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <FileIcon className="size-3" />
                {audit.pagesCrawled} pages crawled
              </span>
              <span className="flex items-center gap-1">
                <AlertTriangleIcon className="size-3" />
                {audit.issuesFound} issues
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
