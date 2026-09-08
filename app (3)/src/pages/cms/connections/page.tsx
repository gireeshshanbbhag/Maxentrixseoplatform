import { useState, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useCurrentProject } from "@/hooks/use-current-project.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog.tsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.tsx";
import {
  CheckCircleIcon, XCircleIcon, RefreshCwIcon, PlusIcon,
  ExternalLinkIcon, AlertTriangleIcon, ServerIcon, UnplugIcon,
  EditIcon, KeyRoundIcon, WebhookIcon, UserCircleIcon, CopyIcon,
  ZapIcon, InfoIcon, SearchIcon, EyeIcon, EyeOffIcon,
} from "lucide-react";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import { format } from "date-fns";
import { useSearchParams } from "react-router-dom";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import { CMS_PLATFORMS, type CmsPlatform } from "@/pages/projects/_components/create-project-wizard.tsx";

type CmsConnection = Doc<"cmsConnections">;

// Platforms that have full API connection support in this app
const CONNECTABLE_IDS = new Set([
  "wordpress", "webflow", "wix", "shopify", "ghost", "squarespace",
  "drupal", "joomla", "magento", "bigcommerce", "woocommerce", "prestashop",
  "opencart", "contentful", "sanity", "strapi", "directus", "storyblok",
  "payload", "hercules",
]);

const CONVEX_SITE_URL = "https://grandiose-quail-879.convex.site";
function buildWebhookUrl(projectId: string, secret: string) {
  return `${CONVEX_SITE_URL}/wp-webhook?projectId=${projectId}&secret=${secret}`;
}

const CATEGORY_LABELS: Record<string, string> = {
  cms: "Content Management Systems",
  ecommerce: "E-Commerce Platforms",
  headless: "Headless CMS",
  static: "Static & Custom Frameworks",
  other: "Other",
};

