import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { ConvexError } from "convex/values";
import { Input } from "@/components/ui/input.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  LockIcon,
  SearchIcon,
  RefreshCwIcon,
  LinkIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronRightIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  MinusIcon,
  EyeIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

// ─── Types ───────────────────────────────────────────────────────────────────
type ProjectRow = {
  _id: Id<"projects">;
  name: string;
  websiteUrl: string;
  spySerpProjectId?: number;
  spySerpDomainId?: number;
  status: string;
  userName?: string;
  userEmail?: string;
  country?: string;
  _creationTime: number;
};

type Keyword = {
  _id: Id<"keywords">;
  keyword: string;
  serpPosition?: number;
  serpPreviousPosition?: number;
  gscPosition?: number;
  searchVolume?: number;
  status: string;
};

// ─── Password gate ─────────────────────────────────────────────────────────
function PasswordGate({ onAuth }: { onAuth: (pw: string) => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 p-8 border rounded-xl bg-card shadow-sm">
        <div className="flex flex-col items-center gap-2">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <LockIcon className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-lg font-semibold">SERP Admin</h1>
          <p className="text-sm text-muted-foreground text-center">
            Enter the admin password to manage SERP tracking projects
          </p>
        </div>
        <div className="space-y-3">
          <Input
            type="password"
            placeholder="Admin password"
            value={pw}
            onChange={(e) => { setPw(e.target.value); setErr(""); }}
            onKeyDown={(e) => e.key === "Enter" && onAuth(pw)}
            className="h-10"
          />
          {err && <p className="text-xs text-destructive">{err}</p>}
          <Button className="w-full cursor-pointer" onClick={() => onAuth(pw)} disabled={!pw.trim()}>
            Sign In
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Position badge ───────────────────────────────────────────────────────
function PosBadge({ pos, prev }: { pos?: number; prev?: number }) {
  if (pos === undefined) return <span className="text-muted-foreground text-xs">—</span>;
  const delta = prev !== undefined ? prev - pos : undefined;
  return (
    <span className="inline-flex items-center gap-1 font-mono text-sm font-semibold">
      {pos}
      {delta !== undefined && delta > 0 && (
        <TrendingUpIcon className="h-3 w-3 text-green-500" />
      )}
      {delta !== undefined && delta < 0 && (
        <TrendingDownIcon className="h-3 w-3 text-red-500" />
      )}
      {delta === 0 && <MinusIcon className="h-3 w-3 text-muted-foreground" />}
    </span>
  );
}

// ─── Keywords dialog ──────────────────────────────────────────────────────
function KeywordsDialog({
  open,
  onClose,
  project,
  password,
}: {
  open: boolean;
  onClose: () => void;
  project: ProjectRow | null;
  password: string;
}) {
  const keywords = useQuery(
    api.admin.serpAdmin.listProjectKeywords,
    open && project ? { password, projectId: project._id } : "skip"
  ) as Keyword[] | undefined;

  const spySerpSyncRankings = useAction(api.spyserp.actions.syncRankings);
  const [syncing, setSyncing] = useState(false);

  async function handleSync() {
    if (!project?.spySerpProjectId) return;
    setSyncing(true);
    try {
      const res = await spySerpSyncRankings({ projectId: project._id, spySerpProjectId: project.spySerpProjectId });
      toast.success(`Synced ${res.synced} keywords`);
    } catch (e) {
      if (e instanceof ConvexError) {
        toast.error((e.data as { message: string }).message);
      } else {
        toast.error("Sync failed");
      }
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-4 pr-8">
            <span>{project?.name} — Keywords</span>
            {project?.spySerpProjectId && (
              <Button size="sm" variant="secondary" onClick={handleSync} disabled={syncing} className="cursor-pointer shrink-0">
                <RefreshCwIcon className={`h-3.5 w-3.5 mr-1.5 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Syncing…" : "Sync SERP Rankings"}
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {!project?.spySerpProjectId && (
          <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-3 text-xs text-amber-700 dark:text-amber-300">
            No SpySERP project linked — set a project ID on the main panel to enable ranking sync.
          </div>
        )}

        <div className="flex-1 overflow-auto">
          {keywords === undefined ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : keywords.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No keywords tracked yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Keyword</TableHead>
                  <TableHead className="text-center">SERP Rank</TableHead>
                  <TableHead className="text-center">GSC Rank</TableHead>
                  <TableHead className="text-center">Volume</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keywords.map((kw) => (
                  <TableRow key={kw._id}>
                    <TableCell className="font-mono text-xs">{kw.keyword}</TableCell>
                    <TableCell className="text-center">
                      <PosBadge pos={kw.serpPosition} prev={kw.serpPreviousPosition} />
                    </TableCell>
                    <TableCell className="text-center">
                      {kw.gscPosition !== undefined ? (
                        <span className="font-mono text-sm">{Math.round(kw.gscPosition)}</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">
                      {kw.searchVolume?.toLocaleString() ?? "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="text-[10px] py-0">
                        {kw.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main admin panel ─────────────────────────────────────────────────────
export default function SerpAdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<Id<"projects"> | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingId, setSavingId] = useState<Id<"projects"> | null>(null);
  const [viewProject, setViewProject] = useState<ProjectRow | null>(null);

  const setProjectSerpId = useMutation(api.admin.serpAdmin.setProjectSerpId);

  const projects = useQuery(
    api.admin.serpAdmin.listAllProjects,
    authed ? { password } : "skip"
  ) as (ProjectRow[]) | undefined | "error";

  function handleAuth(pw: string) {
    setPassword(pw);
    setAuthed(true);
    setAuthError("");
  }

  // Detect wrong password via query error — projects will throw
  // We handle this by checking if project rows come back normally

  const rows = Array.isArray(projects) ? projects : [];

  const filtered = rows.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.websiteUrl.toLowerCase().includes(q) ||
      (p.userName ?? "").toLowerCase().includes(q) ||
      (p.userEmail ?? "").toLowerCase().includes(q)
    );
  });

  async function handleSave(projectId: Id<"projects">) {
    const val = editValue.trim();
    const numId = val === "" ? null : parseInt(val, 10);
    if (val !== "" && (isNaN(numId!) || numId! <= 0)) {
      toast.error("Enter a valid numeric SpySERP project ID, or leave blank to unlink");
      return;
    }
    setSavingId(projectId);
    try {
      await setProjectSerpId({ password, projectId, spySerpProjectId: numId });
      toast.success(numId ? `Project #${numId} linked` : "Project unlinked");
      setEditingId(null);
      setEditValue("");
    } catch (e) {
      if (e instanceof ConvexError) {
        const msg = (e.data as { message: string }).message;
        if (msg.includes("password") || msg.includes("FORBIDDEN")) {
          setAuthed(false);
          setAuthError("Invalid password");
        } else {
          toast.error(msg);
        }
      } else {
        toast.error("Save failed");
      }
    } finally {
      setSavingId(null);
    }
  }

  if (!authed) {
    return (
      <PasswordGate
        onAuth={(pw) => {
          handleAuth(pw);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <LockIcon className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold leading-none">SERP Admin Panel</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Manage rank tracking projects for all users</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="cursor-pointer text-muted-foreground"
          onClick={() => { setAuthed(false); setPassword(""); }}
        >
          Sign out
        </Button>
      </div>

      {/* Stats strip */}
      <div className="px-6 py-3 border-b bg-muted/20 flex items-center gap-6 text-sm">
        <span className="text-muted-foreground">Total projects: <strong className="text-foreground">{rows.length}</strong></span>
        <span className="text-muted-foreground">
          Linked to SERP:{" "}
          <strong className="text-green-600 dark:text-green-400">
            {rows.filter((p) => p.spySerpProjectId).length}
          </strong>
        </span>
        <span className="text-muted-foreground">
          Not linked:{" "}
          <strong className="text-amber-600 dark:text-amber-400">
            {rows.filter((p) => !p.spySerpProjectId).length}
          </strong>
        </span>
      </div>

      {/* Search */}
      <div className="px-6 py-3 border-b">
        <div className="relative max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by project, domain, or user…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto">
        {projects === undefined ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Country</TableHead>
                <TableHead className="text-center">SERP Status</TableHead>
                <TableHead>SpySERP Project ID</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-12 text-sm">
                    {rows.length === 0 ? "No projects found" : "No results match your search"}
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((project) => (
                <TableRow key={project._id} className="group">
                  {/* Project name */}
                  <TableCell className="font-medium text-sm max-w-[160px] truncate">
                    {project.name}
                  </TableCell>

                  {/* Domain */}
                  <TableCell className="text-xs text-muted-foreground font-mono max-w-[200px] truncate">
                    {project.websiteUrl}
                  </TableCell>

                  {/* User */}
                  <TableCell className="text-xs">
                    <div className="font-medium">{project.userName ?? "—"}</div>
                    <div className="text-muted-foreground">{project.userEmail ?? ""}</div>
                  </TableCell>

                  {/* Country */}
                  <TableCell className="text-xs text-muted-foreground">
                    {project.country ?? "—"}
                  </TableCell>

                  {/* SERP status */}
                  <TableCell className="text-center">
                    {project.spySerpProjectId ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-medium">
                        <CheckCircleIcon className="h-3.5 w-3.5" />
                        Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <XCircleIcon className="h-3.5 w-3.5" />
                        Not linked
                      </span>
                    )}
                  </TableCell>

                  {/* SpySERP project ID — inline edit */}
                  <TableCell>
                    {editingId === project._id ? (
                      <div className="flex items-center gap-1.5">
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSave(project._id);
                            if (e.key === "Escape") { setEditingId(null); setEditValue(""); }
                          }}
                          placeholder="e.g. 254056"
                          className="h-7 w-28 font-mono text-xs"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          className="h-7 px-2 cursor-pointer"
                          onClick={() => handleSave(project._id)}
                          disabled={savingId === project._id}
                        >
                          {savingId === project._id ? "…" : "Save"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 cursor-pointer"
                          onClick={() => { setEditingId(null); setEditValue(""); }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <button
                        className="flex items-center gap-1.5 text-xs font-mono cursor-pointer hover:text-primary transition-colors group/btn"
                        onClick={() => {
                          setEditingId(project._id);
                          setEditValue(project.spySerpProjectId?.toString() ?? "");
                        }}
                      >
                        {project.spySerpProjectId ? (
                          <>
                            <span className="font-semibold">#{project.spySerpProjectId}</span>
                            <span className="text-muted-foreground opacity-0 group-hover/btn:opacity-100 text-[10px]">edit</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground flex items-center gap-1">
                            <LinkIcon className="h-3 w-3" />
                            Set ID
                          </span>
                        )}
                      </button>
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 cursor-pointer"
                      onClick={() => setViewProject(project)}
                    >
                      <EyeIcon className="h-3.5 w-3.5 mr-1" />
                      View
                      <ChevronRightIcon className="h-3 w-3 ml-0.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Keywords / rankings dialog */}
      <KeywordsDialog
        open={!!viewProject}
        onClose={() => setViewProject(null)}
        project={viewProject}
        password={password}
      />
    </div>
  );
}
