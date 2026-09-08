import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  HistoryIcon,
  InfoIcon,
} from "lucide-react";

type ChangeEntry = {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: "improvement" | "regression" | "neutral";
};

// Before audit data exists, show onboarding-oriented changes
const INITIAL_CHANGES: ChangeEntry[] = [
  {
    id: "project-created",
    title: "Project created",
    description: "Your SEO project is set up and ready for auditing.",
    timestamp: "Just now",
    type: "improvement",
  },
];

type WhatChangedWidgetProps = {
  changes?: ChangeEntry[];
  projectCreatedAt?: number;
};

function TypeDot({ type }: { type: ChangeEntry["type"] }) {
  const colors: Record<ChangeEntry["type"], string> = {
    improvement: "bg-emerald-500",
    regression: "bg-red-500",
    neutral: "bg-muted-foreground/40",
  };
  return <div className={`h-2 w-2 rounded-full shrink-0 ${colors[type]}`} />;
}

export default function WhatChangedWidget({
  changes,
  projectCreatedAt,
}: WhatChangedWidgetProps) {
  const items = changes && changes.length > 0 ? changes : INITIAL_CHANGES;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <HistoryIcon className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-semibold">What changed</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">
          Recent SEO changes and events for this project.
        </p>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3 rounded-lg p-2 hover:bg-accent/30 transition-colors"
          >
            <div className="mt-1.5">
              <TypeDot type={item.type} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{item.title}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {item.timestamp}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {item.description}
              </p>
            </div>
          </div>
        ))}

        {items.length <= 1 && (
          <div className="flex items-start gap-2 rounded-lg border border-dashed p-3 mt-2">
            <InfoIcon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Changes from site audits, ranking movements, and content updates
              will appear here once you run your first audit and connect Google
              integrations.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