// Connection instructions per platform (generic API token pattern)
const PLATFORM_SETUP: Record<string, { credentialLabel: string; credentialPlaceholder: string; setupSteps: string[]; docsUrl: string; requiresSiteUrl: boolean; hasExtraField?: { label: string; placeholder: string } }> = {
  shopify: {
    credentialLabel: "Admin API Access Token",
    credentialPlaceholder: "shpat_xxxxxxxxxxxxxxxxxxxx",
    setupSteps: [
      "In Shopify Admin: go to Settings → Apps and sales channels",
      "Click Develop apps → Create an app",
      "Under API credentials, click Install app",
      "Copy the Admin API access token (shown once)",
    ],
    docsUrl: "https://shopify.dev/docs/api/admin-rest",
    requiresSiteUrl: true,
  },
  ghost: {
    credentialLabel: "Admin API Key",
    credentialPlaceholder: "xxxxxxxxxxxxxxxxxxxxxxxx:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    setupSteps: [
      "In Ghost Admin: go to Settings → Integrations",
      "Click Add custom integration",
      "Copy the Admin API Key",
    ],
    docsUrl: "https://ghost.org/docs/admin-api/",
    requiresSiteUrl: true,
  },
  squarespace: {
    credentialLabel: "API Key",
    credentialPlaceholder: "Your Squarespace API key",
    setupSteps: [
      "In Squarespace: go to Settings → Developer Tools → Developer API Keys",
      "Click Generate Key and select the required permissions",
      "Copy the generated API key",
    ],
    docsUrl: "https://developers.squarespace.com/",
    requiresSiteUrl: true,
  },
  drupal: {
    credentialLabel: "Basic Auth (user:pass base64)",
    credentialPlaceholder: "username:password",
    setupSteps: [
      "Install the REST UI and JSON:API modules on your Drupal site",
      "Enable Basic Auth under Configuration → Web services → REST",
      "Enter your admin username and password below",
    ],
    docsUrl: "https://www.drupal.org/docs/core-modules-and-themes/core-modules/jsonapi-module",
    requiresSiteUrl: true,
  },
  joomla: {
    credentialLabel: "API Token",
    credentialPlaceholder: "Your Joomla API token",
    setupSteps: [
      "In Joomla Admin: go to Users → Manage → your user",
      "Under the Joomla API Token tab, generate a new token",
      "Copy the token",
    ],
    docsUrl: "https://docs.joomla.org/J4.x:Joomla_Core_APIs",
    requiresSiteUrl: true,
  },
  magento: {
    credentialLabel: "Integration Access Token",
    credentialPlaceholder: "Your Magento access token",
    setupSteps: [
      "In Magento Admin: go to System → Extensions → Integrations",
      "Click Add New Integration, set required permissions",
      "Activate it and copy the Access Token",
    ],
    docsUrl: "https://devdocs.magento.com/guides/v2.4/get-started/authentication/gs-authentication-token.html",
    requiresSiteUrl: true,
  },
  bigcommerce: {
    credentialLabel: "API Access Token",
    credentialPlaceholder: "Your BigCommerce access token",
    setupSteps: [
      "In BigCommerce Control Panel: go to Advanced Settings → API Accounts",
      "Click Create API Account → Create V2/V3 API Token",
      "Copy the Access Token and Store API Path",
    ],
    docsUrl: "https://developer.bigcommerce.com/docs/start/authentication",
    requiresSiteUrl: true,
  },
  woocommerce: {
    credentialLabel: "Consumer Key:Consumer Secret",
    credentialPlaceholder: "ck_xxxx:cs_xxxx",
    setupSteps: [
      "In WordPress Admin: go to WooCommerce → Settings → Advanced → REST API",
      "Click Add Key, set permissions to Read/Write",
      "Copy the Consumer Key and Consumer Secret",
      "Enter them as: consumerkey:consumersecret",
    ],
    docsUrl: "https://woocommerce.github.io/woocommerce-rest-api-docs/",
    requiresSiteUrl: true,
  },
  prestashop: {
    credentialLabel: "API Key",
    credentialPlaceholder: "Your PrestaShop API key",
    setupSteps: [
      "In PrestaShop Admin: go to Advanced Parameters → Webservice",
      "Enable the webservice and click Add new webservice key",
      "Set permissions and copy the key",
    ],
    docsUrl: "https://devdocs.prestashop-project.org/8/webservice/",
    requiresSiteUrl: true,
  },
  opencart: {
    credentialLabel: "API Key",
    credentialPlaceholder: "Your OpenCart REST API key",
    setupSteps: [
      "Install the OpenCart REST API extension",
      "In Admin: go to System → Users → API",
      "Add a new API key with the required permissions",
    ],
    docsUrl: "https://docs.opencart.com/en-gb/system/users/api/",
    requiresSiteUrl: true,
  },
  contentful: {
    credentialLabel: "Content Management API Token",
    credentialPlaceholder: "Your Contentful CMA token",
    setupSteps: [
      "In Contentful: go to Settings → API Keys → Content management tokens",
      "Click Generate personal token",
      "Copy the token",
    ],
    docsUrl: "https://www.contentful.com/developers/docs/references/content-management-api/",
    requiresSiteUrl: false,
    hasExtraField: { label: "Space ID", placeholder: "your_space_id" },
  },
  sanity: {
    credentialLabel: "API Token",
    credentialPlaceholder: "sk...",
    setupSteps: [
      "In Sanity Studio: go to manage.sanity.io → your project → API → Tokens",
      "Click Add API token, set to Editor or higher",
      "Copy the token",
    ],
    docsUrl: "https://www.sanity.io/docs/http-auth",
    requiresSiteUrl: false,
    hasExtraField: { label: "Project ID", placeholder: "your_project_id" },
  },
  strapi: {
    credentialLabel: "API Token",
    credentialPlaceholder: "Your Strapi API token",
    setupSteps: [
      "In Strapi Admin: go to Settings → API Tokens",
      "Click Create new API Token, set type to Full access",
      "Copy the token",
    ],
    docsUrl: "https://docs.strapi.io/dev-docs/api/rest",
    requiresSiteUrl: true,
  },
  directus: {
    credentialLabel: "Static Access Token",
    credentialPlaceholder: "Your Directus static token",
    setupSteps: [
      "In Directus: go to User settings → Token",
      "Generate a static access token",
      "Copy it",
    ],
    docsUrl: "https://docs.directus.io/reference/authentication.html",
    requiresSiteUrl: true,
  },
  storyblok: {
    credentialLabel: "Personal Access Token",
    credentialPlaceholder: "Your Storyblok access token",
    setupSteps: [
      "In Storyblok: go to My Account → Personal access tokens",
      "Generate a new token",
      "Copy it",
    ],
    docsUrl: "https://www.storyblok.com/docs/api/management/getting-started/authentication",
    requiresSiteUrl: false,
    hasExtraField: { label: "Space ID", placeholder: "123456" },
  },
  payload: {
    credentialLabel: "API Key",
    credentialPlaceholder: "Your Payload CMS API key",
    setupSteps: [
      "In your Payload config, enable the apiKey authentication strategy",
      "Create a user with API key access in your admin panel",
      "Copy the API key from the user's profile",
    ],
    docsUrl: "https://payloadcms.com/docs/authentication/overview",
    requiresSiteUrl: true,
  },
  hercules: {
    credentialLabel: "Deployment URL",
    credentialPlaceholder: "https://myapp.onhercules.app",
    setupSteps: [
      "Enter your published Hercules app URL",
      "Internal linking suggestions will use your app's page data",
    ],
    docsUrl: "https://hercules.app",
    requiresSiteUrl: true,
  },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CmsConnectionsPage() {
  return (
    <>
      <AuthLoading><div className="p-8"><Skeleton className="h-64 w-full" /></div></AuthLoading>
      <Unauthenticated><div className="flex justify-center p-8"><SignInButton /></div></Unauthenticated>
      <Authenticated><CmsConnectionsContent /></Authenticated>
    </>
  );
}

