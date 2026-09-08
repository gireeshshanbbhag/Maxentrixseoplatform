import { Link, useLocation } from "react-router-dom";
import { SearchIcon, SettingsIcon, GlobeIcon, ShieldCheckIcon } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Button } from "@/components/ui/button.tsx";
import GlobalSearch from "./global-search.tsx";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Authenticated } from "convex/react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";

const ROUTE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/projects": "Projects",
  "/audit": "Site Audit",
  "/settings": "Settings",
  "/google-updates": "Google Updates",
};

function HeaderIconLink({ to, icon: Icon, label, active }: { to: string; icon: typeof SettingsIcon; label: string; active: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 cursor-pointer ${active ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
          asChild
        >
          <Link to={to}>
            <Icon className="h-4 w-4" />
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export default function AppHeader() {
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const isAdmin = useQuery(api.users.isAdmin);

  const pageTitle =
    ROUTE_TITLES[location.pathname] ??
    (location.pathname.startsWith("/audit/") ? "Audit Details" : "Maxentrix SEO Platform");

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 !h-4" />
        <h1 className="text-sm font-medium">{pageTitle}</h1>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-2 text-muted-foreground cursor-pointer"
            onClick={() => setSearchOpen(true)}
          >
            <SearchIcon className="h-4 w-4" />
            <span className="hidden sm:inline-flex">Search</span>
            <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
              <span className="text-xs">{"⌘"}</span>K
            </kbd>
          </Button>
          <Separator orientation="vertical" className="mx-1 !h-4" />
          <HeaderIconLink to="/google-updates" icon={GlobeIcon} label="Google Updates" active={location.pathname === "/google-updates"} />
          <HeaderIconLink to="/settings" icon={SettingsIcon} label="Settings" active={location.pathname === "/settings"} />
          <Authenticated>
            {isAdmin && (
              <HeaderIconLink to="/admin" icon={ShieldCheckIcon} label="Admin" active={location.pathname.startsWith("/admin")} />
            )}
          </Authenticated>
        </div>
      </header>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
