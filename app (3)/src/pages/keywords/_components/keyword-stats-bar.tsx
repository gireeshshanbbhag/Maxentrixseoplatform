import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

type Props = {
  projectId: Id<"projects">;
};

const GROUPS = [
  { label: "Top 3", key: "top3" as const, color: "text-green-600 dark:text-green-400" },
  { label: "Top 10", key: "top10" as const, color: "text-emerald-600 dark:text-emerald-400" },
  { label: "Top 20", key: "top20" as const, color: "text-teal-600 dark:text-teal-400" },
  { label: "Top 50", key: "top50" as const, color: "text-primary" },
  { label: "Top 100", key: "top100" as const, color: "text-muted-foreground" },
  { label: "Unranked", key: "notRanked" as const, color: "text-muted-foreground" },
];

export default function KeywordStatsBar({ projectId }: Props) {
  const stats = useQuery(api.keywords.queries.getKeywordStats, { projectId });

  if (!stats) {
    return (
      <div className="border-b px-6 py-3 flex items-center gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-20" />
        ))}
      </div>
    );
  }

  return (
    <div className="border-b px-6 py-3 flex items-center gap-1 overflow-x-auto">
      <div className="flex items-center gap-6 divide-x">
        <div className="pr-6">
          <div className="text-2xl font-bold tabular-nums">{stats.total}</div>
          <div className="text-xs text-muted-foreground">Total keywords</div>
        </div>
        {GROUPS.map((g) => (
          <div key={g.key} className="px-6">
            <div className={`text-xl font-semibold tabular-nums ${g.color}`}>
              {stats[g.key]}
            </div>
            <div className="text-xs text-muted-foreground">{g.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
