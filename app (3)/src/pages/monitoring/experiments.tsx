import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { SignInButton } from "@/components/ui/signin.tsx";
import {
  Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent,
} from "@/components/ui/empty.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import {
  FlaskConicalIcon, PlusIcon, PlayIcon, PauseIcon, CheckIcon, TrashIcon,
  TrendingUpIcon, TrendingDownIcon, MinusIcon, ChevronDownIcon, ChevronUpIcon,
} from "lucide-react";
import { useCurrentProject } from "@/hooks/use-current-project.tsx";
import { formatDistanceToNow, format } from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";

export default function ExperimentsPage() {
  return (
    <>
      <AuthLoading><div className="p-8"><Skeleton className="h-64 w-full" /></div></AuthLoading>
      <Unauthenticated><div className="flex justify-center p-8"><SignInButton /></div></Unauthenticated>
      <Authenticated><ExperimentsContent /></Authenticated>
    </>
  );
}

function ExperimentsContent() {
  const { activeProjectId } = useCurrentProject();
  const projects = useQuery(api.projects.list, {});
  const project = projects?.find((p) => p._id === activeProjectId);
  const [showCreate, setShowCreate] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!project) {
    return (
      <div className="p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><FlaskConicalIcon /></EmptyMedia>
            <EmptyTitle>No project selected</EmptyTitle>
            <EmptyDescription>Select a project to run SEO experiments</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const experiments = useQuery(api.monitoring.queries.listExperiments, { projectId: project._id });
  const updateExp = useMutation(api.monitoring.mutations.updateExperiment);
  const deleteExp = useMutation(api.monitoring.mutations.deleteExperiment);

  const STATUS_CONFIG = {
    planned: { label: "Planned", color: "text-muted-foreground", bg: "bg-muted/30" },
    running: { label: "Running", color: "text-blue-600", bg: "bg-blue-500/10" },
    paused: { label: "Paused", color: "text-amber-600", bg: "bg-amber-500/10" },
    completed: { label: "Completed", color: "text-green-600", bg: "bg-green-500/10" },
    abandoned: { label: "Abandoned", color: "text-muted-foreground", bg: "bg-muted/30" },
  };

  const RESULT_CONFIG = {
    positive: { label: "Positive", icon: <TrendingUpIcon className="h-4 w-4 text-green-600" /> },
    negative: { label: "Negative", icon: <TrendingDownIcon className="h-4 w-4 text-red-500" /> },
    neutral: { label: "Neutral", icon: <MinusIcon className="h-4 w-4 text-muted-foreground" /> },
    inconclusive: { label: "Inconclusive", icon: <MinusIcon className="h-4 w-4 text-amber-500" /> },
  };

  async function advance(exp: Doc<"seoExperiments">) {
    const nextStatus = exp.status === "planned" ? "running" : exp.status === "running" ? "completed" : null;
    if (!nextStatus) return;
    try {
      await updateExp({ experimentId: exp._id, status: nextStatus });
    } catch (e) {
      if (e instanceof ConvexError) toast.error((e.data as { message: string }).message);
    }
  }

  return (
    <div className="p-6 max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FlaskConicalIcon className="h-5 w-5 text-primary" />SEO Experiments
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track hypothesis-driven SEO changes and measure their impact
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <PlusIcon className="h-4 w-4 mr-1.5" />New Experiment
        </Button>
      </div>

      {experiments === undefined ? (
        <div className="space-y-2">{[1,2,3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : experiments.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><FlaskConicalIcon /></EmptyMedia>
            <EmptyTitle>No experiments yet</EmptyTitle>
            <EmptyDescription>Create your first experiment to track SEO changes scientifically</EmptyDescription>
          </EmptyHeader>
          <EmptyContent><Button size="sm" onClick={() => setShowCreate(true)}>Create Experiment</Button></EmptyContent>
        </Empty>
      ) : (
        <div className="space-y-3">
          {experiments.map((exp) => {
            const sCfg = STATUS_CONFIG[exp.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.planned;
            const isExpanded = expanded === exp._id;
            const posChange = exp.currentPosition !== undefined && exp.baselinePosition !== undefined
              ? exp.baselinePosition - exp.currentPosition
              : null;

            return (
              <div key={exp._id} className="rounded-xl border overflow-hidden">
                <div className="p-4 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">{exp.title}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sCfg.bg} ${sCfg.color}`}>{sCfg.label}</span>
                      {exp.result && RESULT_CONFIG[exp.result as keyof typeof RESULT_CONFIG] && (
                        <div className="flex items-center gap-1">
                          {RESULT_CONFIG[exp.result as keyof typeof RESULT_CONFIG].icon}
                          <span className="text-xs">{RESULT_CONFIG[exp.result as keyof typeof RESULT_CONFIG].label}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{exp.hypothesis}</p>
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                      {exp.targetKeyword && <span>Keyword: <span className="font-medium text-foreground">{exp.targetKeyword}</span></span>}
                      {exp.baselinePosition !== undefined && <span>Baseline: <span className="font-medium text-foreground">#{exp.baselinePosition}</span></span>}
                      {exp.currentPosition !== undefined && <span>Now: <span className="font-medium text-foreground">#{exp.currentPosition}</span></span>}
                      {posChange !== null && (
                        <span className={posChange > 0 ? "text-green-600 font-medium" : posChange < 0 ? "text-red-500 font-medium" : ""}>
                          {posChange > 0 ? `↑${posChange}` : posChange < 0 ? `↓${Math.abs(posChange)}` : "No change"}
                        </span>
                      )}
                      <span>{formatDistanceToNow(new Date(exp.createdAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {exp.status === "planned" && (
                      <button onClick={() => advance(exp)} className="p-1.5 rounded hover:bg-muted cursor-pointer text-muted-foreground hover:text-blue-600" title="Start">
                        <PlayIcon className="h-4 w-4" />
                      </button>
                    )}
                    {exp.status === "running" && (
                      <button onClick={() => advance(exp)} className="p-1.5 rounded hover:bg-muted cursor-pointer text-muted-foreground hover:text-green-600" title="Mark complete">
                        <CheckIcon className="h-4 w-4" />
                      </button>
                    )}
                    <button onClick={() => setExpanded(isExpanded ? null : exp._id)} className="p-1.5 rounded hover:bg-muted cursor-pointer text-muted-foreground">
                      {isExpanded ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
                    </button>
                    <button onClick={() => deleteExp({ experimentId: exp._id })} className="p-1.5 rounded hover:bg-muted cursor-pointer text-muted-foreground hover:text-destructive">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {isExpanded && (
                  <div className="border-t px-4 py-3 bg-muted/10 space-y-2 text-xs text-muted-foreground">
                    <div><span className="font-medium text-foreground">Change: </span>{exp.changeDescription}</div>
                    {exp.targetUrl && <div><span className="font-medium text-foreground">URL: </span><span className="font-mono">{exp.targetUrl}</span></div>}
                    {exp.notes && <div><span className="font-medium text-foreground">Notes: </span>{exp.notes}</div>}
                    {exp.startedAt && <div>Started: {format(new Date(exp.startedAt), "MMM d, yyyy")}</div>}
                    {exp.completedAt && <div>Completed: {format(new Date(exp.completedAt), "MMM d, yyyy")}</div>}
                    {exp.status === "running" && (
                      <div className="flex gap-2 pt-1">
                        {(["positive", "negative", "neutral", "inconclusive"] as const).map((r) => (
                          <Button key={r} variant="secondary" size="sm" className="text-xs h-7"
                            onClick={() => updateExp({ experimentId: exp._id, result: r })}>
                            {r}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <CreateExperimentDialog open={showCreate} onClose={() => setShowCreate(false)} projectId={project._id} />
    </div>
  );
}

function CreateExperimentDialog({ open, onClose, projectId }: {
  open: boolean;
  onClose: () => void;
  projectId: Id<"projects">;
}) {
  const [title, setTitle] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const [changeDescription, setChangeDescription] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [targetKeyword, setTargetKeyword] = useState("");
  const [baselinePosition, setBaselinePosition] = useState("");
  const [baselineClicks, setBaselineClicks] = useState("");
  const [saving, setSaving] = useState(false);

  const createExp = useMutation(api.monitoring.mutations.createExperiment);

  async function handleCreate() {
    if (!title.trim() || !hypothesis.trim() || !changeDescription.trim()) {
      toast.error("Title, hypothesis, and change description are required");
      return;
    }
    setSaving(true);
    try {
      await createExp({
        projectId, title, hypothesis, changeDescription,
        targetUrl: targetUrl || undefined,
        targetKeyword: targetKeyword || undefined,
        baselinePosition: baselinePosition ? Number(baselinePosition) : undefined,
        baselineClicks: baselineClicks ? Number(baselineClicks) : undefined,
      });
      toast.success("Experiment created");
      onClose();
      setTitle(""); setHypothesis(""); setChangeDescription(""); setTargetUrl("");
      setTargetKeyword(""); setBaselinePosition(""); setBaselineClicks("");
    } catch (e) {
      if (e instanceof ConvexError) toast.error((e.data as { message: string }).message);
      else toast.error("Failed to create experiment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New SEO Experiment</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs font-medium">Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" placeholder="Add FAQ schema to homepage" />
          </div>
          <div>
            <Label className="text-xs font-medium">Hypothesis *</Label>
            <Textarea value={hypothesis} onChange={(e) => setHypothesis(e.target.value)} className="mt-1 text-sm min-h-[60px]" placeholder="If we add FAQ schema, CTR will increase by 10% within 30 days" />
          </div>
          <div>
            <Label className="text-xs font-medium">Change Description *</Label>
            <Textarea value={changeDescription} onChange={(e) => setChangeDescription(e.target.value)} className="mt-1 text-sm min-h-[60px]" placeholder="Added FAQPage JSON-LD to <head> of homepage" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium">Target URL</Label>
              <Input value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} className="mt-1 text-xs" placeholder="https://..." />
            </div>
            <div>
              <Label className="text-xs font-medium">Target Keyword</Label>
              <Input value={targetKeyword} onChange={(e) => setTargetKeyword(e.target.value)} className="mt-1 text-xs" placeholder="best CRM software" />
            </div>
            <div>
              <Label className="text-xs font-medium">Baseline Position</Label>
              <Input value={baselinePosition} onChange={(e) => setBaselinePosition(e.target.value)} className="mt-1 text-xs" placeholder="8" type="number" />
            </div>
            <div>
              <Label className="text-xs font-medium">Baseline Clicks/day</Label>
              <Input value={baselineClicks} onChange={(e) => setBaselineClicks(e.target.value)} className="mt-1 text-xs" placeholder="120" type="number" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving}>{saving ? "Creating…" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
