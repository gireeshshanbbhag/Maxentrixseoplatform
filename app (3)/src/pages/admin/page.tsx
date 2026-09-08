import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog.tsx";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select.tsx";
import {
  ShieldCheckIcon, UsersIcon, FolderOpenIcon, SearchIcon,
  BellIcon, ActivityIcon, ToggleLeftIcon, PlusIcon, PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";

export default function AdminPage() {
  const isAdmin = useQuery(api.users.isAdmin);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAdmin === false) navigate("/dashboard");
  }, [isAdmin, navigate]);

  if (isAdmin === undefined) return <Skeleton className="h-screen w-full" />;
  if (!isAdmin) return null;

  return (
    <div className="p-6 max-w-5xl space-y-5">
      <div className="flex items-center gap-2">
        <ShieldCheckIcon className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">Admin Dashboard</h1>
        <Badge variant="secondary" className="text-xs">Admin only</Badge>
      </div>
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="flags">Feature Flags</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4"><AdminOverview /></TabsContent>
        <TabsContent value="users" className="mt-4"><AdminUsers /></TabsContent>
        <TabsContent value="flags" className="mt-4"><AdminFeatureFlags /></TabsContent>
      </Tabs>
    </div>
  );
}

function AdminOverview() {
  const stats = useQuery(api.admin.queries.getStats);
  if (!stats) return <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({length:8}).map((_,i)=><Skeleton key={i} className="h-24 w-full"/>)}</div>;

  const cards = [
    { label: "Total Users", value: stats.totalUsers, icon: <UsersIcon className="h-4 w-4 text-primary"/>, color: "text-primary" },
    { label: "Admin Users", value: stats.adminCount, icon: <ShieldCheckIcon className="h-4 w-4 text-amber-500"/>, color: "text-amber-500" },
    { label: "Total Projects", value: stats.totalProjects, icon: <FolderOpenIcon className="h-4 w-4 text-blue-500"/>, color: "text-blue-500" },
    { label: "Total Keywords", value: stats.totalKeywords, icon: <SearchIcon className="h-4 w-4 text-green-500"/>, color: "text-green-500" },
    { label: "Total Audits", value: stats.totalAudits, icon: <ActivityIcon className="h-4 w-4 text-purple-500"/>, color: "text-purple-500" },
    { label: "Active Crawls", value: stats.activeAudits, icon: <ActivityIcon className="h-4 w-4 text-orange-500"/>, color: "text-orange-500" },
    { label: "Open Alerts", value: stats.openAlerts, icon: <BellIcon className="h-4 w-4 text-red-500"/>, color: "text-red-500" },
    { label: "Pro Users", value: stats.plans.pro, icon: <UsersIcon className="h-4 w-4 text-cyan-500"/>, color: "text-cyan-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">{c.icon}<span className="text-xs">{c.label}</span></div>
            <div className={`text-2xl font-bold tabular-nums ${c.color}`}>{c.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border p-4 space-y-3">
        <div className="text-sm font-semibold">Plan Distribution</div>
        <div className="flex gap-4">
          {(["free", "pro", "agency"] as const).map((plan) => {
            const count = stats.plans[plan as keyof typeof stats.plans] ?? 0;
            const pct = stats.totalUsers > 0 ? Math.round((count / stats.totalUsers) * 100) : 0;
            return (
              <div key={plan} className="flex-1 rounded-lg bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground capitalize mb-1">{plan}</div>
                <div className="text-lg font-bold">{count}</div>
                <div className="text-xs text-muted-foreground">{pct}%</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AdminUsers() {
  const users = useQuery(api.admin.queries.getAllUsers);
  const setRole = useMutation(api.users.setUserRole);
  const setPlan = useMutation(api.users.setUserPlan);

  if (!users) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">{users.length} total users</div>
      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 border-b">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground">User</th>
              <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground">Role</th>
              <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground">Plan</th>
              <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((u) => (
              <tr key={u._id} className="hover:bg-muted/10">
                <td className="px-4 py-2.5">
                  <div className="font-medium">{u.name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{u.email ?? "—"}</div>
                </td>
                <td className="px-4 py-2.5">
                  <Select
                    value={u.role ?? "user"}
                    onValueChange={async (val) => {
                      try {
                        await setRole({ userId: u._id, role: val as "admin" | "user" });
                        toast.success("Role updated");
                      } catch {
                        toast.error("Failed to update role");
                      }
                    }}
                  >
                    <SelectTrigger className="h-7 w-24 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-2.5">
                  <Select
                    value={u.plan ?? "free"}
                    onValueChange={async (val) => {
                      try {
                        await setPlan({ userId: u._id, plan: val });
                        toast.success("Plan updated");
                      } catch {
                        toast.error("Failed to update plan");
                      }
                    }}
                  >
                    <SelectTrigger className="h-7 w-24 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="agency">Agency</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(u._creationTime), { addSuffix: true })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Feature Flags ──────────────────────────────────────────────────────────────

type FlagForm = {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  rolloutPercent: string;
};

function AdminFeatureFlags() {
  const flags = useQuery(api.admin.queries.getFeatureFlags);
  const upsert = useMutation(api.admin.queries.upsertFeatureFlag);
  const remove = useMutation(api.admin.queries.deleteFeatureFlag);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Doc<"featureFlags"> | null>(null);
  const [form, setForm] = useState<FlagForm>({ key: "", label: "", description: "", enabled: true, rolloutPercent: "100" });

  function openNew() {
    setEditing(null);
    setForm({ key: "", label: "", description: "", enabled: true, rolloutPercent: "100" });
    setOpen(true);
  }

  function openEdit(f: Doc<"featureFlags">) {
    setEditing(f);
    setForm({
      key: f.key,
      label: f.label,
      description: f.description ?? "",
      enabled: f.enabled,
      rolloutPercent: String(f.rolloutPercent ?? 100),
    });
    setOpen(true);
  }

  async function save() {
    if (!form.key || !form.label) { toast.error("Key and label are required"); return; }
    try {
      await upsert({
        key: form.key,
        label: form.label,
        description: form.description || undefined,
        enabled: form.enabled,
        rolloutPercent: Number(form.rolloutPercent),
      });
      toast.success(editing ? "Flag updated" : "Flag created");
      setOpen(false);
    } catch {
      toast.error("Failed to save flag");
    }
  }

  async function handleDelete(id: Id<"featureFlags">) {
    try {
      await remove({ id });
      toast.success("Flag deleted");
    } catch {
      toast.error("Failed to delete flag");
    }
  }

  async function toggleFlag(flag: Doc<"featureFlags">) {
    try {
      await upsert({
        key: flag.key,
        label: flag.label,
        description: flag.description,
        enabled: !flag.enabled,
        rolloutPercent: flag.rolloutPercent,
        enabledForRoles: flag.enabledForRoles,
      });
    } catch {
      toast.error("Failed to toggle flag");
    }
  }

  const DEFAULT_FLAGS = [
    { key: "ai_writer", label: "AI Writer Studio", description: "GPT-powered content generation tools" },
    { key: "advanced_seo", label: "Advanced SEO Modules", description: "Cannibalization, entity SEO, image SEO" },
    { key: "gsc_integration", label: "Google Search Console", description: "OAuth GSC connection and data sync" },
    { key: "ga4_integration", label: "GA4 Analytics", description: "Google Analytics 4 OAuth and dashboards" },
    { key: "pagespeed", label: "PageSpeed Insights", description: "Core Web Vitals and performance analysis" },
    { key: "pdf_reports", label: "PDF Report Exports", description: "Weekly and monthly PDF report generation" },
    { key: "experiments", label: "SEO Experiments", description: "A/B testing and experiment tracking" },
    { key: "local_seo", label: "Local SEO Module", description: "NAP, GBP, local schema analysis" },
    { key: "aeo_geo", label: "AEO / GEO Modules", description: "Answer engine and generative search optimization" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Control which features are active across the app</p>
        <Button size="sm" onClick={openNew}>
          <PlusIcon className="h-4 w-4 mr-1.5" />New Flag
        </Button>
      </div>

      {!flags ? <Skeleton className="h-64 w-full" /> : (
        <>
          {flags.length === 0 && (
            <div className="rounded-xl border p-6 text-center space-y-3">
              <ToggleLeftIcon className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">No feature flags yet. Seed the defaults below or create one manually.</p>
              <Button size="sm" variant="secondary" onClick={async () => {
                for (const f of DEFAULT_FLAGS) {
                  await upsert({ key: f.key, label: f.label, description: f.description, enabled: true, rolloutPercent: 100 });
                }
                toast.success("Default flags seeded");
              }}>Seed Default Flags</Button>
            </div>
          )}
          <div className="space-y-2">
            {flags.map((f) => (
              <div key={f._id} className="rounded-xl border p-4 flex items-center gap-4">
                <Switch
                  checked={f.enabled}
                  onCheckedChange={() => toggleFlag(f)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{f.label}</span>
                    <span className="text-xs text-muted-foreground font-mono bg-muted/50 px-1.5 py-0.5 rounded">{f.key}</span>
                    {f.enabled ? (
                      <Badge className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20 border">ON</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">OFF</Badge>
                    )}
                  </div>
                  {f.description && <p className="text-xs text-muted-foreground mt-0.5">{f.description}</p>}
                  {f.rolloutPercent !== undefined && f.rolloutPercent < 100 && (
                    <p className="text-xs text-amber-600 mt-0.5">{f.rolloutPercent}% rollout</p>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <Button size="icon" variant="ghost" className="h-7 w-7 cursor-pointer" onClick={() => openEdit(f)}>
                    <PencilIcon className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive cursor-pointer" onClick={() => handleDelete(f._id)}>
                    <Trash2Icon className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Feature Flag" : "New Feature Flag"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Key <span className="text-muted-foreground text-xs">(snake_case)</span></Label>
              <Input value={form.key} onChange={(e) => setForm(p => ({...p, key: e.target.value}))} placeholder="ai_writer" disabled={!!editing} />
            </div>
            <div className="space-y-1.5">
              <Label>Label</Label>
              <Input value={form.label} onChange={(e) => setForm(p => ({...p, label: e.target.value}))} placeholder="AI Writer Studio" />
            </div>
            <div className="space-y-1.5">
              <Label>Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input value={form.description} onChange={(e) => setForm(p => ({...p, description: e.target.value}))} placeholder="Brief description" />
            </div>
            <div className="space-y-1.5">
              <Label>Rollout % <span className="text-muted-foreground text-xs">(1–100)</span></Label>
              <Input type="number" min={1} max={100} value={form.rolloutPercent} onChange={(e) => setForm(p => ({...p, rolloutPercent: e.target.value}))} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.enabled} onCheckedChange={(v) => setForm(p => ({...p, enabled: v}))} />
              <Label>Enabled</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save Flag</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
