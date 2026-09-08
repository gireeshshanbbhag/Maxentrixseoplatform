import { useState } from "react";
import { usePaginatedQuery, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useCurrentProject } from "@/hooks/use-current-project.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select.tsx";
import {
  FileTextIcon, SearchIcon, ExternalLinkIcon, AlertTriangleIcon,
  CheckCircleIcon, XCircleIcon, GitBranchIcon, ImageIcon,
} from "lucide-react";
import {
  Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent,
} from "@/components/ui/empty.tsx";
import { Link } from "react-router-dom";
import { useDebounce } from "@/hooks/use-debounce.ts";

export default function PagesPage() {
  return (
    <>
      <AuthLoading><div className="p-8"><Skeleton className="h-64 w-full" /></div></AuthLoading>
      <Unauthenticated><div className="flex justify-center p-8"><SignInButton /></div></Unauthenticated>
      <Authenticated><PagesContent /></Authenticated>
    </>
  );
}

function PagesContent() {
  const { activeProjectId } = useCurrentProject();
  const projects = useQuery(api.projects.list, {});
  const project = projects?.find((p) => p._id === activeProjectId);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [debouncedSearch] = useDebounce(search, 300);

  const { results, status, loadMore } = usePaginatedQuery(
    api.technical_seo.queries.getLatestAuditPages,
    activeProjectId ? {
      projectId: activeProjectId,
      statusFilter: statusFilter !== "all" ? statusFilter : undefined,
      searchQuery: debouncedSearch || undefined,
    } : "skip",
    { initialNumItems: 50 }
  );

  if (!activeProjectId || !project) {
    return (
      <div className="p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><FileTextIcon /></EmptyMedia>
            <EmptyTitle>No project selected</EmptyTitle>
            <EmptyDescription>Select a project to browse crawled pages</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <FileTextIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Pages</h1>
              <p className="text-sm text-muted-foreground">All pages discovered in the latest audit crawl</p>
            </div>
          </div>
          <Button asChild size="sm" variant="secondary">
            <Link to="/audit">Run New Audit</Link>
          </Button>
        </div>
      </div>

      <div className="p-4 border-b flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by URL or title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All pages</SelectItem>
            <SelectItem value="crawled">Crawled</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="skipped">Skipped</SelectItem>
          </SelectContent>
        </Select>
        {results.length > 0 && (
          <span className="text-xs text-muted-foreground">{results.length} pages shown</span>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {status === "LoadingFirstPage" ? (
          <div className="p-6 space-y-2">
            {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : results.length === 0 ? (
          <div className="p-6">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><FileTextIcon /></EmptyMedia>
                <EmptyTitle>{search || statusFilter !== "all" ? "No pages match your filters" : "No pages found"}</EmptyTitle>
                <EmptyDescription>
                  {search || statusFilter !== "all"
                    ? "Try adjusting your search or filter"
                    : "Run a site audit first to discover pages"}
                </EmptyDescription>
              </EmptyHeader>
              {!search && statusFilter === "all" && (
                <EmptyContent>
                  <Button asChild size="sm"><Link to="/audit">Run Site Audit</Link></Button>
                </EmptyContent>
              )}
            </Empty>
          </div>
        ) : (
          <div className="divide-y">
            {results.map((page) => (
              <PageRow key={page._id} page={page} projectUrl={project.websiteUrl} />
            ))}
          </div>
        )}
        {status === "CanLoadMore" && (
          <div className="p-4 flex justify-center">
            <Button variant="secondary" size="sm" onClick={() => loadMore(50)}>Load more pages</Button>
          </div>
        )}
      </div>
    </div>
  );
}

type AuditPage = {
  _id: string;
  url: string;
  statusCode?: number;
  title?: string;
  metaDescription?: string;
  h1Text?: string;
  h1Count?: number;
  wordCount?: number;
  loadTimeMs?: number;
  imagesWithoutAlt?: number;
  internalLinksCount?: number;
  externalLinksCount?: number;
  canonical?: string;
  robotsDirective?: string;
  hasSchemaMarkup?: boolean;
  issueCount?: number;
  crawlStatus: string;
  depth: number;
  crawledAt?: string;
};

function PageRow({ page, projectUrl }: { page: AuditPage; projectUrl: string }) {
  const [expanded, setExpanded] = useState(false);

  const statusColor = page.statusCode
    ? page.statusCode >= 400 ? "text-red-500"
    : page.statusCode >= 300 ? "text-amber-600"
    : "text-green-600"
    : "text-muted-foreground";

  const issues: string[] = [];
  if (!page.title) issues.push("No title");
  if (!page.metaDescription) issues.push("No meta description");
  if (!page.h1Count || page.h1Count === 0) issues.push("No H1");
  if ((page.imagesWithoutAlt ?? 0) > 0) issues.push(`${page.imagesWithoutAlt} images missing alt`);
  if (page.loadTimeMs && page.loadTimeMs > 3000) issues.push(`Slow (${(page.loadTimeMs / 1000).toFixed(1)}s)`);
  if (page.canonical && page.canonical !== page.url) issues.push("Non-self canonical");

  const displayUrl = page.url.replace(projectUrl.replace(/\/$/, ""), "") || "/";

  return (
    <div className="px-4 py-3 hover:bg-accent/30 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-mono font-bold ${statusColor}`}>
              {page.statusCode ?? "—"}
            </span>
            <span className="text-xs text-muted-foreground">d{page.depth}</span>
            <span className="text-sm font-medium truncate">{displayUrl.length > 60 ? "…" + displayUrl.slice(-57) : displayUrl}</span>
            {issues.length > 0 && (
              <span className="text-xs text-amber-600 flex items-center gap-1">
                <AlertTriangleIcon className="h-3 w-3" />{issues.length} issue(s)
              </span>
            )}
          </div>
          {page.title && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{page.title}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a href={page.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
            <ExternalLinkIcon className="h-3.5 w-3.5" />
          </a>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-primary hover:underline cursor-pointer"
          >
            {expanded ? "Less" : "Details"}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <Detail label="Title" value={page.title ?? "—"} missing={!page.title} />
          <Detail label="Meta Description" value={page.metaDescription ? page.metaDescription.slice(0, 80) + "…" : "—"} missing={!page.metaDescription} />
          <Detail label="H1" value={page.h1Text ?? (page.h1Count === 0 ? "Missing" : "—")} missing={!page.h1Text && page.h1Count === 0} />
          <Detail label="Word Count" value={page.wordCount ? `${page.wordCount} words` : "—"} />
          <Detail label="Load Time" value={page.loadTimeMs ? `${page.loadTimeMs}ms` : "—"} missing={page.loadTimeMs !== undefined && page.loadTimeMs > 3000} />
          <Detail label="Internal Links" value={String(page.internalLinksCount ?? 0)} />
          <Detail label="External Links" value={String(page.externalLinksCount ?? 0)} />
          <Detail label="Images w/o Alt" value={String(page.imagesWithoutAlt ?? 0)} missing={(page.imagesWithoutAlt ?? 0) > 0} />
          <Detail label="Canonical" value={page.canonical ? (page.canonical === page.url ? "Self" : "Non-self") : "Missing"} missing={!page.canonical || page.canonical !== page.url} />
          <Detail label="Robots" value={page.robotsDirective ?? "index, follow"} />
          <Detail label="Schema" value={page.hasSchemaMarkup ? "Yes" : "No"} />
          <Detail label="Crawl Status" value={page.crawlStatus} />
          {issues.length > 0 && (
            <div className="col-span-2 md:col-span-4">
              <span className="text-muted-foreground">Issues: </span>
              {issues.map(i => <Badge key={i} variant="secondary" className="mr-1 text-[10px]">{i}</Badge>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Detail({ label, value, missing }: { label: string; value: string; missing?: boolean }) {
  return (
    <div className="bg-muted/40 rounded p-2">
      <div className="text-muted-foreground mb-0.5">{label}</div>
      <div className={`font-medium truncate ${missing ? "text-amber-600" : ""}`}>{value}</div>
    </div>
  );
}