function CmsConnectionsContent() {
  const { activeProjectId } = useCurrentProject();
  const [searchParams] = useSearchParams();
  const connections = useQuery(api.cms.queries.listConnections, activeProjectId ? { projectId: activeProjectId } : "skip");
  const projects = useQuery(api.projects.list, {});
  const project = projects?.find((p) => p._id === activeProjectId);
  const projectWebsiteUrl = project?.websiteUrl ?? "";

  const [searchQuery, setSearchQuery] = useState("");
  const [wpDialogOpen, setWpDialogOpen] = useState(false);
  const [genericDialog, setGenericDialog] = useState<CmsPlatform | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Auto-open dialog from ?setup=<platform> query param (set after project creation)
  useEffect(() => {
    const setup = searchParams.get("setup");
    if (!setup || connections === undefined) return;
    const platform = CMS_PLATFORMS.find((p) => p.id === setup);
    if (!platform?.connectable) return;
    if (setup === "wordpress") {
      setWpDialogOpen(true);
    } else {
      setGenericDialog(platform);
    }
  }, [searchParams, connections]);

  if (!activeProjectId) {
    return (
      <div className="p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><ServerIcon /></EmptyMedia>
            <EmptyTitle>No project selected</EmptyTitle>
            <EmptyDescription>Select a project to manage CMS connections</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const connectionsByPlatform = new Map(connections?.map((c) => [c.platform, c]) ?? []);
  const wpConn = connectionsByPlatform.get("wordpress") ?? null;

  const categories = ["all", ...Array.from(new Set(CMS_PLATFORMS.map((p) => p.category)))];

  const visiblePlatforms = CMS_PLATFORMS.filter((p) => p.id !== "wordpress").filter((p) => {
    const matchCat = filterCategory === "all" || p.category === filterCategory;
    const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <ServerIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">CMS Connections</h1>
            <p className="text-sm text-muted-foreground">Connect your CMS or e-commerce platform for content management and AI internal linking</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-4xl">
        {connections === undefined && (
          <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
        )}

        {connections !== undefined && (
          <>
            {/* WordPress — always pinned at top with special auth dialog */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Most Popular</p>
              <WordPressCard connection={wpConn} onConnect={() => setWpDialogOpen(true)} onEdit={() => setWpDialogOpen(true)} projectId={activeProjectId} />
            </div>

            {/* Search + category filter */}
            <div className="flex gap-3 flex-wrap items-center">
              <div className="relative flex-1 min-w-48">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search platforms…" className="pl-9" />
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`text-xs px-3 py-1.5 rounded-full border cursor-pointer capitalize transition-colors ${filterCategory === cat ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}
                  >
                    {cat === "all" ? "All" : cat === "cms" ? "CMS" : cat === "ecommerce" ? "E-Commerce" : cat === "headless" ? "Headless" : cat === "static" ? "Static/Custom" : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Grouped platform grid */}
            {(filterCategory === "all" ? (["ecommerce", "cms", "headless", "static", "other"] as const) : [filterCategory as string]).map((cat) => {
              const platforms = visiblePlatforms.filter((p) => p.category === cat);
              if (platforms.length === 0) return null;
              return (
                <div key={cat}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{CATEGORY_LABELS[cat] ?? cat}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {platforms.map((platform) => {
                      const conn = connectionsByPlatform.get(platform.id) ?? null;
                      return (
                        <GenericPlatformCard
                          key={platform.id}
                          platform={platform}
                          connection={conn}
                          onConnect={() => setGenericDialog(platform)}
                          onEdit={() => setGenericDialog(platform)}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {visiblePlatforms.length === 0 && searchQuery && (
              <div className="text-center py-10 text-muted-foreground text-sm">
                No platforms matching "{searchQuery}"
              </div>
            )}

            {/* Info box */}
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">How it works</p>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircleIcon className="h-3.5 w-3.5 text-green-600 shrink-0 mt-0.5" />Credentials are stored securely and only used to communicate with your platform's API</li>
                <li className="flex items-start gap-2"><CheckCircleIcon className="h-3.5 w-3.5 text-green-600 shrink-0 mt-0.5" />Connected platforms unlock: content browsing, sitemap management, SEO issue flags, and AI internal linking</li>
                <li className="flex items-start gap-2"><CheckCircleIcon className="h-3.5 w-3.5 text-green-600 shrink-0 mt-0.5" />WordPress supports 3 auth methods: App Password, Admin Login, or Webhook (no password needed)</li>
              </ul>
            </div>
          </>
        )}
      </div>

      {wpDialogOpen && activeProjectId && (
        <WordPressDialog open={wpDialogOpen} onOpenChange={setWpDialogOpen} projectId={activeProjectId} projectWebsiteUrl={projectWebsiteUrl} existingConnection={wpConn} onSuccess={() => setWpDialogOpen(false)} />
      )}
      {genericDialog && activeProjectId && (
        <GenericConnectDialog
          open={!!genericDialog}
          onOpenChange={() => setGenericDialog(null)}
          platform={genericDialog}
          projectId={activeProjectId}
          projectWebsiteUrl={projectWebsiteUrl}
          existingConnection={connectionsByPlatform.get(genericDialog.id) ?? null}
          onSuccess={() => setGenericDialog(null)}
        />
      )}
    </div>
  );
}

// ─── WordPress Card ──────────────────────────────────────────────────────────

function WordPressCard({ connection, onConnect, onEdit, projectId }: {
  connection: CmsConnection | null;
  onConnect: () => void;
  onEdit: () => void;
  projectId: Id<"projects">;
}) {
  const deleteConnection = useMutation(api.cms.mutations.deleteConnection);
  const [deleting, setDeleting] = useState(false);
  const isConnected = !!connection && connection.status !== "disconnected";
  const hasError = connection?.status === "error";
  const authMethod = connection?.authMethod ?? "app_password";
  const AUTH_LABEL: Record<string, string> = { app_password: "App Password", admin_login: "Admin Login", webhook: "Webhook" };

  async function handleDelete() {
    if (!connection) return;
    setDeleting(true);
    try { await deleteConnection({ id: connection._id }); toast.success("WordPress disconnected"); }
    catch { toast.error("Failed to disconnect"); }
    finally { setDeleting(false); }
  }

  return (
    <div className={`rounded-xl border-2 p-5 space-y-3 transition-all ${isConnected ? "border-blue-300 bg-blue-50 dark:bg-blue-950/20" : "border-border bg-card hover:border-primary/30"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔵</span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold">WordPress</h3>
              {isConnected && !hasError && <Badge className="text-[10px] bg-green-500/10 text-green-700 dark:text-green-400 border-0 h-5"><CheckCircleIcon className="h-3 w-3 mr-1" />Connected</Badge>}
              {hasError && <Badge className="text-[10px] bg-red-500/10 text-red-700 dark:text-red-400 border-0 h-5"><XCircleIcon className="h-3 w-3 mr-1" />Error</Badge>}
              {isConnected && <Badge className="text-[10px] bg-background border h-5">{AUTH_LABEL[authMethod] ?? authMethod}</Badge>}
              {authMethod === "webhook" && connection?.webhookLastReceivedAt && (
                <Badge className="text-[10px] bg-green-500/10 text-green-700 dark:text-green-400 border-0 h-5"><ZapIcon className="h-3 w-3 mr-1" />{connection.webhookTotalEvents ?? 0} events</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Connect via Application Password — #1 most popular CMS</p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {isConnected ? (
            <>
              <Button size="sm" variant="secondary" onClick={onEdit} className="h-8"><EditIcon className="h-3.5 w-3.5 mr-1.5" />Edit</Button>
              <Button size="sm" variant="ghost" onClick={handleDelete} disabled={deleting} className="h-8 text-destructive hover:text-destructive">
                <UnplugIcon className="h-3.5 w-3.5 mr-1.5" />{deleting ? "…" : "Disconnect"}
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={onConnect} className="h-8"><PlusIcon className="h-3.5 w-3.5 mr-1.5" />Connect</Button>
          )}
        </div>
      </div>
      {connection && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 border-t border-border/50 flex-wrap">
          <span className="flex items-center gap-1"><ServerIcon className="h-3 w-3" />{connection.siteUrl}</span>
          {connection.label && <span>{connection.label}</span>}
          {connection.lastTestedAt && <span>Last tested {format(new Date(connection.lastTestedAt), "MMM d")}</span>}
        </div>
      )}
      {hasError && connection?.lastErrorMessage && (
        <div className="flex items-start gap-2 text-xs text-red-700 dark:text-red-400 rounded-lg bg-red-50 dark:bg-red-950/20 p-2.5">
          <AlertTriangleIcon className="h-3.5 w-3.5 shrink-0 mt-0.5" />{connection.lastErrorMessage}
        </div>
      )}
    </div>
  );
}

// ─── Generic Platform Card ────────────────────────────────────────────────────

function GenericPlatformCard({ platform, connection, onConnect, onEdit }: {
  platform: CmsPlatform;
  connection: CmsConnection | null;
  onConnect: () => void;
  onEdit: () => void;
}) {
  const deleteConnection = useMutation(api.cms.mutations.deleteConnection);
  const [deleting, setDeleting] = useState(false);
  const isConnected = !!connection && connection.status !== "disconnected";
  const hasError = connection?.status === "error";
  const isConnectable = CONNECTABLE_IDS.has(platform.id);

  async function handleDelete() {
    if (!connection) return;
    setDeleting(true);
    try { await deleteConnection({ id: connection._id }); toast.success(`${platform.name} disconnected`); }
    catch { toast.error("Failed to disconnect"); }
    finally { setDeleting(false); }
  }

  return (
    <div className={`rounded-xl border-2 p-4 space-y-2 transition-all ${isConnected ? platform.color + " border-primary/30" : "border-border bg-card hover:border-primary/20"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="text-xl shrink-0">{platform.icon}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-semibold text-sm">{platform.name}</h3>
              {isConnected && !hasError && <Badge className="text-[10px] bg-green-500/10 text-green-700 dark:text-green-400 border-0 h-4.5"><CheckCircleIcon className="h-2.5 w-2.5 mr-0.5" />Connected</Badge>}
              {hasError && <Badge className="text-[10px] bg-red-500/10 text-red-700 dark:text-red-400 border-0 h-4.5"><XCircleIcon className="h-2.5 w-2.5 mr-0.5" />Error</Badge>}
              {!isConnected && isConnectable && <Badge className="text-[10px] bg-primary/5 text-primary border-0 h-4.5">API ready</Badge>}
              {!isConnectable && <Badge className="text-[10px] bg-muted text-muted-foreground border-0 h-4.5">Coming soon</Badge>}
            </div>
            <p className="text-xs text-muted-foreground truncate">{platform.description}</p>
          </div>
        </div>
        <div className="shrink-0">
          {isConnected ? (
            <div className="flex gap-1.5">
              <Button size="sm" variant="secondary" onClick={onEdit} className="h-7 text-xs px-2"><EditIcon className="h-3 w-3" /></Button>
              <Button size="sm" variant="ghost" onClick={handleDelete} disabled={deleting} className="h-7 text-xs px-2 text-destructive hover:text-destructive">
                <UnplugIcon className="h-3 w-3" />
              </Button>
            </div>
          ) : isConnectable ? (
            <Button size="sm" onClick={onConnect} className="h-7 text-xs"><PlusIcon className="h-3 w-3 mr-1" />Connect</Button>
          ) : (
            <Button size="sm" variant="secondary" disabled className="h-7 text-xs opacity-50">Soon</Button>
          )}
        </div>
      </div>
      {connection && (
        <div className="text-xs text-muted-foreground flex items-center gap-2 pt-1 border-t border-border/30">
          <ServerIcon className="h-3 w-3 shrink-0" />
          <span className="truncate">{connection.siteUrl}</span>
          {connection.lastTestedAt && <span className="shrink-0">· {format(new Date(connection.lastTestedAt), "MMM d")}</span>}
        </div>
      )}
    </div>
  );
}

// ─── WordPress Dialog (App Password only) ────────────────────────────────────

function WordPressDialog({ open, onOpenChange, projectId, projectWebsiteUrl, existingConnection, onSuccess }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: Id<"projects">;
  projectWebsiteUrl: string;
  existingConnection: CmsConnection | null;
  onSuccess: () => void;
}) {
  // siteUrl is locked to the project's websiteUrl — not editable
  const siteUrl = existingConnection?.siteUrl ?? projectWebsiteUrl;
  const [label, setLabel] = useState(existingConnection?.label ?? "");
  const [appUser, setAppUser] = useState("");
  const [appPass, setAppPass] = useState("");
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAppPass, setShowAppPass] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  const saveConnection = useMutation(api.cms.mutations.saveConnection);
  const testAppPassword = useAction(api.cms.actions.testWordPressConnection);

  async function handleTest() {
    if (!siteUrl.trim()) { toast.error("No site URL set on this project"); return; }
    if (!appUser || !appPass) { toast.error("Enter username and Application Password"); return; }
    setTesting(true);
    setTestError(null);
    try {
      const creds = btoa(`${appUser.trim()}:${appPass.replace(/\s/g, "")}`);
      const r = await testAppPassword({ siteUrl: siteUrl.replace(/\/$/, ""), credentials: creds });
      toast.success(`Connected! "${r.siteName}" — logged in as ${r.user}`);
    } catch (e) {
      const msg = e instanceof ConvexError ? (e.data as { message: string }).message : "Connection test failed";
      setTestError(msg);
    } finally { setTesting(false); }
  }

  async function handleSave() {
    if (!siteUrl.trim()) { toast.error("No site URL set on this project"); return; }
    setSaving(true);
    try {
      const creds = (appUser && appPass)
        ? btoa(`${appUser.trim()}:${appPass.replace(/\s/g, "")}`)
        : (existingConnection?.credentials ?? siteUrl.replace(/\/$/, ""));
      await saveConnection({ projectId, platform: "wordpress", label: label || undefined, siteUrl: siteUrl.replace(/\/$/, ""), credentials: creds, authMethod: "app_password" });
      toast.success("WordPress connected successfully");
      onSuccess();
    } catch (e) {
      toast.error(e instanceof ConvexError ? (e.data as { message: string }).message : "Failed to save");
    } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">🔵 Connect WordPress</DialogTitle>
          <DialogDescription>Authenticate with your WordPress site using an Application Password</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">WordPress Site URL</Label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/50 text-sm">
              <ServerIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate flex-1 text-muted-foreground">{siteUrl || "No URL set on project"}</span>
              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">Project URL</span>
            </div>
            <p className="text-[11px] text-muted-foreground">This URL is set by your project. To use a different domain, create a new project.</p>
          </div>

          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-3 text-xs space-y-1">
            <p className="font-semibold flex items-center gap-1.5 text-blue-800 dark:text-blue-300"><InfoIcon className="h-3.5 w-3.5" />How to get an Application Password</p>
            <ol className="list-decimal ml-4 space-y-0.5 text-blue-700 dark:text-blue-400">
              <li>WP Admin → <strong>Users → Your Profile</strong></li>
              <li>Scroll to <strong>Application Passwords</strong> → Add New</li>
              <li>Name it "Maxentrix" and copy the generated password</li>
            </ol>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Username</Label>
            <Input value={appUser} onChange={(e) => setAppUser(e.target.value)} placeholder="your_wp_username" autoComplete="off" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Application Password</Label>
            <div className="relative">
              <Input type={showAppPass ? "text" : "password"} value={appPass} onChange={(e) => setAppPass(e.target.value)} placeholder={existingConnection?.authMethod === "app_password" ? "Leave blank to keep existing" : "xxxx xxxx xxxx xxxx xxxx xxxx"} className="pr-9" />
              <button type="button" onClick={() => setShowAppPass(!showAppPass)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
                {showAppPass ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Label (optional)</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. My WordPress Blog" />
          </div>

          {testError && (
            testError === "AUTH_HEADER_STRIPPED" ? (
              <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-3 space-y-2">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <AlertTriangleIcon className="h-3.5 w-3.5 shrink-0" />Your server is blocking the connection
                </p>
                <p className="text-[11px] text-amber-700 dark:text-amber-400">
                  Your host strips the <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">Authorization</code> header before it reaches WordPress — common on shared hosting.
                </p>
                <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">Fix — add to your <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">.htaccess</code>:</p>
                <pre className="text-[10px] bg-amber-100 dark:bg-amber-900/30 rounded px-2 py-1.5 font-mono overflow-x-auto select-all">{`RewriteEngine On\nRewriteCond %{HTTP:Authorization} ^(.*)\nRewriteRule .* - [e=HTTP_AUTHORIZATION:%1]`}</pre>
              </div>
            ) : (
              <div className="flex items-start gap-2 text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/20 rounded-lg px-3 py-2.5 border border-red-200 dark:border-red-800">
                <XCircleIcon className="h-3.5 w-3.5 shrink-0 mt-0.5" /><span>{testError}</span>
              </div>
            )
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="secondary" onClick={handleTest} disabled={testing || saving}>
            {testing ? <><RefreshCwIcon className="h-3.5 w-3.5 mr-1.5 animate-spin" />Testing…</> : "Test Connection"}
          </Button>
          <Button onClick={handleSave} disabled={saving || testing}>
            {saving ? "Saving…" : existingConnection ? "Update" : "Connect"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Generic Connect Dialog ───────────────────────────────────────────────────

function GenericConnectDialog({ open, onOpenChange, platform, projectId, projectWebsiteUrl, existingConnection, onSuccess }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  platform: CmsPlatform;
  projectId: Id<"projects">;
  projectWebsiteUrl: string;
  existingConnection: CmsConnection | null;
  onSuccess: () => void;
}) {
  const setup = PLATFORM_SETUP[platform.id];
  // siteUrl is locked to the project's websiteUrl — not editable
  const siteUrl = existingConnection?.siteUrl ?? projectWebsiteUrl;
  const [credentials, setCredentials] = useState("");
  const [extraValue, setExtraValue] = useState("");
  const [label, setLabel] = useState(existingConnection?.label ?? "");
  const [saving, setSaving] = useState(false);

  const saveConnection = useMutation(api.cms.mutations.saveConnection);
  const testWebflow = useAction(api.cms.actions.testWebflowConnection);
  const testWix = useAction(api.cms.actions.testWixConnection);

  function buildCredentials() {
    if (!credentials.trim()) return existingConnection?.credentials ?? "";
    if ((platform.id === "webflow" || platform.id === "wix") && extraValue) {
      return JSON.stringify({ token: credentials.trim(), siteId: extraValue.trim() });
    }
    if (setup?.hasExtraField && extraValue) {
      return JSON.stringify({ token: credentials.trim(), [setup.hasExtraField.label.toLowerCase().replace(/\s/g, "_")]: extraValue.trim() });
    }
    return credentials.trim();
  }

  async function handleSave() {
    const creds = buildCredentials();
    if (!creds) { toast.error("Enter credentials first"); return; }
    if (setup?.requiresSiteUrl && !siteUrl.trim()) { toast.error(`Enter the ${platform.name} site URL`); return; }
    setSaving(true);
    try {
      await saveConnection({ projectId, platform: platform.id, label: label || undefined, siteUrl: siteUrl || creds, credentials: creds });
      toast.success(`${platform.name} connected`);
      onSuccess();
    } catch (e) {
      toast.error(e instanceof ConvexError ? (e.data as { message: string }).message : "Failed to save");
    } finally { setSaving(false); }
  }

  if (!setup) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><span>{platform.icon}</span> Connect {platform.name}</DialogTitle>
          <DialogDescription>{platform.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          {/* Setup guide */}
          <div className="rounded-lg bg-muted/40 border p-3 text-xs space-y-1.5">
            <p className="font-semibold">How to get your {setup.credentialLabel}:</p>
            <ol className="list-decimal ml-4 space-y-1 text-muted-foreground">
              {setup.setupSteps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
            <a href={setup.docsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary underline mt-1">
              {platform.name} docs <ExternalLinkIcon className="h-3 w-3" />
            </a>
          </div>

          {setup.requiresSiteUrl && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{platform.name} Site URL</Label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/50 text-sm">
                <ServerIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate flex-1 text-muted-foreground">{siteUrl || "No URL set on project"}</span>
                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">Project URL</span>
              </div>
              <p className="text-[11px] text-muted-foreground">This URL is set by your project. To use a different domain, create a new project.</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{setup.credentialLabel}</Label>
            <Input type="password" value={credentials} onChange={(e) => setCredentials(e.target.value)} placeholder={existingConnection ? "Leave blank to keep existing" : setup.credentialPlaceholder} />
          </div>

          {setup.hasExtraField && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{setup.hasExtraField.label}</Label>
              <Input value={extraValue} onChange={(e) => setExtraValue(e.target.value)} placeholder={setup.hasExtraField.placeholder} />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Label (optional)</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={`e.g. My ${platform.name} Store`} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircleIcon className="h-4 w-4 mr-2" />}Save Connection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
