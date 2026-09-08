import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Link } from "react-router-dom";
import {
  FolderPlusIcon,
  ArrowRightIcon,
  GlobeIcon,
  RadarIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { useCurrentProject } from "@/hooks/use-current-project.tsx";
import { getWebsiteTypeLabel } from "@/lib/constants.ts";
import { INITIAL_ACTIONS } from "@/lib/seo-health.ts";
import type { SEOAction } from "@/lib/seo-health.ts";
import HealthScoreRing from "./_components/health-score-ring.tsx";
import HealthBreakdownCards from "./_components/health-breakdown-cards.tsx";
import TopActionsWidget from "./_components/top-actions-widget.tsx";
import WhatChangedWidget from "./_components/what-changed-widget.tsx";
import SetupChecklist from "./_components/setup-checklist.tsx";

export default function Dashboard() {
  const user = useQuery(api.users.getCurrentUser, {});
  const projects = useQuery(api.projects.list, {});
  const { activeProjectId } = useCurrentProject();

  const activeProject = projects?.find((p) => p._id === activeProjectId);

  // Must be declared before any early returns (Rules of Hooks)
  const healthScores = useQuery(
    api.dashboard.healthScores.getHealthScores,
    activeProject ? { projectId: activeProject._id } : "skip"
  );
  const topActionsData = useQuery(
    api.dashboard.topActions.getTopActions,
    activeProject ? { projectId: activeProject._id } : "skip"
  );

  // Loading state
  if (user === undefined || projects === undefined) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 mt-8">
          <div className="space-y-4">
            <Skeleton className="h-52 w-full rounded-xl" />
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
          </div>
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  const greeting = user?.name ? `Welcome, ${user.name}` : "Welcome";
  const hasProjects = projects.length > 0;

  // No projects state — show onboarding
  if (!hasProjects) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">{greeting}</h2>
          <p className="text-muted-foreground">
            Your SEO command center is ready. Create a project to start
            auditing and optimizing.
          </p>
        </div>

        <Card className="border-dashed border-2 border-primary/20 bg-primary/[0.02]">
          <CardContent className="flex flex-col sm:flex-row items-center gap-6 py-8">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <FolderPlusIcon className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-lg font-semibold">
                Create your first project
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Add a website to start discovering SEO issues, tracking
                keywords, and getting optimization recommendations.
              </p>
            </div>
            <Button asChild size="lg">
              <Link to="/projects">
                Get started
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* How it works */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-3">
            How Maxentrix SEO Platform works
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                step: "1",
                title: "Add a project",
                text: "Enter your website URL and business details",
              },
              {
                step: "2",
                title: "Run an audit",
                text: "Crawl your site and detect technical issues",
              },
              {
                step: "3",
                title: "Connect Google",
                text: "Import Search Console and Analytics data",
              },
              {
                step: "4",
                title: "Optimize",
                text: "Follow prioritized actions to improve visibility",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {item.step}
                </div>
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Has projects but no active project selected
  if (!activeProject) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">{greeting}</h2>
          <p className="text-muted-foreground">
            Select a project from the sidebar to see its SEO health dashboard.
          </p>
        </div>

        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4">
              <RadarIcon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">No project selected</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">
              Use the project switcher in the sidebar to select a project, or
              go to Projects to create a new one.
            </p>
            <Button asChild variant="secondary" size="sm" className="mt-4">
              <Link to="/projects">View projects</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Health scores are computed above all early returns (Rules of Hooks)

  const overallScore = healthScores?.overall ?? null;
  const categoryScores = {
    technical: healthScores?.technical ?? null,
    content: healthScores?.content ?? null,
    indexation: healthScores?.indexation ?? null,
    links: healthScores?.links ?? null,
    keywords: healthScores?.keywords ?? null,
    performance: healthScores?.performance ?? null,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <GlobeIcon className="h-3.5 w-3.5" />
            <span className="truncate">{activeProject.websiteUrl}</span>
            <Badge variant="secondary" className="text-[10px]">
              {getWebsiteTypeLabel(activeProject.websiteType)}
            </Badge>
          </div>
        </div>
        <Button asChild variant="secondary" size="sm">
          <Link to="/projects">Manage project</Link>
        </Button>
      </div>

      {/* Top section: Health Score + Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* SEO Health Score card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              SEO Health Score
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3 pb-5">
            {healthScores === undefined ? (
              <>
                <Skeleton className="h-[180px] w-[180px] rounded-full" />
                <Skeleton className="h-3 w-40" />
              </>
            ) : (
              <>
                <HealthScoreRing score={overallScore} size="lg" />
                <p className="text-xs text-muted-foreground text-center max-w-[200px]">
                  {overallScore !== null
                    ? "Weighted average across all SEO categories"
                    : "Run a site audit to calculate your health score"}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Health breakdown */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Health breakdown</h3>
            <span className="text-[10px] text-muted-foreground">
              {healthScores !== undefined && overallScore !== null
                ? `Last updated from latest audit`
                : "Scores populate as you run audits and connect integrations"}
            </span>
          </div>
          {healthScores === undefined ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
          ) : (
            <HealthBreakdownCards scores={categoryScores} />
          )}
        </div>
      </div>

      {/* Bottom section: Actions + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Top actions */}
        <TopActionsWidget actions={(topActionsData ?? INITIAL_ACTIONS) as SEOAction[]} isLoading={topActionsData === undefined && !!activeProject} />

        {/* Right sidebar: What changed + Setup */}
        <div className="space-y-6">
          <WhatChangedWidget projectCreatedAt={activeProject._creationTime} />
          <SetupChecklist project={activeProject} />
        </div>
      </div>
    </div>
  );
}
