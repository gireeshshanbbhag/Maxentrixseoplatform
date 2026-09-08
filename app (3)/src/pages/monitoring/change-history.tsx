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
  ClockIcon, PlusIcon, TrashIcon, TrendingUpIcon, TrendingDownIcon,
  MinusIcon, FileEditIcon, LinkIcon, CodeIcon, TagIcon,
  SettingsIcon, WrenchIcon,
} from "lucide-react";
import { useCurrentProject } from "@/hooks/use-current-project.tsx";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select.tsx";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import Papa from "papaparse";

export default function ChangeHistoryPage() {
  return (
    <>
      <AuthLoading><div className="p-8"><Skeleton className="h-64 w-full" /></div></AuthLoading>
      <Unauthenticated><div className="flex justify-center p-8"><SignInButton /></div></Unauthenticated>
      <Authenticated><ChangeHistoryContent /></Authenticated>
    </>
  );
}

const CHANGE_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  content: { label: "Content", icon: <FileEditIcon className="h-3.5 w-3.5" />, color: "text-blue-600 bg-blue-500/10 border-blue-500/20" },
  technical: { label: "Technical", icon: <WrenchIcon className="h-3.5 w-3.5" />, color: "text-orange-600 bg-orange-500/10 border-orange-500/20" },
  links: { label: "Links", icon: <LinkIcon className="h-3.5 w-3.5" />, color: "text-purple-600 bg-purple-500/10 border-purple-500/20" },
  schema: { label: "Schema", icon: <CodeIcon className="h-3.5 w-3.5" />, color: "text-pink-600 bg-pink-500/10 border-pink-500/20" },
  meta: { label: "Meta", icon: <TagIcon className="h-3.5 w-3.5" />, color: "text-indigo-600 bg-indigo-500/10 border-indigo-500/20" },
  config: { label: "Config", icon: <SettingsIcon className="h-3.5 w-3.5" />, color: "text-amber-600 bg-amber-500/10 border-amber-500/20" },
  other: { label: "Other", icon: <ClockIcon className="h-3.5 w-3.5" />, color: "text-muted-foreground bg-muted/30 border-muted" },
};

const IMPACT_CONFIG = {
  positive: { label: "Positive", icon: <TrendingUpIcon className="h-3.5 w-3.5 text-green-600" /> },
  negative: { label: "Negative", icon: <TrendingDownIcon className="h-3.5 w-3.5 text-red-500" /> },
  neutral: { label: "Neutral", icon: <MinusIcon className="h-3.5 w-3.5 text-muted-foreground" /> },
};

