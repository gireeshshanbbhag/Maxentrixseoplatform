import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils.ts";
import {
  HEALTH_CATEGORIES,
  getPriorityLabel,
  getPriorityColor,
} from "@/lib/seo-health.ts";
import type { SEOAction } from "@/lib/seo-health.ts";
import {
  ZapIcon,
} from "lucide-react";

type TopActionsWidgetProps = {
  actions: SEOAction[];
  isLoading?: boolean;
};

function SourceBadge({ source }: { source: SEOAction["source"] }) {
  const labels: Record<SEOAction["source"], string> = {
    heuristic: "Heuristic",
    google_data: "Google data",
    ai_suggestion: "AI suggestion",
  };
  return (
    <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
      {labels[source]}
    </span>
  );
}

function ImpactBar({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-muted-foreground w-12 shrink-0">
        {label}
      </span>
      <div className="h-1 flex-1 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary/60 transition-all duration-500"
          style={{ width: `${value * 10}%` }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground tabular-nums w-4 text-right">
        {value}
      </span>
    </div>
  );
}

export default function TopActionsWidget({
  actions,
  isLoading = false,
}: TopActionsWidgetProps) {
  const top10 = actions.slice(0, 10);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ZapIcon className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">
              What to do next
            </CardTitle>
          </div>
          <Badge variant="secondary" className="text-[10px]">
            {isLoading ? "…" : `${top10.length} actions`}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Prioritized by impact, confidence, and difficulty. Each
          recommendation shows its data source.
        </p>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))
        ) : top10.map((action, index) => {
          const cat = HEALTH_CATEGORIES.find((c) => c.id === action.category);
          const CatIcon = cat?.icon;
          return (
            <div
              key={action.id}
              className="flex gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/30"
            >
              {/* Index */}
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                {index + 1}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-2">
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                          getPriorityColor(action.priority),
                        )}
                      >
                        {getPriorityLabel(action.priority)}
                      </span>
                      {CatIcon && (
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <CatIcon className="h-3 w-3" />
                          {cat?.label}
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-medium mt-1.5 leading-snug">
                      {action.title}
                    </h4>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {action.description}
                </p>

                {/* Metrics row */}
                <div className="grid grid-cols-3 gap-3">
                  <ImpactBar value={action.impact} label="Impact" />
                  <ImpactBar value={action.confidence} label="Confidence" />
                  <ImpactBar
                    value={10 - action.difficulty}
                    label="Ease"
                  />
                </div>

                {/* Meta */}
                <div className="flex items-center gap-2 flex-wrap">
                  <SourceBadge source={action.source} />
                  {action.affectedPages !== undefined && (
                    <span className="text-[9px] text-muted-foreground">
                      {action.affectedPages} page
                      {action.affectedPages !== 1 ? "s" : ""} affected
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        </CardContent>
    </Card>
  );
}
