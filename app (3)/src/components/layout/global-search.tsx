import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboardIcon,
  FolderOpenIcon,
  GlobeIcon,
  SettingsIcon,
  ShieldCheckIcon,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command.tsx";

type GlobalSearchProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const NAVIGATION_ITEMS = [
  { title: "Dashboard", icon: LayoutDashboardIcon, path: "/dashboard" },
  { title: "Projects", icon: FolderOpenIcon, path: "/projects" },
  { title: "Site Audit", icon: ShieldCheckIcon, path: "/audit" },
  { title: "Google Updates", icon: GlobeIcon, path: "/google-updates" },
  { title: "Settings", icon: SettingsIcon, path: "/settings" },
];

export default function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const navigate = useNavigate();

  // Register keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  function handleSelect(path: string) {
    onOpenChange(false);
    navigate(path);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search"
      description="Search across your SEO workspace"
    >
      <CommandInput placeholder="Search pages, projects, keywords..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          {NAVIGATION_ITEMS.map((item) => (
            <CommandItem
              key={item.path}
              onSelect={() => handleSelect(item.path)}
            >
              <item.icon className="mr-2 h-4 w-4" />
              <span>{item.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Quick Actions">
          <CommandItem
            onSelect={() => {
              onOpenChange(false);
              navigate("/projects");
            }}
          >
            <FolderOpenIcon className="mr-2 h-4 w-4" />
            <span>Create new project</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
