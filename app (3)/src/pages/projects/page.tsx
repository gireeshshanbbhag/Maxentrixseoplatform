import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  FolderOpenIcon, PlusIcon, GlobeIcon, MoreHorizontalIcon,
  TrashIcon, PencilIcon, ArchiveIcon, ExternalLinkIcon, SettingsIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  Empty, EmptyContent, EmptyDescription,
  EmptyHeader, EmptyMedia, EmptyTitle,
} from "@/components/ui/empty.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { useCurrentProject } from "@/hooks/use-current-project.tsx";
import { getWebsiteTypeLabel } from "@/lib/constants.ts";
import CreateProjectWizard from "./_components/create-project-wizard.tsx";
import EditProjectDialog from "./_components/edit-project-dialog.tsx";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";

export default function Projects() {
  const projects = useQuery(api.projects.list, {});
  const removeProject = useMutation(api.projects.remove);
  const updateProject = useMutation(api.projects.update);
  const { activeProjectId, setActiveProjectId } = useCurrentProject();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Doc<"projects"> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: Id<"projects">; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Support ?delete=id from project settings page
  const deleteFromParam = searchParams.get("delete");
  if (deleteFromParam && projects && !deleteTarget) {
    const proj = projects.find((p) => p._id === deleteFromParam);
    if (proj) {
      setDeleteTarget({ id: proj._id, name: proj.name });
      setSearchParams({});
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await removeProject({ projectId: deleteTarget.id });
      if (activeProjectId === deleteTarget.id) setActiveProjectId(null);
      toast.success("Project deleted", { description: `${deleteTarget.name} has been removed.` });
      setDeleteTarget(null);
    } catch (error) {
      if (error instanceof ConvexError) {
        const { message } = error.data as { code: string; message: string };
        toast.error(message);
      } else {
        toast.error("Failed to delete project");
      }
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleArchiveToggle(project: Doc<"projects">, e: React.MouseEvent) {
    e.stopPropagation();
    const newStatus = project.status === "archived" ? "active" : "archived";
    try {
      await updateProject({ projectId: project._id, status: newStatus });
      toast.success(newStatus === "archived" ? "Project archived" : "Project restored");
    } catch {
      toast.error("Failed to update project");
    }
  }

  // Loading
  if (projects === undefined) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Create mode
  if (showCreate) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Create project
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Set up a new website for SEO auditing and optimization
            </p>
          </div>
          <Button variant="ghost" onClick={() => setShowCreate(false)}>
            Cancel
          </Button>
        </div>
        <CreateProjectWizard onSuccess={() => setShowCreate(false)} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Projects</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your websites and SEO projects
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          New project
        </Button>
      </div>

      {/* Empty state */}
      {projects.length === 0 && (
        <div className="flex items-center justify-center min-h-[400px]">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FolderOpenIcon />
              </EmptyMedia>
              <EmptyTitle>No projects yet</EmptyTitle>
              <EmptyDescription>
                Create your first SEO project to start crawling, auditing, and
                optimizing your website.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button size="sm" onClick={() => setShowCreate(true)}>
                <PlusIcon className="h-4 w-4 mr-1" />
                Create project
              </Button>
            </EmptyContent>
          </Empty>
        </div>
      )}

      {/* Project grid */}
      {projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => {
            const isActive = activeProjectId === project._id;
            return (
              <Card
                key={project._id}
                className={`transition-colors hover:bg-accent/30 cursor-pointer ${isActive ? "ring-2 ring-primary" : ""}`}
                onClick={() => setActiveProjectId(project._id)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <GlobeIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm truncate">
                          {project.name}
                        </h3>
                        <p className="text-xs text-muted-foreground truncate">
                          {project.websiteUrl}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-xs" onClick={(e) => e.stopPropagation()}>
                          <MoreHorizontalIcon className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => { e.stopPropagation(); setActiveProjectId(project._id); }}
                        >
                          <ExternalLinkIcon className="mr-2 h-4 w-4" />Set as active
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => { e.stopPropagation(); setEditTarget(project); }}
                        >
                          <PencilIcon className="mr-2 h-4 w-4" />Edit project
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => { e.stopPropagation(); navigate(`/projects/${project._id}/settings`); }}
                        >
                          <SettingsIcon className="mr-2 h-4 w-4" />Settings
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => handleArchiveToggle(project, e)}>
                          <ArchiveIcon className="mr-2 h-4 w-4" />
                          {project.status === "archived" ? "Restore" : "Archive"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget({ id: project._id, name: project.name });
                          }}
                        >
                          <TrashIcon className="mr-2 h-4 w-4" />Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-4 flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      {getWebsiteTypeLabel(project.websiteType)}
                    </Badge>
                    {project.country && (
                      <Badge variant="secondary" className="text-xs">
                        {project.city ? `${project.city}, ${project.country}` : project.country}
                      </Badge>
                    )}
                    {project.status === "archived" && (
                      <Badge variant="secondary" className="text-xs text-muted-foreground">Archived</Badge>
                    )}
                    {isActive && (
                      <Badge className="text-xs bg-primary/15 text-primary border-0">Active</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit dialog */}
      {editTarget && (
        <EditProjectDialog
          project={editTarget}
          open={editTarget !== null}
          onOpenChange={(open) => { if (!open) setEditTarget(null); }}
        />
      )}

      {/* Delete confirmation */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.name}
              </span>
              ? This action cannot be undone. All project data, keywords, and
              audit history will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
