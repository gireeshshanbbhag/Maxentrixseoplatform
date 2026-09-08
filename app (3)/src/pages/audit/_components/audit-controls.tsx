import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { toast } from "sonner";
import { PauseIcon, PlayIcon, XCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";

type AuditControlsProps = {
  audit: Doc<"audits">;
};

export default function AuditControls({ audit }: AuditControlsProps) {
  const updateStatus = useMutation(api.audits.queries.updateStatus);
  const resumeAudit = useMutation(api.audits.actions.resumeAudit);

  const canPause = audit.status === "crawling" || audit.status === "queued";
  const canResume = audit.status === "paused";
  const canCancel = canPause || canResume;

  if (!canPause && !canResume && !canCancel) return null;

  const handlePause = async () => {
    try {
      await updateStatus({ auditId: audit._id, status: "paused" });
      toast.success("Audit paused");
    } catch (error) {
      if (error instanceof ConvexError) {
        const data = error.data as { code: string; message: string };
        toast.error(data.message);
      } else {
        toast.error("Failed to pause audit");
      }
    }
  };

  const handleResume = async () => {
    try {
      await resumeAudit({ auditId: audit._id });
      toast.success("Audit resumed");
    } catch (error) {
      if (error instanceof ConvexError) {
        const data = error.data as { code: string; message: string };
        toast.error(data.message);
      } else {
        toast.error("Failed to resume audit");
      }
    }
  };

  const handleCancel = async () => {
    try {
      await updateStatus({ auditId: audit._id, status: "cancelled" });
      toast.success("Audit cancelled");
    } catch (error) {
      if (error instanceof ConvexError) {
        const data = error.data as { code: string; message: string };
        toast.error(data.message);
      } else {
        toast.error("Failed to cancel audit");
      }
    }
  };

  return (
    <div className="flex items-center gap-2">
      {canPause && (
        <Button
          variant="secondary"
          size="sm"
          onClick={handlePause}
          className="gap-1.5"
        >
          <PauseIcon className="size-3.5" />
          Pause
        </Button>
      )}
      {canResume && (
        <Button
          variant="secondary"
          size="sm"
          onClick={handleResume}
          className="gap-1.5"
        >
          <PlayIcon className="size-3.5" />
          Resume
        </Button>
      )}
      {canCancel && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          className="gap-1.5 text-destructive hover:text-destructive"
        >
          <XCircleIcon className="size-3.5" />
          Cancel
        </Button>
      )}
    </div>
  );
}
