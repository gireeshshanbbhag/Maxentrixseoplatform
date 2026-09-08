import { Card, CardContent } from "@/components/ui/card.tsx";
import { cn } from "@/lib/utils.ts";
import {
  HEALTH_CATEGORIES,
  getScoreColor,
  getScoreBgColor,
} from "@/lib/seo-health.ts";
import type { HealthCategoryId } from "@/lib/seo-health.ts";

type CategoryScores = Partial<Record<HealthCategoryId, number | null>>;

type HealthBreakdownCardsProps = {
  scores: CategoryScores;
};

export default function HealthBreakdownCards({
  scores,
}: HealthBreakdownCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {HEALTH_CATEGORIES.map((cat) => {
        const score = scores[cat.id] ?? null;
        const Icon = cat.icon;

        return (
          <Card
            key={cat.id}
            className="group relative overflow-hidden transition-colors hover:bg-accent/40"
          >
            <CardContent className="p-4 space-y-3">
              {/* Icon + label */}
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/8">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-xs font-medium truncate">
                  {cat.label}
                </span>
              </div>

              {/* Score bar */}
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <span
                    className={cn(
                      "text-xl font-bold tabular-nums",
                      score !== null
                        ? getScoreColor(score)
                        : "text-muted-foreground/30",
                    )}
                  >
                    {score !== null ? score : "--"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    / 100
                  </span>
                </div>
                {/* Progress bar */}
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  {score !== null && (
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-700",
                        getScoreBgColor(score),
                      )}
                      style={{ width: `${score}%` }}
                    />
                  )}
                </div>
              </div>

              {/* Description tooltip on hover */}
              <p className="text-[10px] leading-tight text-muted-foreground/70 line-clamp-2">
                {cat.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
