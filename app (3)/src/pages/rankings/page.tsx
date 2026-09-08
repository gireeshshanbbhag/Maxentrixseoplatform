import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useCurrentProject } from "@/hooks/use-current-project.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  TrendingUpIcon,
  TrendingDownIcon,
  MinusIcon,
  ArrowRightIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

export default function RankingsPage() {
  const { activeProjectId } = useCurrentProject();
  const projects = useQuery(api.projects.list, {});
  const project = projects?.find((p) => p._id === activeProjectId);

  const movers = useQuery(
    api.keywords.queries.getRecentMovers,
    project ? { projectId: project._id } : "skip"
  );

  const stats = useQuery(
    api.keywords.queries.getKeywordStats,
    project ? { projectId: project._id } : "skip"
  );

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TrendingUpIcon />
            </EmptyMedia>
            <EmptyTitle>No project selected</EmptyTitle>
            <EmptyDescription>Select a project to view rankings</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Rankings Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Position changes and movement for {project.name}
          </p>
        </div>
        <Button asChild size="sm">
          <Link to="/keywords">
            View all keywords
            <ArrowRightIcon className="h-4 w-4 ml-1.5" />
          </Link>
        </Button>
      </div>

      {/* Position distribution */}
      {!stats ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : stats.tracking === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TrendingUpIcon />
            </EmptyMedia>
            <EmptyTitle>No keywords tracked yet</EmptyTitle>
            <EmptyDescription>
              Add keywords to start tracking rankings
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild size="sm">
              <Link to="/keywords">Add keywords</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          {/* Position buckets */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Top 3", value: stats.top3, color: "text-green-600 dark:text-green-400", bg: "bg-green-500/5" },
              { label: "Top 10", value: stats.top10, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/5" },
              { label: "Top 20", value: stats.top20, color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-500/5" },
              { label: "Top 50", value: stats.top50, color: "text-primary", bg: "bg-primary/5" },
              { label: "Top 100", value: stats.top100, color: "text-muted-foreground", bg: "bg-muted/50" },
              { label: "Unranked", value: stats.notRanked, color: "text-muted-foreground", bg: "bg-muted/30" },
            ].map((bucket) => (
              <div key={bucket.label} className={`rounded-xl border p-4 text-center ${bucket.bg}`}>
                <div className={`text-2xl font-bold tabular-nums ${bucket.color}`}>
                  {bucket.value}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{bucket.label}</div>
                {stats.tracking > 0 && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {Math.round((bucket.value / stats.tracking) * 100)}%
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Movers */}
          {!movers ? (
            <div className="grid md:grid-cols-2 gap-6">
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {/* Gainers */}
              <MoverCard
                title="Biggest Gainers"
                icon={<TrendingUpIcon className="h-4 w-4 text-green-600 dark:text-green-400" />}
                items={movers.gainers.map((g) => ({
                  keyword: g.keyword,
                  keywordId: g.keywordId,
                  position: g.position,
                  change: g.change,
                  direction: "up" as const,
                }))}
                emptyText="No ranking improvements yet"
              />

              {/* Losers */}
              <MoverCard
                title="Biggest Drops"
                icon={<TrendingDownIcon className="h-4 w-4 text-red-500" />}
                items={movers.losers.map((l) => ({
                  keyword: l.keyword,
                  keywordId: l.keywordId,
                  position: l.position,
                  change: Math.abs(l.change),
                  direction: "down" as const,
                }))}
                emptyText="No ranking drops detected"
              />

              {/* New entries */}
              <MoverCard
                title="New Rankings"
                icon={<MinusIcon className="h-4 w-4 text-primary" />}
                items={movers.newEntries.map((n) => ({
                  keyword: n.keyword,
                  keywordId: n.keywordId,
                  position: n.position,
                  change: 0,
                  direction: "new" as const,
                }))}
                emptyText="No new rankings found"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

type MoverItem = {
  keyword: string;
  keywordId: Id<"keywords">;
  position: number;
  change: number;
  direction: "up" | "down" | "new";
};

function MoverCard({
  title,
  icon,
  items,
  emptyText,
}: {
  title: string;
  icon: React.ReactNode;
  items: MoverItem[];
  emptyText: string;
}) {
  return (
    <div className="rounded-xl border overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/20">
        {icon}
        <span className="text-sm font-medium">{title}</span>
      </div>
      {items.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
          {emptyText}
        </div>
      ) : (
        <div className="divide-y">
          {items.map((item) => (
            <div key={item.keywordId} className="flex items-center gap-3 px-4 py-2.5">
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium truncate block capitalize">
                  {item.keyword}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-sm font-semibold tabular-nums text-muted-foreground">
                  #{item.position}
                </span>
                {item.direction === "up" && (
                  <span className="text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-0.5">
                    <TrendingUpIcon className="h-3 w-3" />
                    {item.change}
                  </span>
                )}
                {item.direction === "down" && (
                  <span className="text-xs font-medium text-red-500 flex items-center gap-0.5">
                    <TrendingDownIcon className="h-3 w-3" />
                    {item.change}
                  </span>
                )}
                {item.direction === "new" && (
                  <span className="text-xs font-medium text-primary">NEW</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
