import { Badge } from "@/components/ui/badge.tsx";
import { cn } from "@/lib/utils.ts";
import { LoaderCircleIcon } from "lucide-react";

type AuditStatus =
  | "queued"
  | "crawling"
  | "paused"
  | "completed"
  | "cancelled"
  | "failed";

const STATUS_CONFIG: Record<AuditStatus, { label: string; className: string }> =
  {
    queued: {
      label: "Queued",
      className: "bg-muted text-muted-foreground",
    },
    crawling: {
      label: "Crawling",
      className:
        "bg-primary/10 text-primary border-primary/20",
    },
    paused: {
      label: "Paused",
      className:
        "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    },
    completed: {
      label: "Completed",
      className:
        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    },
    cancelled: {
      label: "Cancelled",
      className: "bg-muted text-muted-foreground",
    },
    failed: {
      label: "Failed",
      className:
        "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    },
  };

type AuditStatusBadgeProps = {
  status: string;
};

export default function AuditStatusBadge({ status }: AuditStatusBadgeProps) {
  const config = STATUS_CONFIG[status as AuditStatus] ?? {
    label: status,
    className: "bg-muted text-muted-foreground",
  };

  return (
    <Badge variant="outline" className={cn("gap-1 border", config.className)}>
      {status === "crawling" && (
        <LoaderCircleIcon className="size-3 animate-spin" />
      )}
      {config.label}
    </Badge>
  );
}
