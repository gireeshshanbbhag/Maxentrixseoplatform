import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import {
  ChevronsUpDownIcon,
  PlusIcon,
  FolderOpenIcon,
  GlobeIcon,
  CheckIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { SidebarMenuButton } from "@/components/ui/sidebar.tsx";
import { useCurrentProject } from "@/hooks/use-current-project.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";

export default function ProjectSwitcher() {
  const navigate = useNavigate();
  const projects = useQuery(api.projects.list, {});
  const { activeProjectId, setActiveProjectId } = useCurrentProject();

  const activeProject = projects?.find((p) => p._id === activeProjectId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          size="lg"
          className="w-full border border-dashed border-border/60 data-[state=open]:bg-sidebar-accent"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
            {activeProject ? (
              <GlobeIcon className="h-4 w-4 text-primary" />
            ) : (
              <FolderOpenIcon className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div className="flex flex-col gap-0.5 leading-none min-w-0">
            <span className="text-xs text-muted-foreground">Project</span>
            <span className="font-medium text-sm truncate">
              {activeProject ? activeProject.name : "No project selected"}
            </span>
          </div>
          <ChevronsUpDownIcon className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="start" side="bottom">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Projects
        </DropdownMenuLabel>
        {(!projects || projects.length === 0) && (
          <div className="px-2 py-4 text-center">
            <p className="text-sm text-muted-foreground">No projects yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Create a project to start auditing
            </p>
          </div>
        )}
        {projects && projects.length > 0 && (
          <ScrollArea className="max-h-60">
            {projects.map((project) => (
              <DropdownMenuItem
                key={project._id}
                onClick={() => setActiveProjectId(project._id)}
                className="flex items-center gap-2"
              >
                <GlobeIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate flex-1">{project.name}</span>
                {project._id === activeProjectId && (
                  <CheckIcon className="h-4 w-4 text-primary shrink-0" />
                )}
              </DropdownMenuItem>
            ))}
          </ScrollArea>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/projects")}>
          <PlusIcon className="mr-2 h-4 w-4" />
          <span>Create project</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
