import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboardIcon,
  FolderOpenIcon,
  GlobeIcon,
  ShieldCheckIcon,
  WrenchIcon,
  FileTextIcon,
  TargetIcon,
  TrendingUpIcon,
  PenToolIcon,
  PencilIcon,
  SearchIcon,
  CopyIcon,
  LinkIcon,
  NetworkIcon,
  MapPinIcon,
  MessageSquareIcon,
  SparklesIcon,
  CodeIcon,
  GaugeIcon,
  BarChart3Icon,
  MapIcon,
  ExternalLinkIcon,
  BellIcon,
  ChevronRightIcon,
  RadarIcon,
  ClipboardListIcon,
  TrendingDownIcon,
  ImageIcon,
  BrainCircuitIcon,
  FlaskConicalIcon,
  ClockIcon,
  BookOpenIcon,
  Trash2Icon,
  CableIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar.tsx";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible.tsx";
import ProjectSwitcher from "./project-switcher.tsx";
import UserNav from "./user-nav.tsx";
import { toast } from "sonner";
import type { LucideIcon } from "lucide-react";

type NavItem = {
  title: string;
  icon: LucideIcon;
  path: string;
  comingSoon?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const MAIN_NAV: NavItem[] = [
  { title: "Dashboard", icon: LayoutDashboardIcon, path: "/dashboard" },
  { title: "Projects", icon: FolderOpenIcon, path: "/projects" },
];

// Project-specific navigation groups (visible but require a project)
const PROJECT_NAV_GROUPS: NavGroup[] = [
  {
    label: "Audit & Technical",
    items: [
      { title: "Site Audit", icon: ShieldCheckIcon, path: "/audit" },
      { title: "URL SEO Panel", icon: GlobeIcon, path: "/url-panel" },
      { title: "Technical SEO", icon: WrenchIcon, path: "/technical-seo" },
      { title: "Pages", icon: FileTextIcon, path: "/pages" },
      { title: "Performance", icon: GaugeIcon, path: "/performance" },
      { title: "Sitemaps", icon: MapIcon, path: "/sitemaps" },
      { title: "Site Files", icon: FileTextIcon, path: "/site-files" },
      { title: "URL Inspection", icon: ExternalLinkIcon, path: "/url-inspection" },
      { title: "URL Removal", icon: Trash2Icon, path: "/url-removal" },
    ],
  },
  {
    label: "Keywords & Rankings",
    items: [
      { title: "Keywords", icon: TargetIcon, path: "/keywords" },
      { title: "Rankings", icon: TrendingUpIcon, path: "/rankings" },
      { title: "Cannibalization", icon: CopyIcon, path: "/cannibalization" },
      { title: "Keyword Research", icon: SearchIcon, path: "/keyword-research" },
    ],
  },
  {
    label: "Content",
    items: [
      { title: "Content Writer", icon: PencilIcon, path: "/content" },
      { title: "Topic Map", icon: NetworkIcon, path: "/topic-map" },
      { title: "Internal Links", icon: LinkIcon, path: "/internal-links" },
      { title: "Content Gap", icon: SearchIcon, path: "/content-gap" },
      { title: "Content Decay", icon: TrendingDownIcon, path: "/content-decay" },
    ],
  },
  {
    label: "Advanced SEO",
    items: [
      { title: "Schema Markup", icon: CodeIcon, path: "/schema-markup" },
      { title: "Entity SEO", icon: BrainCircuitIcon, path: "/entity-seo" },
      { title: "Image SEO", icon: ImageIcon, path: "/image-seo" },
      { title: "Hreflang / i18n", icon: GlobeIcon, path: "/hreflang" },
    ],
  },
  {
    label: "Search Visibility",
    items: [
      { title: "Local SEO", icon: MapPinIcon, path: "/local-seo" },
      { title: "AEO", icon: MessageSquareIcon, path: "/aeo" },
      { title: "GEO / AI Search", icon: SparklesIcon, path: "/geo" },
    ],
  },
  {
    label: "CMS",
    items: [
      { title: "CMS Connections", icon: CableIcon, path: "/cms/connections" },
      { title: "Content Manager", icon: FileTextIcon, path: "/cms/content" },
      { title: "Internal Linking", icon: LinkIcon, path: "/cms/internal-links" },
    ],
  },
  {
    label: "Integrations",
    items: [
      {
        title: "Search Console",
        icon: SearchIcon,
        path: "/search-console",
      },
      { title: "Analytics", icon: BarChart3Icon, path: "/analytics" },
    ],
  },
  {
    label: "Monitoring",
    items: [
      { title: "Reports", icon: ClipboardListIcon, path: "/reports" },
      { title: "Alerts", icon: BellIcon, path: "/alerts" },
      { title: "Experiments", icon: FlaskConicalIcon, path: "/experiments" },
      { title: "Change History", icon: ClockIcon, path: "/change-history" },
      { title: "Knowledge Base", icon: BookOpenIcon, path: "/knowledge-base" },
    ],
  },
];

const BOTTOM_NAV: NavItem[] = [];

function handleComingSoon(title: string) {
  toast(`${title} is coming soon!`, {
    description: "This feature is planned for a future update.",
  });
}

export default function AppSidebar() {
  const location = useLocation();

  return (
    <Sidebar className="overflow-hidden">
      <SidebarHeader>
        <div className="flex items-center gap-2.5 px-2 py-1.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <RadarIcon className="h-4 w-4" />
          </div>
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-sm font-semibold tracking-tight truncate">
              Maxentrix SEO Platform
            </span>
          </div>
        </div>
        <ProjectSwitcher />
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent className="overflow-y-auto overflow-x-hidden">
        {/* Main navigation */}
        <SidebarGroup>
          <SidebarMenu>
            {MAIN_NAV.map((item) => (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === item.path}
                  tooltip={item.title}
                >
                  <Link to={item.path}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Project-specific navigation groups */}
        {PROJECT_NAV_GROUPS.map((group) => (
          <Collapsible key={group.label} className="group/collapsible">
            <SidebarGroup className="py-0 pt-1">
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="flex w-full items-center">
                  {group.label}
                  <ChevronRightIcon className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        {item.comingSoon ? (
                          <SidebarMenuButton
                            tooltip={item.title}
                            className="text-muted-foreground"
                            onClick={() => handleComingSoon(item.title)}
                          >
                            <item.icon className="opacity-60" />
                            <span>{item.title}</span>
                          </SidebarMenuButton>
                        ) : (
                          <SidebarMenuButton
                            asChild
                            isActive={location.pathname.startsWith(item.path)}
                            tooltip={item.title}
                          >
                            <Link to={item.path}>
                              <item.icon />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        )}
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        ))}
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter>
        <UserNav />
      </SidebarFooter>
    </Sidebar>
  );
}
