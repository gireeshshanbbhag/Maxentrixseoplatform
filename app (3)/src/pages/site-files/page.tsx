import { useState, useEffect } from "react";
import { useAction, useQuery } from "convex/react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useCurrentProject } from "@/hooks/use-current-project.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select.tsx";
import {
  ShieldCheckIcon, SparklesIcon, RefreshCwIcon, CopyIcon, DownloadIcon,
  PlusIcon, XIcon, FileTextIcon, MapIcon, BotIcon, ExternalLinkIcon, InfoIcon,
  CheckCircleIcon, AlertCircleIcon, UploadCloudIcon, LinkIcon, DatabaseIcon,
  WrenchIcon, ZapIcon, EyeIcon, ArrowRightIcon, Globe2Icon, ServerIcon,
} from "lucide-react";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";

type Tab = "robots" | "sitemap" | "llms";

// CMS page data loaded from backend
type CmsPage = { url: string; title: string; type: string; lastmod: string; status: string };
type CmsData = {
  hasCms: boolean;
  platform: string | null;
  siteUrl: string | null;
  pages: CmsPage[];
  liveRobotsTxt: string | null;
  existingSitemaps: Array<{ name: string; url: string; type: string }>;
  totalPages: number;
};

export default function SiteFilesPage() {
  return (
    <>
      <AuthLoading><div className="p-8"><Skeleton className="h-64 w-full" /></div></AuthLoading>
      <Unauthenticated><div className="flex justify-center p-8"><SignInButton /></div></Unauthenticated>
      <Authenticated><SiteFilesContent /></Authenticated>
    </>
  );
}

function SiteFilesContent() {
  const { activeProjectId } = useCurrentProject();
  const projects = useQuery(api.projects.list, {});
  const project = projects?.find((p) => p._id === activeProjectId);
  const [activeTab, setActiveTab] = useState<Tab>("robots");
  const [cmsData, setCmsData] = useState<CmsData | null>(null);
  const [cmsLoading, setCmsLoading] = useState(false);

  const loadCmsData = useAction(api.site_files.actions.loadCmsData);

  useEffect(() => {
    if (!activeProjectId) return;
    setCmsLoading(true);
    loadCmsData({ projectId: activeProjectId })
      .then(setCmsData)
      .catch(() => setCmsData({ hasCms: false, platform: null, siteUrl: null, pages: [], liveRobotsTxt: null, existingSitemaps: [], totalPages: 0 }))
      .finally(() => setCmsLoading(false));
  }, [activeProjectId]);

  if (!activeProjectId || !project) {
    return (
      <div className="p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><FileTextIcon /></EmptyMedia>
            <EmptyTitle>No project selected</EmptyTitle>
            <EmptyDescription>Select a project to manage site files</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const domain = (() => {
    try { return new URL(project.websiteUrl).hostname.replace("www.", ""); } catch { return project.websiteUrl; }
  })();

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "robots", label: "robots.txt", icon: <ShieldCheckIcon className="h-4 w-4" /> },
    { id: "sitemap", label: "sitemap.xml", icon: <MapIcon className="h-4 w-4" /> },
    { id: "llms", label: "llms.txt", icon: <BotIcon className="h-4 w-4" /> },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="border-b px-6 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <FileTextIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Site Files</h1>
            <p className="text-sm text-muted-foreground">
              Generate, edit & deploy robots.txt, sitemap.xml, and llms.txt for {domain}
            </p>
          </div>
          {cmsData?.hasCms && (
            <Badge variant="secondary" className="ml-auto flex items-center gap-1.5">
              <DatabaseIcon className="h-3 w-3" />
              CMS Connected ({cmsData.platform} · {cmsData.pages.length} pages)
            </Badge>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 border-b -mb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer -mb-px ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {cmsLoading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-5 w-72" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <>
            {activeTab === "robots" && <RobotsTab project={project} domain={domain} cmsData={cmsData} activeProjectId={activeProjectId} />}
            {activeTab === "sitemap" && <SitemapTab project={project} domain={domain} cmsData={cmsData} />}
            {activeTab === "llms" && <LlmsTab project={project} domain={domain} cmsData={cmsData} activeProjectId={activeProjectId} />}
          </>
        )}
      </div>
    </div>
  );
}

// ── Shared Helpers ─────────────────────────────────────────────────────────────

function PlatformBadge({ platform }: { platform: string }) {
  const labels: Record<string, string> = { wordpress: "WordPress", webflow: "Webflow", wix: "Wix" };
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-0.5 rounded-full font-medium">
      <ZapIcon className="h-3 w-3" />{labels[platform] ?? platform} Connected
    </span>
  );
}

