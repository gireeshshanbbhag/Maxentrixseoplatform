import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { useCurrentProject } from "@/hooks/use-current-project.tsx";
import { SearchIcon, PlusIcon, RadarIcon } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty.tsx";
import AuditCard from "./_components/audit-card.tsx";
import NewAuditDialog from "./_components/new-audit-dialog.tsx";

function AuditListContent() {
  const { activeProjectId } = useCurrentProject();
  const [dialogOpen, setDialogOpen] = useState(false);

  const audits = useQuery(
    api.audits.queries.listByProject,
    activeProjectId ? { projectId: activeProjectId } : "skip",
  );

  // No active project
  if (!activeProjectId) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="space-y-2 mb-8">
          <h2 className="text-2xl font-bold tracking-tight">Site Audit</h2>
          <p className="text-sm text-muted-foreground">
            Crawl your website to discover SEO issues, broken links, and
            optimization opportunities.
          </p>
        </div>
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <RadarIcon />
            </EmptyMedia>
            <EmptyTitle>No project selected</EmptyTitle>
            <EmptyDescription>
              Select a project from the sidebar to run site audits.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  // Loading
  if (audits === undefined) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Site Audit</h2>
          <p className="text-sm text-muted-foreground">
            Crawl your website to discover SEO issues, broken links, and
            optimization opportunities.
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="gap-1.5 shrink-0"
        >
          <PlusIcon className="size-4" />
          New Audit
        </Button>
      </div>

      {/* Audit list */}
      {audits.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchIcon />
            </EmptyMedia>
            <EmptyTitle>No audits yet</EmptyTitle>
            <EmptyDescription>
              Run your first site audit to discover technical SEO issues and get
              actionable recommendations.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              size="sm"
              onClick={() => setDialogOpen(true)}
              className="gap-1.5"
            >
              <PlusIcon className="size-4" />
              Run first audit
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="space-y-3">
          {audits.map((audit) => (
            <AuditCard key={audit._id} audit={audit} />
          ))}
        </div>
      )}

      {/* New audit dialog */}
      <NewAuditDialog
        projectId={activeProjectId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}

export default function AuditPage() {
  return (
    <>
      <Unauthenticated>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <p className="text-muted-foreground">
            Sign in to access site audits
          </p>
          <SignInButton />
        </div>
      </Unauthenticated>
      <AuthLoading>
        <div className="p-6 max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-80" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </AuthLoading>
      <Authenticated>
        <AuditListContent />
      </Authenticated>
    </>
  );
}
