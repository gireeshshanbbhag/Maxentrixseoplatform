import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  CheckCircleIcon,
  CircleIcon,
  SearchIcon,
  BarChart3Icon,
  ShieldCheckIcon,
  TargetIcon,
  SparklesIcon,
  SettingsIcon,
} from "lucide-react";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";

type SetupChecklistProps = {
  project: Doc<"projects">;
};

type ChecklistItem = {
  id: string;
  label: string;
  description: string;
  done: boolean;
  icon: React.ComponentType<{ className?: string }>;
};

export default function SetupChecklist({ project }: SetupChecklistProps) {
  const items: ChecklistItem[] = [
    {
      id: "project",
      label: "Project created",
      description: "Website details and business information saved",
      done: true,
      icon: CheckCircleIcon,
    },
    {
      id: "audit",
      label: "Run first site audit",
      description: "Crawl your website to detect technical issues",
      done: false,
      icon: ShieldCheckIcon,
    },
    {
      id: "gsc",
      label: "Connect Search Console",
      description: "Import real Google search performance data",
      done: !!project.gscPropertyUrl,
      icon: SearchIcon,
    },
    {
      id: "ga4",
      label: "Connect Analytics",
      description: "Understand organic traffic patterns",
      done: !!project.ga4PropertyId,
      icon: BarChart3Icon,
    },
    {
      id: "keywords",
      label: "Add target keywords",
      description: "Track the keywords you want to rank for",
      done: false,
      icon: TargetIcon,
    },
    {
      id: "ai",
      label: "Configure AI provider",
      description: "Unlock content analysis and writing assistance",
      done: false,
      icon: SparklesIcon,
    },
  ];

  const completedCount = items.filter((i) => i.done).length;
  const progressPercent = Math.round((completedCount / items.length) * 100);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">
              Setup progress
            </CardTitle>
          </div>
          <Badge variant="secondary" className="text-[10px]">
            {completedCount} / {items.length}
          </Badge>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mt-2">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="flex items-start gap-3 rounded-lg p-2.5 border transition-colors hover:bg-accent/30"
              >
                {item.done ? (
                  <CheckCircleIcon className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <CircleIcon className="h-4 w-4 text-muted-foreground/30 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <p
                    className={`text-sm font-medium ${item.done ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    {item.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
