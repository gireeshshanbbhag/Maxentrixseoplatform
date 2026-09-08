import { useParams, Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { format } from "date-fns";
import {
  ArrowLeftIcon,
  FileIcon,
  AlertTriangleIcon,
  CircleAlertIcon,
  CircleXIcon,
  InfoIcon,
  AlertOctagonIcon,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import HealthScoreRing from "@/pages/dashboard/_components/health-score-ring.tsx";
import AuditStatusBadge from "../_components/audit-status-badge.tsx";
import AuditControls from "../_components/audit-controls.tsx";
import IssuesTab from "../_components/issues-tab.tsx";
import PagesTab from "../_components/pages-tab.tsx";

const SEVERITY_STATS = [
  {
    key: "criticalCount" as const,
    label: "Critical",
    icon: AlertOctagonIcon,
    color: "text-red-500",
  },
  {
    key: "highCount" as const,
    label: "High",
    icon: CircleXIcon,
    color: "text-orange-500",
  },
  {
    key: "mediumCount" as const,
    label: "Medium",
    icon: CircleAlertIcon,
    color: "text-amber-500",
  },
  {
    key: "lowCount" as const,
    label: "Low",
    icon: AlertTriangleIcon,
    color: "text-blue-500",
  },
  {
    key: "infoCount" as const,
    label: "Info",
    icon: InfoIcon,
    color: "text-slate-500",
  },
];

function AuditDetailContent() {
  const { auditId: auditIdParam } = useParams<{ auditId: string }>();
  const auditId = auditIdParam as Id<"audits">;

  const audit = useQuery(
    api.audits.queries.getById,
    auditId ? { auditId } : "skip",
  );

  // Loading
  if (audit === undefined) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-52 w-full rounded-xl" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  // Not found
  if (audit === null) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <Link
          to="/audit"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeftIcon className="size-4" />
          Back to audits
        </Link>
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold">Audit not found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            This audit may have been deleted or you don{"'"}t have access.
          </p>
          <Button asChild variant="secondary" size="sm" className="mt-4">
            <Link to="/audit">View all audits</Link>
          </Button>
        </div>
      </div>
    );
  }

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
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Back link */}
      <Link
        to="/audit"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeftIcon className="size-4" />
        Back to audits
      </Link>

      {/* Audit header card */}
      <Card>
        <CardContent className="py-5">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Score ring */}
            <div className="flex justify-center md:justify-start shrink-0">
              <HealthScoreRing
                score={audit.overallScore ?? null}
                size="lg"
              />
            </div>

            {/* Info + Stats */}
            <div className="flex-1 min-w-0 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <AuditStatusBadge status={audit.status} />
                  <span className="text-sm text-muted-foreground">
                    {auditDate}
                  </span>
                </div>

                {isRunning && (
                  <div className="flex items-center gap-3 max-w-md">
                    <Progress value={progress} className="h-2 flex-1" />
                    <span className="text-sm font-medium tabular-nums text-muted-foreground">
                      {progress}%
                    </span>
                  </div>
                )}

                {audit.errorMessage && (
                  <p className="text-sm text-destructive">
                    {audit.errorMessage}
                  </p>
                )}
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg bg-muted/50 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Pages crawled</p>
                  <p className="text-lg font-bold tabular-nums">
                    {audit.pagesCrawled}
                    <span className="text-sm font-normal text-muted-foreground">
                      /{audit.maxPages}
                    </span>
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Issues found</p>
                  <p className="text-lg font-bold tabular-nums">
                    {audit.issuesFound}
                  </p>
                </div>

                {/* Severity breakdown */}
                <div className="col-span-2 grid grid-cols-5 gap-1.5">
                  {SEVERITY_STATS.map((stat) => (
                    <div
                      key={stat.key}
                      className="rounded-lg bg-muted/50 px-2 py-2 text-center"
                    >
                      <stat.icon
                        className={cn("size-3.5 mx-auto mb-0.5", stat.color)}
                      />
                      <p className="text-sm font-bold tabular-nums">
                        {audit[stat.key]}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="shrink-0">
              <AuditControls audit={audit} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="issues">
        <TabsList>
          <TabsTrigger value="issues" className="gap-1.5">
            <AlertTriangleIcon className="size-3.5" />
            Issues
            {audit.issuesFound > 0 && (
              <span className="ml-1 text-xs tabular-nums bg-muted px-1.5 py-0.5 rounded-full">
                {audit.issuesFound}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="pages" className="gap-1.5">
            <FileIcon className="size-3.5" />
            Pages
            {audit.pagesCrawled > 0 && (
              <span className="ml-1 text-xs tabular-nums bg-muted px-1.5 py-0.5 rounded-full">
                {audit.pagesCrawled}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="issues" className="mt-4">
          <IssuesTab auditId={audit._id} />
        </TabsContent>

        <TabsContent value="pages" className="mt-4">
          <PagesTab auditId={audit._id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AuditDetailPage() {
  return (
    <>
      <Unauthenticated>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <p className="text-muted-foreground">
            Sign in to view audit details
          </p>
          <SignInButton />
        </div>
      </Unauthenticated>
      <AuthLoading>
        <div className="p-6 max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-52 w-full rounded-xl" />
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </AuthLoading>
      <Authenticated>
        <AuditDetailContent />
      </Authenticated>
    </>
  );
}
