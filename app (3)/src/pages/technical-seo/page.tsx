import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useCurrentProject } from "@/hooks/use-current-project.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import {
  WrenchIcon, ShieldCheckIcon, AlertTriangleIcon, CheckCircleIcon,
  ExternalLinkIcon, RefreshCwIcon, ChevronDownIcon, ChevronUpIcon,
  FileTextIcon, LinkIcon, ImageIcon, ZapIcon, SearchIcon, GitBranchIcon,
  XCircleIcon, InfoIcon, ChevronRightIcon,
} from "lucide-react";
import {
  Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription,
} from "@/components/ui/empty.tsx";
import { Link } from "react-router-dom";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

type RobotsResult = {
  content: string;
  hasDisallowAll: boolean;
  sitemapUrls: string[];
  disallowedPaths: string[];
  crawlDelay: number | null;
  fetchedAt: string;
};

type CheckConfig = {
  id: string;
  label: string;
  count: number;
  total: number;
  icon: React.ReactNode;
  why: string;
  howToFix: string;
  severity: "critical" | "warning" | "info";
};

export default function TechnicalSeoPage() {
  return (
    <>
      <AuthLoading><div className="p-8"><Skeleton className="h-64 w-full" /></div></AuthLoading>
      <Unauthenticated><div className="flex justify-center p-8"><SignInButton /></div></Unauthenticated>
      <Authenticated><TechnicalSeoContent /></Authenticated>
    </>
  );
}

