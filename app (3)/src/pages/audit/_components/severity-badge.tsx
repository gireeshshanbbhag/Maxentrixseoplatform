import { Badge } from "@/components/ui/badge.tsx";
import { cn } from "@/lib/utils.ts";

type Severity = "critical" | "high" | "medium" | "low" | "info";

const SEVERITY_CONFIG: Record<
  Severity,
  { label: string; className: string }
> = {
  critical: {
    label: "Critical",
    className:
      "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  },
  high: {
    label: "High",
    className:
      "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  },
  medium: {
    label: "Medium",
    className:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  low: {
    label: "Low",
    className:
      "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  info: {
    label: "Info",
    className:
      "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
  },
};

type SeverityBadgeProps = {
  severity: string;
};

export default function SeverityBadge({ severity }: SeverityBadgeProps) {
  const config = SEVERITY_CONFIG[severity as Severity] ?? {
    label: severity,
    className: "bg-muted text-muted-foreground",
  };

  return (
    <Badge variant="outline" className={cn("border", config.className)}>
      {config.label}
    </Badge>
  );
}