function CmsBanner({ platform, pageCount }: { platform: string; pageCount: number }) {
  return (
    <div className="rounded-xl border bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 p-3 flex items-center gap-2.5 text-sm text-green-800 dark:text-green-300">
      <ZapIcon className="h-4 w-4 shrink-0 text-green-600" />
      <span>
        <strong>CMS data loaded</strong> — {pageCount} published pages from {platform} used for AI generation.
        No manual configuration needed.
      </span>
    </div>
  );
}

function OutputPanel({ content, filename, label }: { content: string; filename: string; label: string }) {
  function copyToClipboard() {
    void navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard");
  }
  function download() {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <CheckCircleIcon className="h-3.5 w-3.5 text-green-600" />
          <span className="text-xs font-semibold text-muted-foreground">{label}</span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" className="h-7 text-xs cursor-pointer" onClick={copyToClipboard}>
            <CopyIcon className="h-3.5 w-3.5 mr-1" />Copy
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs cursor-pointer" onClick={download}>
            <DownloadIcon className="h-3.5 w-3.5 mr-1" />Download
          </Button>
        </div>
      </div>
      <pre className="text-xs font-mono p-4 overflow-auto max-h-[450px] whitespace-pre-wrap leading-relaxed">{content}</pre>
    </div>
  );
}