function ChangeHistoryContent() {
  const { activeProjectId } = useCurrentProject();
  const projects = useQuery(api.projects.list, {});
  const project = projects?.find((p) => p._id === activeProjectId);
  const [showCreate, setShowCreate] = useState(false);
  const [filterType, setFilterType] = useState("all");

  if (!project) {
    return (
      <div className="p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><ClockIcon /></EmptyMedia>
            <EmptyTitle>No project selected</EmptyTitle>
            <EmptyDescription>Select a project to view change history</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const changes = useQuery(api.monitoring.queries.listChanges, { projectId: project._id });
  const deleteChange = useMutation(api.monitoring.mutations.deleteChange);
  const updateImpact = useMutation(api.monitoring.mutations.updateChangeImpact);

  const filtered = changes?.filter((c) => filterType === "all" || c.changeType === filterType) ?? [];

  function exportCSV() {
    if (!changes || changes.length === 0) return;
    const rows = changes.map((c) => ({
      Date: new Date(c.createdAt).toLocaleDateString(),
      Type: c.changeType,
      Title: c.title,
      Description: c.description,
      URL: c.url ?? "",
      "Expected Impact": c.impactExpected ?? "",
      "Actual Impact": c.impactActual ?? "",
      Notes: c.notes ?? "",
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `seo-changes-${project?.name ?? "project"}-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ClockIcon className="h-5 w-5 text-primary" />SEO Change History
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Log and track every SEO change to correlate with ranking and traffic shifts
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={exportCSV} disabled={!changes?.length}>
            Export CSV
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <PlusIcon className="h-4 w-4 mr-1.5" />Log Change
          </Button>
        </div>
      </div>

      {/* Filter row */}
      <div className="flex gap-2 flex-wrap">
        {["all", "content", "technical", "links", "schema", "meta", "config", "other"].map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium cursor-pointer transition-colors capitalize ${
              filterType === t
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-transparent text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            {t === "all" ? "All" : CHANGE_TYPE_CONFIG[t]?.label ?? t}
          </button>
        ))}
      </div>

      {changes === undefined ? (
        <div className="space-y-2">{[1,2,3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><ClockIcon /></EmptyMedia>
            <EmptyTitle>No changes logged yet</EmptyTitle>
            <EmptyDescription>Log SEO changes to track their impact on rankings and traffic</EmptyDescription>
          </EmptyHeader>
          <EmptyContent><Button size="sm" onClick={() => setShowCreate(true)}>Log First Change</Button></EmptyContent>
        </Empty>
      ) : (
        <div className="relative space-y-0">
          {/* Timeline line */}
          <div className="absolute left-[18px] top-0 bottom-0 w-px bg-border" />
          <div className="space-y-3 pl-10">
            {filtered.map((change) => {
              const typeCfg = CHANGE_TYPE_CONFIG[change.changeType] ?? CHANGE_TYPE_CONFIG.other;
              return (
                <div key={change._id} className="relative">
                  {/* Timeline dot */}
                  <div className={`absolute -left-10 mt-3 flex h-6 w-6 items-center justify-center rounded-full border ${typeCfg.color}`}>
                    {typeCfg.icon}
                  </div>
                  <div className="rounded-xl border p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold">{change.title}</span>
                          <span className={`text-[10px] font-medium border rounded px-1.5 py-0.5 ${typeCfg.color}`}>{typeCfg.label}</span>
                          {change.impactExpected && IMPACT_CONFIG[change.impactExpected as keyof typeof IMPACT_CONFIG] && (
                            <div className="flex items-center gap-1">
                              {IMPACT_CONFIG[change.impactExpected as keyof typeof IMPACT_CONFIG].icon}
                              <span className="text-xs text-muted-foreground">Expected: {IMPACT_CONFIG[change.impactExpected as keyof typeof IMPACT_CONFIG].label}</span>
                            </div>
                          )}
                          {change.impactActual && IMPACT_CONFIG[change.impactActual as keyof typeof IMPACT_CONFIG] && (
                            <div className="flex items-center gap-1">
                              {IMPACT_CONFIG[change.impactActual as keyof typeof IMPACT_CONFIG].icon}
                              <span className="text-xs font-medium">Actual: {IMPACT_CONFIG[change.impactActual as keyof typeof IMPACT_CONFIG].label}</span>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{change.description}</p>
                        {change.url && <p className="text-xs font-mono text-muted-foreground mt-0.5 truncate">{change.url}</p>}
                        {change.notes && <p className="text-xs text-muted-foreground mt-1 italic">{change.notes}</p>}
                        <p className="text-xs text-muted-foreground mt-1.5">
                          {formatDistanceToNow(new Date(change.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!change.impactActual && (
                          <div className="flex gap-1">
                            {(["positive", "negative", "neutral"] as const).map((r) => (
                              <button
                                key={r}
                                onClick={() => updateImpact({ changeId: change._id, impactActual: r })}
                                className={`text-[10px] px-2 py-1 rounded border cursor-pointer hover:opacity-80 ${IMPACT_CONFIG[r].label === "Positive" ? "border-green-500/30 text-green-600" : IMPACT_CONFIG[r].label === "Negative" ? "border-red-500/30 text-red-500" : "border-muted text-muted-foreground"}`}
                                title={`Mark as ${r} impact`}
                              >
                                {r}
                              </button>
                            ))}
                          </div>
                        )}
                        <button onClick={() => deleteChange({ changeId: change._id })} className="p-1.5 rounded hover:bg-muted cursor-pointer text-muted-foreground hover:text-destructive ml-1">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <LogChangeDialog open={showCreate} onClose={() => setShowCreate(false)} projectId={project._id} />
    </div>
  );
}

function LogChangeDialog({ open, onClose, projectId }: {
  open: boolean;
  onClose: () => void;
  projectId: Id<"projects">;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [changeType, setChangeType] = useState("content");
  const [url, setUrl] = useState("");
  const [impactExpected, setImpactExpected] = useState("positive");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const logChange = useMutation(api.monitoring.mutations.logChange);

  async function handleLog() {
    if (!title.trim() || !description.trim()) { toast.error("Title and description required"); return; }
    setSaving(true);
    try {
      await logChange({
        projectId, title, description, changeType,
        url: url || undefined,
        impactExpected: impactExpected || undefined,
        notes: notes || undefined,
      });
      toast.success("Change logged");
      onClose();
      setTitle(""); setDescription(""); setChangeType("content"); setUrl(""); setNotes("");
    } catch (e) {
      if (e instanceof ConvexError) toast.error((e.data as { message: string }).message);
      else toast.error("Failed to log change");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Log SEO Change</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs font-medium">Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" placeholder="Updated title tags on product pages" />
          </div>
          <div>
            <Label className="text-xs font-medium">Description *</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 text-sm" placeholder="Added primary keyword to first 10 product page title tags..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium">Change Type</Label>
              <Select value={changeType} onValueChange={setChangeType}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CHANGE_TYPE_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium">Expected Impact</Label>
              <Select value={impactExpected} onValueChange={setImpactExpected}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="positive">Positive</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="negative">Negative</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium">URL (optional)</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} className="mt-1 text-xs font-mono" placeholder="https://..." />
          </div>
          <div>
            <Label className="text-xs font-medium">Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 text-sm" placeholder="Additional context..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleLog} disabled={saving}>{saving ? "Logging…" : "Log Change"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