function TechnicalSeoContent() {
  const { activeProjectId } = useCurrentProject();
  const projects = useQuery(api.projects.list, {});
  const project = projects?.find((p) => p._id === activeProjectId);
  const summary = useQuery(
    api.technical_seo.queries.getTechnicalSeoSummary,
    activeProjectId ? { projectId: activeProjectId } : "skip"
  );

  const fetchRobotsTxt = useAction(api.technical_seo.actions.fetchRobotsTxt);
  const [robots, setRobots] = useState<RobotsResult | null>(null);
  const [robotsLoading, setRobotsLoading] = useState(false);
  const [showRobotsContent, setShowRobotsContent] = useState(false);

  if (!activeProjectId || !project) {
    return (
      <div className="p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><WrenchIcon /></EmptyMedia>
            <EmptyTitle>No project selected</EmptyTitle>
            <EmptyDescription>Select a project to view Technical SEO insights</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  async function loadRobots() {
    if (!project) return;
    setRobotsLoading(true);
    try {
      const result = await fetchRobotsTxt({ websiteUrl: project.websiteUrl });
      setRobots(result);
    } catch (e) {
      const msg = e instanceof ConvexError ? (e.data as { message: string }).message : "Failed to fetch robots.txt";
      toast.error(msg);
    } finally {
      setRobotsLoading(false);
    }
  }

  const stats = summary;
  const hasAudit = stats?.audit !== null && stats?.audit !== undefined;
  const total = stats?.audit?.pagesCrawled ?? 0;

  const checks: CheckConfig[] = stats && hasAudit ? [
    {
      id: "broken_pages",
      label: "Broken Pages (4xx/5xx)",
      count: stats.brokenPages,
      total,
      icon: <XCircleIcon className="h-4 w-4" />,
      severity: "critical",
      why: "Broken pages return error responses to Google and visitors. They waste crawl budget, signal poor site quality, and frustrate users — directly hurting rankings and conversions.",
      howToFix: "Either restore the page content, set up a 301 redirect to the correct page, or return a proper 410 Gone response if the content was intentionally removed.",
    },
    {
      id: "missing_titles",
      label: "Missing Title Tags",
      count: stats.missingTitles,
      total,
      icon: <FileTextIcon className="h-4 w-4" />,
      severity: "critical",
      why: "Title tags are the single most important on-page SEO element. Google uses them as the clickable headline in search results. Missing titles mean Google will auto-generate one — usually poorly.",
      howToFix: "Add a unique, descriptive <title> tag (50–60 characters) to each page. Include the primary keyword near the start.",
    },
    {
      id: "missing_meta",
      label: "Missing Meta Descriptions",
      count: stats.missingMeta,
      total,
      icon: <FileTextIcon className="h-4 w-4" />,
      severity: "warning",
      why: "Meta descriptions appear as the snippet under your link in search results. While not a direct ranking factor, they influence click-through rate. Missing ones get replaced by random page content.",
      howToFix: "Write a compelling 150–160 character meta description for each page that clearly describes the content and includes a call to action.",
    },
    {
      id: "missing_h1",
      label: "Missing H1 Tags",
      count: stats.missingH1,
      total,
      icon: <FileTextIcon className="h-4 w-4" />,
      severity: "warning",
      why: "The H1 heading tells both users and search engines what a page is about. Missing H1s make pages harder to understand contextually, reducing topical relevance signals.",
      howToFix: "Add exactly one H1 tag per page that clearly states the page's primary topic. It should naturally include your target keyword.",
    },
    {
      id: "robots_blocked",
      label: "Blocked by Robots / Noindex",
      count: stats.robotsIssues,
      total,
      icon: <ShieldCheckIcon className="h-4 w-4" />,
      severity: "critical",
      why: "Pages blocked by robots.txt or with a noindex directive are excluded from Google's index entirely. If important pages are blocked, they will never appear in search results.",
      howToFix: "Review each blocked URL. If the page should be indexed, remove the noindex tag or update robots.txt to allow crawling. Only block pages like admin panels, duplicate content, and thank-you pages.",
    },
    {
      id: "canonical_issues",
      label: "Non-canonical Pages",
      count: stats.canonicalIssues,
      total,
      icon: <LinkIcon className="h-4 w-4" />,
      severity: "warning",
      why: "When a page's canonical tag points to a different URL, you're telling Google the current page is a duplicate and should not be indexed. This can unintentionally remove pages from search results.",
      howToFix: "Verify each canonical URL is intentional. If the page should be indexed, update the canonical to self-reference (point to itself). Use canonicals deliberately for duplicate/parameterised content.",
    },
    {
      id: "redirect_pages",
      label: "Redirect Pages (3xx)",
      count: stats.redirectPages,
      total,
      icon: <GitBranchIcon className="h-4 w-4" />,
      severity: "info",
      why: "Each redirect adds latency and loses a small amount of link equity. Redirect chains (A→B→C) compound these issues. Internal links pointing to redirected URLs also waste crawl budget.",
      howToFix: "Update internal links to point directly to the final destination URL. Remove redirect chains. Use 301 redirects for permanent moves and ensure each redirect resolves in one hop.",
    },
    {
      id: "slow_pages",
      label: "Slow Pages (>3s load)",
      count: stats.slowPages,
      total,
      icon: <ZapIcon className="h-4 w-4" />,
      severity: "warning",
      why: "Page speed is a confirmed Google ranking factor. Pages taking >3s have significantly higher bounce rates. Google's Core Web Vitals (LCP) directly impact search rankings.",
      howToFix: "Compress images, enable browser caching, minify CSS/JS, use a CDN, and reduce server response times. Consider lazy-loading off-screen content and deferring non-critical scripts.",
    },
    {
      id: "images_without_alt",
      label: "Images Missing Alt Text",
      count: stats.imagesWithoutAlt,
      total,
      icon: <ImageIcon className="h-4 w-4" />,
      severity: "info",
      why: "Alt text is how search engines understand image content. Missing alt text means your images won't rank in Google Image Search, and the pages lose image-related keyword signals.",
      howToFix: "Add descriptive alt attributes to all meaningful images. Use keywords naturally where relevant. Decorative images should have empty alt attributes (alt=\"\") to be ignored by screen readers.",
    },
  ] : [];

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <WrenchIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Technical SEO</h1>
              <p className="text-sm text-muted-foreground">Crawlability, indexation, and technical health</p>
            </div>
          </div>
          <Button asChild variant="secondary" size="sm">
            <Link to="/audit"><ShieldCheckIcon className="h-4 w-4 mr-1.5" />Run New Audit</Link>
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-5xl">

        {/* Audit Summary Cards */}
        {stats === undefined ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
        ) : !hasAudit ? (
          <div className="rounded-xl border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 p-6 flex items-start gap-3">
            <AlertTriangleIcon className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-900 dark:text-amber-100">No completed audit found</p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Run a site audit to see Technical SEO insights. Technical data is pulled from your latest crawl.
              </p>
              <Button asChild size="sm" className="mt-3">
                <Link to="/audit">Run Site Audit</Link>
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Audit Summary — {stats.audit?.completedAt ? new Date(stats.audit.completedAt).toLocaleDateString() : "Latest"}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Health Score" value={stats.audit?.overallScore !== undefined ? `${stats.audit.overallScore}/100` : "N/A"} color={stats.audit?.overallScore !== undefined ? (stats.audit.overallScore >= 80 ? "green" : stats.audit.overallScore >= 60 ? "amber" : "red") : "muted"} icon={<ShieldCheckIcon className="h-4 w-4" />} />
                <StatCard label="Pages Crawled" value={String(stats.audit?.pagesCrawled ?? 0)} color="blue" icon={<SearchIcon className="h-4 w-4" />} />
                <StatCard label="Critical Issues" value={String(stats.audit?.criticalCount ?? 0)} color={stats.audit?.criticalCount === 0 ? "green" : "red"} icon={<AlertTriangleIcon className="h-4 w-4" />} />
                <StatCard label="Total Issues" value={String(stats.audit?.issuesFound ?? 0)} color={stats.audit?.issuesFound === 0 ? "green" : "amber"} icon={<InfoIcon className="h-4 w-4" />} />
              </div>
            </div>

            {/* Technical Checks — expandable */}
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Technical Checks</h2>
              <div className="space-y-2">
                {checks.map((check) => (
                  <ExpandableCheckRow
                    key={check.id}
                    check={check}
                    projectId={activeProjectId}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button asChild size="sm" variant="secondary">
                <Link to="/audit">View Full Audit Report</Link>
              </Button>
              <Button asChild size="sm" variant="secondary">
                <Link to="/performance">Core Web Vitals</Link>
              </Button>
            </div>
          </>
        )}

        {/* Robots.txt Analysis */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Robots.txt Analysis</h2>
            </div>
            <Button size="sm" onClick={loadRobots} disabled={robotsLoading} className="cursor-pointer">
              {robotsLoading ? <><RefreshCwIcon className="h-3.5 w-3.5 mr-1.5 animate-spin" />Fetching…</> : <><RefreshCwIcon className="h-3.5 w-3.5 mr-1.5" />Fetch robots.txt</>}
            </Button>
          </div>

          {robots ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {robots.hasDisallowAll ? (
                  <Badge variant="destructive" className="text-xs">⚠ Disallow All — site blocked from crawlers</Badge>
                ) : (
                  <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100">✓ Not blocking all crawlers</Badge>
                )}
                {robots.crawlDelay !== null && (
                  <Badge variant="secondary" className="text-xs">Crawl-delay: {robots.crawlDelay}s</Badge>
                )}
                <Badge variant="secondary" className="text-xs">{robots.disallowedPaths.length} disallowed path(s)</Badge>
                <Badge variant="secondary" className="text-xs">{robots.sitemapUrls.length} sitemap(s) declared</Badge>
              </div>
              {robots.sitemapUrls.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Sitemaps in robots.txt</p>
                  <ul className="space-y-1">
                    {robots.sitemapUrls.map((s) => (
                      <li key={s} className="text-xs flex items-center gap-1.5">
                        <CheckCircleIcon className="h-3 w-3 text-green-600 shrink-0" />
                        <a href={s} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">{s}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {robots.disallowedPaths.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Disallowed Paths</p>
                  <div className="flex flex-wrap gap-1">
                    {robots.disallowedPaths.slice(0, 20).map((p) => (
                      <span key={p} className="text-xs bg-muted rounded px-2 py-0.5 font-mono">{p}</span>
                    ))}
                    {robots.disallowedPaths.length > 20 && (
                      <span className="text-xs text-muted-foreground">+{robots.disallowedPaths.length - 20} more</span>
                    )}
                  </div>
                </div>
              )}
              <button
                onClick={() => setShowRobotsContent(!showRobotsContent)}
                className="text-xs text-primary flex items-center gap-1 cursor-pointer hover:underline"
              >
                {showRobotsContent ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />}
                {showRobotsContent ? "Hide" : "Show"} raw robots.txt
              </button>
              {showRobotsContent && (
                <pre className="text-xs bg-muted rounded-lg p-3 overflow-auto max-h-64 font-mono whitespace-pre-wrap">{robots.content}</pre>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Click "Fetch robots.txt" to analyze your site's crawl directives live.
            </p>
          )}
        </div>

        {/* Quick Links */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Quick Navigation</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: "Sitemaps", desc: "Manage & validate XML sitemaps", href: "/sitemaps", icon: <SearchIcon className="h-5 w-5 text-primary" /> },
              { label: "URL Inspection", desc: "Live inspect any URL for SEO data", href: "/url-inspection", icon: <ExternalLinkIcon className="h-5 w-5 text-primary" /> },
              { label: "Performance", desc: "Core Web Vitals & PageSpeed", href: "/performance", icon: <ZapIcon className="h-5 w-5 text-primary" /> },
              { label: "Schema Markup", desc: "Structured data management", href: "/schema-markup", icon: <FileTextIcon className="h-5 w-5 text-primary" /> },
              { label: "Site Audit", desc: "Full crawl and issue detection", href: "/audit", icon: <ShieldCheckIcon className="h-5 w-5 text-primary" /> },
              { label: "Pages Explorer", desc: "Browse all crawled pages", href: "/pages", icon: <FileTextIcon className="h-5 w-5 text-primary" /> },
            ].map((item) => (
              <Link key={item.href} to={item.href} className="rounded-xl border bg-card p-4 hover:bg-accent transition-colors group cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">{item.icon}</div>
                  <div>
                    <p className="text-sm font-medium group-hover:text-primary transition-colors">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Expandable check row ──────────────────────────────────────────────────────

function ExpandableCheckRow({
  check,
  projectId,
}: {
  check: CheckConfig;
  projectId: Id<"projects">;
}) {
  const [expanded, setExpanded] = useState(false);
  const isOk = check.count === 0;

  const affectedPages = useQuery(
    api.technical_seo.queries.getCheckAffectedPages,
    expanded && !isOk ? { projectId, checkType: check.id } : "skip"
  );

  const severityColors = {
    critical: isOk ? "" : "border-red-200 dark:border-red-900/50",
    warning: isOk ? "" : "border-amber-200 dark:border-amber-900/50",
    info: isOk ? "" : "border-blue-200 dark:border-blue-900/50",
  };

  const severityIconColors = {
    critical: isOk ? "text-green-600 dark:text-green-400" : "text-red-500",
    warning: isOk ? "text-green-600 dark:text-green-400" : "text-amber-500",
    info: isOk ? "text-green-600 dark:text-green-400" : "text-blue-500",
  };

  const badgeColors = {
    critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200",
    warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200",
    info: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200",
  };

  return (
    <div className={`rounded-lg border bg-card transition-colors ${!isOk ? severityColors[check.severity] : ""}`}>
      {/* Header row */}
      <button
        onClick={() => !isOk && setExpanded((v) => !v)}
        className={`w-full flex items-center justify-between px-4 py-3 text-left ${!isOk ? "cursor-pointer hover:bg-muted/30" : "cursor-default"} transition-colors`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={severityIconColors[check.severity]}>{check.icon}</span>
          <span className="text-sm font-medium">{check.label}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          {isOk ? (
            <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100 border-green-200">
              <CheckCircleIcon className="h-3 w-3 mr-1" />Clean
            </Badge>
          ) : (
            <>
              <Badge className={`text-xs border ${badgeColors[check.severity]}`}>
                {check.count} page{check.count !== 1 ? "s" : ""} affected
              </Badge>
              <span className="text-muted-foreground">
                {expanded ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
              </span>
            </>
          )}
        </div>
      </button>

      {/* Expanded detail panel */}
      {expanded && !isOk && (
        <div className="border-t px-4 pb-4 pt-3 space-y-4">

          {/* Why + How to fix */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-md bg-muted/50 px-3 py-2.5 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Why it matters</p>
              <p className="text-xs leading-relaxed text-foreground/80">{check.why}</p>
            </div>
            <div className="rounded-md bg-primary/5 border border-primary/10 px-3 py-2.5 space-y-1">
              <p className="text-xs font-semibold text-primary/70 uppercase tracking-wide">How to fix</p>
              <p className="text-xs leading-relaxed text-foreground/80">{check.howToFix}</p>
            </div>
          </div>

          {/* Affected pages list */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Affected pages {affectedPages ? `(${affectedPages.length}${affectedPages.length === 50 ? "+" : ""})` : ""}
            </p>

            {affectedPages === undefined ? (
              <div className="space-y-1.5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-md" />
                ))}
              </div>
            ) : affectedPages.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No affected pages found.</p>
            ) : (
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {affectedPages.map((page, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-1 rounded-md border bg-background px-3 py-2 text-xs">
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <ChevronRightIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        {page.title && (
                          <p className="font-medium truncate text-foreground/90">{page.title}</p>
                        )}
                        <a
                          href={page.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline truncate block font-mono text-[10px]"
                        >
                          {page.url}
                          <ExternalLinkIcon className="h-2.5 w-2.5 inline ml-1 shrink-0" />
                        </a>
                      </div>
                    </div>
                    <span className="shrink-0 text-muted-foreground text-[11px] sm:text-right sm:max-w-[45%] truncate pl-5 sm:pl-0">
                      {page.detail}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color, icon }: {
  label: string; value: string; color: string; icon: React.ReactNode;
}) {
  const colors: Record<string, string> = {
    green: "text-green-600 dark:text-green-400",
    red: "text-red-500",
    amber: "text-amber-600",
    blue: "text-blue-600 dark:text-blue-400",
    muted: "text-muted-foreground",
  };
  return (
    <div className="rounded-xl border bg-card p-4 space-y-2">
      <div className="flex items-center gap-1.5 text-muted-foreground">{icon}<span className="text-xs font-medium">{label}</span></div>
      <div className={`text-2xl font-bold ${colors[color] ?? colors.muted}`}>{value}</div>
    </div>
  );
}