function DeployResultBanner({ result, filename, domain }: {
  result: { deployed: boolean; method: string; uploadUrl?: string; reason?: string };
  filename: string;
  domain: string;
}) {
  if (result.deployed) {
    return (
      <div className="rounded-xl border bg-green-50 dark:bg-green-950/20 border-green-200 p-4 flex items-start gap-3">
        <CheckCircleIcon className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-green-800 dark:text-green-300">
            Deployed via {result.method}
          </p>
          <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
            {filename} is now live at https://{domain}/{filename}
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-xl border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 p-4 flex items-start gap-3">
      <InfoIcon className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Manual deploy needed</p>
        <p className="text-xs text-amber-700 dark:text-amber-300">{result.reason}</p>
        {result.uploadUrl && (
          <a href={result.uploadUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 mt-1">
            View uploaded file <ExternalLinkIcon className="h-3 w-3" />
          </a>
        )}
        <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
          Or download the file and upload it to your site root (https://{domain}/{filename}).
        </p>
      </div>
    </div>
  );
}

function DeployInstructions({ filename, domain }: { filename: string; domain: string }) {
  return (
    <div className="rounded-xl border bg-muted/30 p-4 flex items-start gap-3">
      <InfoIcon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      <div className="text-sm text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">How to deploy {filename}</p>
        <p className="text-xs">Upload to your site root so it's accessible at <strong>https://{domain}/{filename}</strong></p>
        <ul className="text-xs space-y-0.5 list-disc list-inside">
          <li>WordPress: FTP/cPanel, or use Yoast/RankMath plugin to manage it</li>
          <li>Webflow: upload via Webflow Dashboard → Settings → Files</li>
          <li>Other: place in <code className="bg-muted px-1 rounded">public/</code> or <code className="bg-muted px-1 rounded">www/</code> folder</li>
        </ul>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROBOTS.TXT TAB
// ─────────────────────────────────────────────────────────────────────────────

function RobotsTab({
  project, domain, cmsData, activeProjectId,
}: {
  project: { websiteUrl: string; businessDescription?: string; name: string };
  domain: string;
  cmsData: CmsData | null;
  activeProjectId: string;
}) {
  const hasCms = cmsData?.hasCms ?? false;
  const platform = cmsData?.platform ?? null;

  const [blockAiBots, setBlockAiBots] = useState(false);
  const [extraPaths, setExtraPaths] = useState<string[]>([]);
  const [newPath, setNewPath] = useState("");
  const [sitemapUrl, setSitemapUrl] = useState(`https://${domain}/sitemap.xml`);
  const [loading, setLoading] = useState(false);
  const [deployLoading, setDeployLoading] = useState(false);
  const [generated, setGenerated] = useState<string | null>(cmsData?.liveRobotsTxt ?? null);
  const [editMode, setEditMode] = useState(false);
  const [edited, setEdited] = useState<string | null>(null);
  const [deployResult, setDeployResult] = useState<{ deployed: boolean; method: string; reason?: string } | null>(null);
  const [mode, setMode] = useState<"auto" | "manual">(hasCms ? "auto" : "manual");

  // Pre-load live robots.txt from CMS connection
  useEffect(() => {
    if (cmsData?.liveRobotsTxt && !generated) {
      setGenerated(cmsData.liveRobotsTxt);
    }
  }, [cmsData]);

  const generateRobots = useAction(api.site_files.actions.generateRobotsTxt);
  const deployRobots = useAction(api.site_files.actions.deployRobotsTxtToWordPress);
  const fetchRobots = useAction(api.technical_seo.actions.fetchRobotsTxt);

  const displayContent = edited ?? generated;

  function addPath() {
    const p = newPath.trim();
    if (!p || extraPaths.includes(p)) return;
    setExtraPaths((prev) => [...prev, p]);
    setNewPath("");
  }

  async function handleGenerate() {
    setLoading(true);
    setDeployResult(null);
    try {
      const res = await generateRobots({
        websiteUrl: project.websiteUrl,
        sitemapUrl: sitemapUrl.trim() || undefined,
        blockAiBots,
        blockPaths: extraPaths,
        businessDescription: (project as { businessDescription?: string }).businessDescription,
        cmsPages: cmsData?.pages.map((p) => ({ url: p.url, type: p.type })),
        platform: platform ?? undefined,
      });
      setGenerated(res.content);
      setEdited(null);
      setEditMode(false);
    } catch (e) {
      toast.error(e instanceof ConvexError ? (e.data as { message: string }).message : "Failed to generate");
    } finally { setLoading(false); }
  }

  async function handleFetchLive() {
    setLoading(true);
    try {
      const res = await fetchRobots({ websiteUrl: project.websiteUrl });
      setGenerated(res.content);
      setEdited(null);
      setEditMode(false);
      toast.success("Fetched live robots.txt from your server");
    } catch (e) {
      toast.error(e instanceof ConvexError ? (e.data as { message: string }).message : "Could not fetch");
    } finally { setLoading(false); }
  }

  async function handleDeploy() {
    if (!displayContent) return;
    if (!hasCms || platform !== "wordpress") {
      toast.info("Auto-deploy is only available for WordPress CMS connections");
      return;
    }
    setDeployLoading(true);
    setDeployResult(null);
    try {
      const result = await deployRobots({
        projectId: activeProjectId as Id<"projects">,
        content: displayContent,
      });
      setDeployResult(result);
      if (result.deployed) toast.success("robots.txt deployed successfully!");
      else toast.info("Partial deploy — see instructions below");
    } catch (e) {
      toast.error(e instanceof ConvexError ? (e.data as { message: string }).message : "Deploy failed");
    } finally { setDeployLoading(false); }
  }

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      {/* Mode switcher */}
      <div className="flex items-center gap-3 border-b pb-4">
        <button
          onClick={() => setMode("auto")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${mode === "auto" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
        >
          <ZapIcon className="h-3.5 w-3.5" />AI Auto-Generate
          {hasCms && <Badge variant="secondary" className="ml-1 text-[10px] py-0">CMS</Badge>}
        </button>
        <button
          onClick={() => setMode("manual")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${mode === "manual" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
        >
          <WrenchIcon className="h-3.5 w-3.5" />Manual
        </button>
        {hasCms && cmsData?.liveRobotsTxt && (
          <span className="ml-auto text-xs text-green-600 flex items-center gap-1">
            <CheckCircleIcon className="h-3.5 w-3.5" />Live robots.txt loaded from server
          </span>
        )}
      </div>

      {mode === "auto" && (
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheckIcon className="h-4 w-4 text-primary" />AI-Powered robots.txt Generator
            {hasCms && platform && <PlatformBadge platform={platform} />}
          </div>

          {hasCms && cmsData && <CmsBanner platform={cmsData.platform!} pageCount={cmsData.pages.length} />}

          {!hasCms && (
            <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground flex items-center gap-2">
              <InfoIcon className="h-3.5 w-3.5 shrink-0" />
              No CMS connected. AI will generate based on website URL and settings.
              <a href="/cms/connections" className="text-primary hover:underline ml-1 flex items-center gap-0.5">
                Connect CMS <ArrowRightIcon className="h-3 w-3" />
              </a>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Sitemap URL</Label>
              <Input value={sitemapUrl} onChange={(e) => setSitemapUrl(e.target.value)} placeholder={`https://${domain}/sitemap.xml`} />
            </div>
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Block AI Training Bots</Label>
                <Switch checked={blockAiBots} onCheckedChange={setBlockAiBots} />
              </div>
              <p className="text-xs text-muted-foreground">Blocks GPTBot, ClaudeBot, CCBot, Google-Extended</p>
            </div>
          </div>

          {/* Extra disallowed paths */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Extra Disallowed Paths <span className="text-muted-foreground font-normal">(optional — AI picks sensible defaults)</span></Label>
            <div className="flex flex-wrap gap-2">
              {extraPaths.map((p) => (
                <span key={p} className="flex items-center gap-1 text-xs bg-muted rounded-full px-3 py-1 font-mono">
                  {p}
                  <button onClick={() => setExtraPaths((prev) => prev.filter((x) => x !== p))} className="text-muted-foreground hover:text-foreground cursor-pointer ml-1">
                    <XIcon className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={newPath} onChange={(e) => setNewPath(e.target.value)} placeholder="/private/" className="flex-1 h-8 text-sm font-mono" onKeyDown={(e) => e.key === "Enter" && addPath()} />
              <Button size="sm" variant="secondary" onClick={addPath} className="cursor-pointer"><PlusIcon className="h-3.5 w-3.5 mr-1" />Add</Button>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap items-center">
            <Button onClick={handleGenerate} disabled={loading} className="cursor-pointer">
              {loading ? <><RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />Generating…</> : <><SparklesIcon className="h-4 w-4 mr-2" />Generate robots.txt</>}
            </Button>
            <Button variant="secondary" onClick={handleFetchLive} disabled={loading} className="cursor-pointer">
              <ExternalLinkIcon className="h-4 w-4 mr-1.5" />Fetch live from server
            </Button>
          </div>
        </div>
      )}

      {mode === "manual" && (
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <WrenchIcon className="h-4 w-4 text-primary" />Manual robots.txt Editor
          </div>
          <p className="text-xs text-muted-foreground">Write or paste your robots.txt directly. Changes can be deployed to your CMS.</p>
          <Textarea
            value={edited ?? generated ?? "User-agent: *\nAllow: /\n\nSitemap: https://" + domain + "/sitemap.xml"}
            onChange={(e) => { setEdited(e.target.value); setGenerated(null); }}
            className="font-mono text-xs min-h-[280px] resize-y"
            placeholder={"User-agent: *\nAllow: /\n\nSitemap: https://" + domain + "/sitemap.xml"}
          />
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleFetchLive} disabled={loading} className="cursor-pointer">
              {loading ? <RefreshCwIcon className="h-4 w-4 mr-1.5 animate-spin" /> : <ExternalLinkIcon className="h-4 w-4 mr-1.5" />}
              Fetch live from server
            </Button>
          </div>
        </div>
      )}

      {/* Output panel (auto mode) */}
      {mode === "auto" && displayContent && (
        <>
          <div className="flex items-center gap-2">
            <Button size="sm" variant={editMode ? "default" : "secondary"} onClick={() => { setEditMode((v) => !v); if (!editMode) setEdited(displayContent); }} className="cursor-pointer">
              {editMode ? "Done editing" : "Edit manually"}
            </Button>
            {editMode && <p className="text-xs text-muted-foreground">Edit then deploy</p>}
          </div>
          {editMode ? (
            <Textarea value={edited ?? displayContent} onChange={(e) => setEdited(e.target.value)} className="font-mono text-xs min-h-[320px] resize-y" />
          ) : (
            <OutputPanel content={displayContent} filename="robots.txt" label={`robots.txt — https://${domain}/robots.txt`} />
          )}
        </>
      )}

      {/* Deploy section */}
      {displayContent && (
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <p className="text-sm font-semibold flex items-center gap-1.5"><UploadCloudIcon className="h-4 w-4 text-primary" />Deploy robots.txt</p>
          <div className="flex gap-2 flex-wrap">
            {hasCms && platform === "wordpress" && (
              <Button variant="default" onClick={handleDeploy} disabled={deployLoading} className="cursor-pointer">
                {deployLoading ? <><RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />Deploying…</> : <><UploadCloudIcon className="h-4 w-4 mr-2" />Deploy to WordPress</>}
              </Button>
            )}
            <Button variant="secondary" onClick={() => {
              const blob = new Blob([displayContent], { type: "text/plain" });
              const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "robots.txt"; a.click(); URL.revokeObjectURL(url);
            }} className="cursor-pointer"><DownloadIcon className="h-4 w-4 mr-2" />Download robots.txt</Button>
          </div>
          {deployResult && <DeployResultBanner result={deployResult} filename="robots.txt" domain={domain} />}
          {!deployResult && <DeployInstructions filename="robots.txt" domain={domain} />}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SITEMAP TAB
// ─────────────────────────────────────────────────────────────────────────────

type SitemapPageRow = { url: string; title: string; priority: string; changefreq: string; lastmod: string; type: string };
const CHANGEFREQ_OPTIONS = ["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"];
const TYPE_PRIORITY: Record<string, string> = { page: "0.8", post: "0.6", product: "0.9" };

function SitemapTab({
  project, domain, cmsData,
}: {
  project: { websiteUrl: string };
  domain: string;
  cmsData: CmsData | null;
}) {
  const today = new Date().toISOString().split("T")[0];
  const hasCms = cmsData?.hasCms ?? false;
  const [mode, setMode] = useState<"auto" | "manual">(hasCms ? "auto" : "manual");
  const [pages, setPages] = useState<SitemapPageRow[]>([]);
  const [cmsLoaded, setCmsLoaded] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [includeImages, setIncludeImages] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [edited, setEdited] = useState<string | null>(null);
  const [bulkInput, setBulkInput] = useState("");
  const [showBulk, setShowBulk] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");

  const generateSitemap = useAction(api.site_files.actions.generateSitemapXml);

  // Auto-load CMS pages
  useEffect(() => {
    if (!hasCms || cmsLoaded || !cmsData) return;
    const rows: SitemapPageRow[] = cmsData.pages
      .filter((p) => p.status === "publish")
      .map((p) => ({
        url: p.url,
        title: p.title,
        type: p.type,
        priority: TYPE_PRIORITY[p.type] ?? "0.7",
        changefreq: p.type === "page" ? "monthly" : "weekly",
        lastmod: p.lastmod,
      }));
    setPages(rows);
    setCmsLoaded(true);
  }, [cmsData, hasCms, cmsLoaded]);

  // Fallback defaults for manual mode
  useEffect(() => {
    if (!hasCms && pages.length === 0) {
      setPages([
        { url: "/", title: "Home", priority: "1.0", changefreq: "weekly", lastmod: today, type: "page" },
        { url: "/about", title: "About", priority: "0.8", changefreq: "monthly", lastmod: today, type: "page" },
        { url: "/contact", title: "Contact", priority: "0.7", changefreq: "monthly", lastmod: today, type: "page" },
      ]);
    }
  }, [hasCms]);

  const allTypes = [...new Set(pages.map((p) => p.type))];
  const filteredPages = typeFilter === "all" ? pages : pages.filter((p) => p.type === typeFilter);

  function addPage() {
    const url = newUrl.trim();
    if (!url) return;
    setPages((prev) => [...prev, { url, title: url, priority: "0.8", changefreq: "monthly", lastmod: today, type: "page" }]);
    setNewUrl("");
  }

  function updatePage(i: number, field: keyof SitemapPageRow, val: string) {
    setPages((prev) => { const n = [...prev]; n[i] = { ...n[i], [field]: val }; return n; });
  }

  function removePage(i: number) {
    const realIdx = pages.indexOf(filteredPages[i]);
    setPages((prev) => prev.filter((_, idx) => idx !== realIdx));
  }

  function handleBulkImport() {
    const urls = bulkInput.split("\n").map((l) => l.trim()).filter(Boolean);
    const newPages = urls.map((url) => ({ url, title: url, priority: "0.8", changefreq: "monthly", lastmod: today, type: "page" }));
    setPages((prev) => {
      const existing = new Set(prev.map((p) => p.url));
      return [...prev, ...newPages.filter((p) => !existing.has(p.url))];
    });
    setBulkInput(""); setShowBulk(false);
    toast.success(`Added ${newPages.length} URL${newPages.length !== 1 ? "s" : ""}`);
  }

  async function handleGenerate() {
    if (pages.length === 0) { toast.error("Add at least one page"); return; }
    setLoading(true);
    try {
      const res = await generateSitemap({
        websiteUrl: project.websiteUrl,
        pages: filteredPages.map((p) => ({ url: p.url, priority: p.priority, changefreq: p.changefreq, lastmod: p.lastmod })),
        includeImages,
      });
      setGenerated(res.content);
      setEdited(null); setEditMode(false);
    } catch (e) {
      toast.error(e instanceof ConvexError ? (e.data as { message: string }).message : "Failed to generate");
    } finally { setLoading(false); }
  }

  const displayContent = edited ?? generated;

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      {/* Mode switcher */}
      <div className="flex items-center gap-3 border-b pb-4">
        <button
          onClick={() => setMode("auto")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${mode === "auto" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
        >
          <ZapIcon className="h-3.5 w-3.5" />CMS Auto-Import
          {hasCms && <Badge variant="secondary" className="ml-1 text-[10px] py-0">CMS</Badge>}
        </button>
        <button
          onClick={() => setMode("manual")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${mode === "manual" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
        >
          <WrenchIcon className="h-3.5 w-3.5" />Manual Builder
        </button>

        {/* Existing sitemaps */}
        {hasCms && cmsData && cmsData.existingSitemaps.length > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <Globe2Icon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Existing sitemaps:</span>
            {cmsData.existingSitemaps.slice(0, 3).map((s) => (
              <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-0.5">
                {s.name} <ExternalLinkIcon className="h-2.5 w-2.5" />
              </a>
            ))}
          </div>
        )}
      </div>

      {mode === "auto" && hasCms && cmsData && (
        <CmsBanner platform={cmsData.platform!} pageCount={cmsData.pages.filter((p) => p.status === "publish").length} />
      )}

      {mode === "auto" && !hasCms && (
        <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground flex items-center gap-2">
          <InfoIcon className="h-3.5 w-3.5 shrink-0" />
          No CMS connected. Switch to Manual Builder to add pages.
          <a href="/cms/connections" className="text-primary hover:underline ml-1 flex items-center gap-0.5">
            Connect CMS <ArrowRightIcon className="h-3 w-3" />
          </a>
        </div>
      )}

      {/* Page list */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <MapIcon className="h-4 w-4 text-primary" />
            {pages.length} URLs configured
            {allTypes.length > 1 && (
              <div className="flex gap-1 ml-2">
                <button onClick={() => setTypeFilter("all")} className={`text-xs px-2 py-0.5 rounded-full cursor-pointer ${typeFilter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>All</button>
                {allTypes.map((t) => (
                  <button key={t} onClick={() => setTypeFilter(t)} className={`text-xs px-2 py-0.5 rounded-full cursor-pointer capitalize ${typeFilter === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{t}s</button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch checked={includeImages} onCheckedChange={setIncludeImages} />
              <Label className="text-xs">Image namespace</Label>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="grid grid-cols-[1fr_80px_100px_100px_36px] gap-2 text-xs font-semibold text-muted-foreground px-1">
            <span>URL</span><span className="text-center">Priority</span><span className="text-center">Changefreq</span><span className="text-center">Last modified</span><span></span>
          </div>
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {filteredPages.map((page, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_100px_100px_36px] gap-2 items-center">
                <div className="min-w-0">
                  <Input value={page.url} onChange={(e) => updatePage(i, "url", e.target.value)} className="h-8 text-xs font-mono truncate" />
                </div>
                <Select value={page.priority} onValueChange={(v) => updatePage(i, "priority", v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["1.0","0.9","0.8","0.7","0.6","0.5","0.4","0.3"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={page.changefreq} onValueChange={(v) => updatePage(i, "changefreq", v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CHANGEFREQ_OPTIONS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="date" value={page.lastmod} onChange={(e) => updatePage(i, "lastmod", e.target.value)} className="h-8 text-xs" />
                <button onClick={() => removePage(i)} className="flex items-center justify-center h-8 w-8 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer transition-colors">
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {filteredPages.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                {hasCms ? "No published pages found" : "Add pages below"}
              </div>
            )}
          </div>

          {/* Add / Bulk */}
          <div className="flex gap-2 pt-2 border-t">
            <Input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="/new-page or https://..." className="flex-1 h-8 text-sm font-mono" onKeyDown={(e) => e.key === "Enter" && addPage()} />
            <Button size="sm" variant="secondary" onClick={addPage} className="cursor-pointer"><PlusIcon className="h-3.5 w-3.5 mr-1" />Add URL</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowBulk((v) => !v)} className="cursor-pointer">Bulk import</Button>
          </div>

          {showBulk && (
            <div className="space-y-2 p-3 rounded-lg border bg-muted/30">
              <Label className="text-xs font-medium">Paste URLs (one per line)</Label>
              <Textarea value={bulkInput} onChange={(e) => setBulkInput(e.target.value)} placeholder={"/page-1\n/page-2\nhttps://example.com/page-3"} className="font-mono text-xs min-h-[100px]" />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleBulkImport} className="cursor-pointer">Import</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowBulk(false)} className="cursor-pointer">Cancel</Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button onClick={handleGenerate} disabled={loading || pages.length === 0} className="cursor-pointer">
            {loading ? <><RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />Generating…</> : <><MapIcon className="h-4 w-4 mr-2" />Generate sitemap.xml ({typeFilter === "all" ? pages.length : filteredPages.length} URLs)</>}
          </Button>
        </div>
      </div>

      {displayContent && (
        <>
          <div className="flex items-center gap-3">
            <Button size="sm" variant={editMode ? "default" : "secondary"} onClick={() => { setEditMode((v) => !v); if (!editMode) setEdited(displayContent); }} className="cursor-pointer">
              {editMode ? "Done editing" : "Edit manually"}
            </Button>
          </div>
          {editMode ? (
            <Textarea value={edited ?? displayContent} onChange={(e) => setEdited(e.target.value)} className="font-mono text-xs min-h-[400px] resize-y" />
          ) : (
            <OutputPanel content={displayContent} filename="sitemap.xml" label={`sitemap.xml — ${pages.length} URLs`} />
          )}
          <DeployInstructions filename="sitemap.xml" domain={domain} />
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LLMS.TXT TAB
// ─────────────────────────────────────────────────────────────────────────────

function LlmsTab({
  project, domain, cmsData, activeProjectId,
}: {
  project: { websiteUrl: string; name: string; businessDescription?: string; businessCategory?: string; country?: string };
  domain: string;
  cmsData: CmsData | null;
  activeProjectId: string;
}) {
  const hasCms = cmsData?.hasCms ?? false;
  const [blockAiTraining, setBlockAiTraining] = useState(false);
  const [allowAiAnswering, setAllowAiAnswering] = useState(true);
  const [loading, setLoading] = useState(false);
  const [deployLoading, setDeployLoading] = useState(false);
  const [generated, setGenerated] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [edited, setEdited] = useState<string | null>(null);
  const [deployResult, setDeployResult] = useState<{ deployed: boolean; method: string; uploadUrl?: string; reason?: string } | null>(null);

  // Manual fallback pages
  const [manualPages, setManualPages] = useState([
    { url: "/", title: "Home", description: "Main landing page" },
    { url: "/about", title: "About", description: "Company information" },
    { url: "/contact", title: "Contact", description: "Contact details" },
  ]);
  const [newPage, setNewPage] = useState({ url: "", title: "", description: "" });

  const generateLlms = useAction(api.site_files.actions.generateLlmsTxt);
  const deployLlms = useAction(api.site_files.actions.deployLlmsTxtToWordPress);

  async function handleGenerate() {
    setLoading(true);
    setDeployResult(null);
    try {
      const res = await generateLlms({
        websiteUrl: project.websiteUrl,
        businessName: project.name,
        businessDescription: (project as { businessDescription?: string }).businessDescription,
        businessCategory: (project as { businessCategory?: string }).businessCategory,
        country: (project as { country?: string }).country,
        blockAiTraining,
        allowAiAnswering,
        cmsPages: hasCms ? cmsData!.pages.map((p) => ({ url: p.url, title: p.title, type: p.type })) : undefined,
        keyPages: !hasCms ? manualPages : undefined,
        platform: cmsData?.platform ?? undefined,
      });
      setGenerated(res.content);
      setEdited(null); setEditMode(false);
    } catch (e) {
      toast.error(e instanceof ConvexError ? (e.data as { message: string }).message : "Failed to generate");
    } finally { setLoading(false); }
  }

  async function handleDeploy() {
    const content = edited ?? generated;
    if (!content || !hasCms || cmsData?.platform !== "wordpress") return;
    setDeployLoading(true);
    try {
      const result = await deployLlms({
        projectId: activeProjectId as Id<"projects">,
        content,
      });
      setDeployResult(result);
      toast.info(result.deployed ? "Deployed!" : "See deploy instructions below");
    } catch (e) {
      toast.error(e instanceof ConvexError ? (e.data as { message: string }).message : "Deploy failed");
    } finally { setDeployLoading(false); }
  }

  const displayContent = edited ?? generated;

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      {/* What is llms.txt */}
      <div className="rounded-xl border bg-primary/5 border-primary/20 p-4 flex items-start gap-3">
        <BotIcon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-semibold">What is llms.txt?</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            llms.txt is a new standard that helps AI language models (ChatGPT, Claude, Perplexity) understand your website — what it's about, which pages matter, and how your content may be used.
            As AI-powered search grows, llms.txt gives you control over how AI represents your brand.
          </p>
          <a href="https://llmstxt.org" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
            llmstxt.org spec <ExternalLinkIcon className="h-3 w-3" />
          </a>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 space-y-5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <SparklesIcon className="h-4 w-4 text-primary" />AI-Powered llms.txt Generator
          {hasCms && cmsData?.platform && <PlatformBadge platform={cmsData.platform} />}
        </div>

        {hasCms && cmsData ? (
          <CmsBanner platform={cmsData.platform!} pageCount={cmsData.pages.length} />
        ) : (
          <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
            No CMS connected — AI will use the manual pages listed below. For best results,{" "}
            <a href="/cms/connections" className="text-primary hover:underline">connect your CMS</a> first.
          </div>
        )}

        {/* AI Permissions */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Block AI Model Training</Label>
              <Switch checked={blockAiTraining} onCheckedChange={setBlockAiTraining} />
            </div>
            <p className="text-xs text-muted-foreground">Tells AI companies not to train models on your content</p>
          </div>
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Allow AI to Answer Queries</Label>
              <Switch checked={allowAiAnswering} onCheckedChange={setAllowAiAnswering} />
            </div>
            <p className="text-xs text-muted-foreground">Allows ChatGPT, Claude etc. to cite your content when answering users</p>
          </div>
        </div>

        {/* Manual pages (only shown without CMS) */}
        {!hasCms && (
          <div className="space-y-2">
            <Label className="text-xs font-medium">Key Pages <span className="text-muted-foreground font-normal">(shown to AI models)</span></Label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {manualPages.map((page, i) => (
                <div key={i} className="grid grid-cols-[80px_1fr_1fr_32px] gap-2 items-center">
                  <Input value={page.url} onChange={(e) => setManualPages((prev) => { const n = [...prev]; n[i] = { ...n[i], url: e.target.value }; return n; })} className="h-8 text-xs font-mono" placeholder="/page" />
                  <Input value={page.title} onChange={(e) => setManualPages((prev) => { const n = [...prev]; n[i] = { ...n[i], title: e.target.value }; return n; })} className="h-8 text-xs" placeholder="Title" />
                  <Input value={page.description} onChange={(e) => setManualPages((prev) => { const n = [...prev]; n[i] = { ...n[i], description: e.target.value }; return n; })} className="h-8 text-xs" placeholder="Description for AI" />
                  <button onClick={() => setManualPages((prev) => prev.filter((_, idx) => idx !== i))} className="flex items-center justify-center h-8 w-8 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"><XIcon className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-[80px_1fr_1fr_32px] gap-2 items-center border-t pt-2">
              <Input value={newPage.url} onChange={(e) => setNewPage((p) => ({ ...p, url: e.target.value }))} className="h-8 text-xs font-mono" placeholder="/page" />
              <Input value={newPage.title} onChange={(e) => setNewPage((p) => ({ ...p, title: e.target.value }))} className="h-8 text-xs" placeholder="Title" />
              <Input value={newPage.description} onChange={(e) => setNewPage((p) => ({ ...p, description: e.target.value }))} className="h-8 text-xs" placeholder="Description" onKeyDown={(e) => { if (e.key === "Enter" && newPage.url && newPage.title) { setManualPages((prev) => [...prev, { ...newPage }]); setNewPage({ url: "", title: "", description: "" }); }}} />
              <button onClick={() => { if (newPage.url && newPage.title) { setManualPages((prev) => [...prev, { ...newPage }]); setNewPage({ url: "", title: "", description: "" }); } }} className="flex items-center justify-center h-8 w-8 rounded bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer"><PlusIcon className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        )}

        <Button onClick={handleGenerate} disabled={loading} className="cursor-pointer">
          {loading ? <><RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />Generating…</> : <><SparklesIcon className="h-4 w-4 mr-2" />Generate llms.txt{hasCms ? ` from ${cmsData!.pages.length} CMS pages` : ""}</>}
        </Button>
      </div>

      {displayContent && (
        <>
          <div className="flex items-center gap-2">
            <Button size="sm" variant={editMode ? "default" : "secondary"} onClick={() => { setEditMode((v) => !v); if (!editMode) setEdited(displayContent); }} className="cursor-pointer">
              {editMode ? "Done editing" : "Edit manually"}
            </Button>
          </div>
          {editMode ? (
            <Textarea value={edited ?? displayContent} onChange={(e) => setEdited(e.target.value)} className="font-mono text-xs min-h-[400px] resize-y" />
          ) : (
            <OutputPanel content={displayContent} filename="llms.txt" label={`llms.txt — https://${domain}/llms.txt`} />
          )}

          {/* Deploy */}
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <p className="text-sm font-semibold flex items-center gap-1.5"><UploadCloudIcon className="h-4 w-4 text-primary" />Deploy llms.txt</p>
            <div className="flex gap-2 flex-wrap">
              {hasCms && cmsData?.platform === "wordpress" && (
                <Button variant="default" onClick={handleDeploy} disabled={deployLoading} className="cursor-pointer">
                  {deployLoading ? <><RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />Deploying…</> : <><UploadCloudIcon className="h-4 w-4 mr-2" />Deploy to WordPress</>}
                </Button>
              )}
              <Button variant="secondary" onClick={() => {
                const blob = new Blob([displayContent], { type: "text/plain" });
                const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "llms.txt"; a.click(); URL.revokeObjectURL(url);
              }} className="cursor-pointer"><DownloadIcon className="h-4 w-4 mr-2" />Download llms.txt</Button>
            </div>
            {deployResult && <DeployResultBanner result={deployResult} filename="llms.txt" domain={domain} />}
            {!deployResult && <DeployInstructions filename="llms.txt" domain={domain} />}
          </div>
        </>
      )}
    </div>
  );
}
