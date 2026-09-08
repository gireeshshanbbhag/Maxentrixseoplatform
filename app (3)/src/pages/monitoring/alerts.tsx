import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { SignInButton } from "@/components/ui/signin.tsx";
import {
  Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent,
} from "@/components/ui/empty.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import {
  BellIcon, CheckCheckIcon, CheckCircleIcon, TrashIcon,
  AlertTriangleIcon, XCircleIcon, InfoIcon, PlusIcon,
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

export default function AlertsPage() {
  return (
    <>
      <AuthLoading><div className="p-8"><Skeleton className="h-64 w-full" /></div></AuthLoading>
      <Unauthenticated><div className="flex justify-center p-8"><SignInButton /></div></Unauthenticated>
      <Authenticated><AlertsContent /></Authenticated>
    </>
  );
}

function AlertsContent() {
  const { activeProjectId } = useCurrentProject();
  const projects = useQuery(api.projects.list, {});
  const project = projects?.find((p) => p._id === activeProjectId);
  const [tab, setTab] = useState<"all" | "unread">("unread");
  const [showCreate, setShowCreate] = useState(false);

  if (!project) {
    return (
      <div className="p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><BellIcon /></EmptyMedia>
            <EmptyTitle>No project selected</EmptyTitle>
            <EmptyDescription>Select a project to view alerts</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <BellIcon className="h-5 w-5 text-primary" />Alert Center
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Ranking drops, traffic changes, crawl errors, and indexation issues
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <PlusIcon className="h-4 w-4 mr-1.5" />New Alert
        </Button>
      </div>

      <AlertList projectId={project._id} tab={tab} onTabChange={setTab} />
      <CreateAlertDialog open={showCreate} onClose={() => setShowCreate(false)} projectId={project._id} />
    </div>
  );
}

function AlertList({ projectId, tab, onTabChange }: {
  projectId: Id<"projects">;
  tab: "all" | "unread";
  onTabChange: (t: "all" | "unread") => void;
}) {
  const allAlerts = useQuery(api.monitoring.queries.listAlerts, { projectId });
  const unreadAlerts = useQuery(api.monitoring.queries.listAlerts, { projectId, onlyUnread: true });
  const markRead = useMutation(api.monitoring.mutations.markAlertRead);
  const resolve = useMutation(api.monitoring.mutations.resolveAlert);
  const remove = useMutation(api.monitoring.mutations.deleteAlert);
  const markAllRead = useMutation(api.monitoring.mutations.markAllRead);

  const alerts = tab === "unread" ? unreadAlerts : allAlerts;
  const unreadCount = unreadAlerts?.length ?? 0;

  if (alerts === undefined) {
    return <div className="space-y-2">{[1,2,3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>;
  }

  const SEVERITY_CONFIG = {
    critical: { label: "Critical", color: "text-red-600", bg: "border-red-500/30 bg-red-500/5", icon: <XCircleIcon className="h-4 w-4 text-red-500 shrink-0" /> },
    high: { label: "High", color: "text-orange-500", bg: "border-orange-500/30 bg-orange-500/5", icon: <AlertTriangleIcon className="h-4 w-4 text-orange-500 shrink-0" /> },
    medium: { label: "Medium", color: "text-amber-600", bg: "border-amber-500/30 bg-amber-500/5", icon: <AlertTriangleIcon className="h-4 w-4 text-amber-500 shrink-0" /> },
    low: { label: "Low", color: "text-blue-500", bg: "border-blue-500/30 bg-blue-500/5", icon: <InfoIcon className="h-4 w-4 text-blue-500 shrink-0" /> },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Tabs value={tab} onValueChange={(v) => onTabChange(v as "all" | "unread")}>
          <TabsList>
            <TabsTrigger value="unread">
              Unread {unreadCount > 0 && <Badge variant="secondary" className="ml-1.5 text-xs">{unreadCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={() => markAllRead({ projectId })}>
            <CheckCheckIcon className="h-4 w-4 mr-1.5" />Mark all read
          </Button>
        )}
      </div>

      {alerts.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><CheckCircleIcon /></EmptyMedia>
            <EmptyTitle>{tab === "unread" ? "No unread alerts" : "No alerts yet"}</EmptyTitle>
            <EmptyDescription>
              {tab === "unread" ? "You're all caught up!" : "Alerts will appear here when issues are detected"}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => {
            const cfg = SEVERITY_CONFIG[alert.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.medium;
            return (
              <div key={alert._id} className={`rounded-xl border p-4 transition-opacity ${alert.isRead ? "opacity-60" : ""} ${cfg.bg}`}>
                <div className="flex items-start gap-3">
                  {cfg.icon}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">{alert.title}</span>
                      <Badge variant="secondary" className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
                      {alert.isResolved && <Badge variant="secondary" className="text-xs text-green-600">Resolved</Badge>}
                      {!alert.isRead && <div className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
                    {(alert.currentValue !== undefined || alert.previousValue !== undefined) && (
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {alert.previousValue !== undefined && <span>Before: <span className="font-medium">{alert.previousValue}</span></span>}
                        {alert.currentValue !== undefined && <span>Now: <span className="font-medium">{alert.currentValue}</span></span>}
                        {alert.metric && <span className="capitalize">{alert.metric.replace(/_/g, " ")}</span>}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!alert.isRead && (
                      <button onClick={() => markRead({ alertId: alert._id })} className="p-1.5 rounded hover:bg-background/50 cursor-pointer text-muted-foreground hover:text-foreground" title="Mark as read">
                        <CheckCircleIcon className="h-4 w-4" />
                      </button>
                    )}
                    {!alert.isResolved && (
                      <button onClick={() => resolve({ alertId: alert._id })} className="p-1.5 rounded hover:bg-background/50 cursor-pointer text-muted-foreground hover:text-green-600" title="Resolve">
                        <CheckCheckIcon className="h-4 w-4" />
                      </button>
                    )}
                    <button onClick={() => remove({ alertId: alert._id })} className="p-1.5 rounded hover:bg-background/50 cursor-pointer text-muted-foreground hover:text-destructive" title="Delete">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CreateAlertDialog({ open, onClose, projectId }: {
  open: boolean;
  onClose: () => void;
  projectId: Id<"projects">;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("custom");
  const [severity, setSeverity] = useState("medium");
  const [metric, setMetric] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [previousValue, setPreviousValue] = useState("");
  const [saving, setSaving] = useState(false);

  const createAlert = useMutation(api.monitoring.mutations.createAlert);

  async function handleCreate() {
    if (!title.trim() || !description.trim()) { toast.error("Title and description required"); return; }
    setSaving(true);
    try {
      await createAlert({
        projectId, title, description, type, severity,
        metric: metric || undefined,
        currentValue: currentValue ? Number(currentValue) : undefined,
        previousValue: previousValue ? Number(previousValue) : undefined,
      });
      toast.success("Alert created");
      onClose();
      setTitle(""); setDescription(""); setType("custom"); setSeverity("medium");
      setMetric(""); setCurrentValue(""); setPreviousValue("");
    } catch (e) {
      if (e instanceof ConvexError) toast.error((e.data as { message: string }).message);
      else toast.error("Failed to create alert");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Create Alert</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs font-medium">Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" placeholder="Ranking drop detected" />
          </div>
          <div>
            <Label className="text-xs font-medium">Description *</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 text-sm" placeholder="What happened and why it matters..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ranking_drop">Ranking Drop</SelectItem>
                  <SelectItem value="traffic_drop">Traffic Drop</SelectItem>
                  <SelectItem value="crawl_error">Crawl Error</SelectItem>
                  <SelectItem value="index_issue">Index Issue</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium">Severity</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-medium">Metric</Label>
              <Input value={metric} onChange={(e) => setMetric(e.target.value)} className="mt-1 text-xs" placeholder="position" />
            </div>
            <div>
              <Label className="text-xs font-medium">Previous</Label>
              <Input value={previousValue} onChange={(e) => setPreviousValue(e.target.value)} className="mt-1 text-xs" placeholder="5" type="number" />
            </div>
            <div>
              <Label className="text-xs font-medium">Current</Label>
              <Input value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} className="mt-1 text-xs" placeholder="12" type="number" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving}>{saving ? "Creating…" : "Create Alert"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
