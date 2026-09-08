import { useState, useEffect } from "react";
import { useQuery, useAction } from "convex/react";
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select.tsx";
import {
  LinkIcon, RefreshCwIcon, SparklesIcon, ExternalLinkIcon, CopyIcon,
  CheckCircleIcon, AlertTriangleIcon, PlugIcon, ArrowRightIcon, LightbulbIcon,
  CodeIcon, ChevronDownIcon, ChevronUpIcon, ArrowLeftIcon, PlusCircleIcon,
  CheckIcon, Loader2Icon, XCircleIcon,
} from "lucide-react";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";

type InternalLinkSuggestion = {
  targetUrl: string;
  targetTitle: string;
  anchorText: string;
  reason: string;
  priority: "high" | "medium" | "low";
  insertionHint: string;
};

// Per-suggestion injection state
type InjectState = "idle" | "loading" | "done" | "error";
type InjectMap = Record<number, { state: InjectState; message?: string }>;

type CmsPost = {
  id: string | number;
  title: string;
  url: string;
  type: string;
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-primary/10 text-primary",
  medium: "bg-muted text-muted-foreground",
  low: "bg-muted/60 text-muted-foreground",
};

const PLATFORM_INSTRUCTIONS: Record<string, { title: string; steps: string[] }> = {
  wordpress: {
    title: "WordPress Block Editor",
    steps: [
      "Open the post/page in your WordPress admin",
      "Find the sentence or phrase you want to make a link",
      "Select the anchor text",
      "Press Ctrl+K (Windows) or ⌘+K (Mac) to insert a link",
      "Paste the target URL and press Enter",
    ],
  },
  webflow: {
    title: "Webflow Designer",
    steps: [
      "Open the page in Webflow Designer",
      "Click the Rich Text block containing your content",
      "Double-click to edit, then select the anchor text",
      "Click the Link icon in the formatting toolbar",
      "Choose 'URL' and paste the target URL",
    ],
  },
  wix: {
    title: "Wix Editor",
    steps: [
      "Open the page in Wix Editor",
      "Click the text element containing your content",
      "Select the anchor text you want to link",
      "Click the Link icon in the text formatting bar",
      "Choose 'Web address', paste the URL, and click Done",
    ],
  },
  hercules: {
    title: "Hercules App Builder",
    steps: [
      "Open the page in the Hercules App Builder",
      "Select the text component where you want to add the link",
      "In the code editor, wrap the anchor text: <a href='TARGET_URL'>anchor text</a>",
      "Or use the visual editor if your component supports rich text",
      "Save and publish the change",
    ],
  },
  custom: {
    title: "Custom HTML",
    steps: [
      "Find the anchor text in your HTML/template file",
      "Wrap it with an anchor tag: <a href='TARGET_URL'>anchor text</a>",
      "Add a descriptive title attribute: title='PAGE_TITLE'",
      "Commit and deploy the change",
    ],
  },
};

export default function InternalLinksPage() {
  return (
    <>
      <AuthLoading><div className="p-8"><Skeleton className="h-64 w-full" /></div></AuthLoading>
      <Unauthenticated><div className="flex justify-center p-8"><SignInButton /></div></Unauthenticated>
      <Authenticated><InternalLinksContent /></Authenticated>
    </>
  );
}

function InternalLinksContent() {
  const { activeProjectId } = useCurrentProject();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const cameFromContent = !!searchParams.get("url");
  const connections = useQuery(api.cms.queries.listConnections, activeProjectId ? { projectId: activeProjectId } : "skip");
  const auditPages = useQuery(api.technical_seo.queries.getAuditPagesFlat, activeProjectId ? { projectId: activeProjectId, limit: 200 } : "skip");
  const projects = useQuery(api.projects.list, {});
  const project = projects?.find((p) => p._id === activeProjectId);

  const [selectedPlatform, setSelectedPlatform] = useState("custom");
  const [sourceUrl, setSourceUrl] = useState(searchParams.get("url") ?? "");
  const [sourceTitle, setSourceTitle] = useState(searchParams.get("title") ?? "");
  const [sourceContent, setSourceContent] = useState("");
  const [generating, setGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<InternalLinkSuggestion[]>([]);
  const [summary, setSummary] = useState("");
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [fetchedContent, setFetchedContent] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState("all");

  const generateLinks = useAction(api.cms.actions.generateInternalLinks);
  const listWpContent = useAction(api.cms.actions.listWordPressContent);
  const listWebflowPages = useAction(api.cms.actions.listWebflowPages);
  const listWixPages = useAction(api.cms.actions.listWixPages);
  const injectWordPressLink = useAction(api.cms.actions.injectWordPressLink);

  // Per-suggestion injection state (index → state)
  const [injectMap, setInjectMap] = useState<InjectMap>({});

  // If URL from query params, auto-detect platform from connections
  useEffect(() => {
    if (connections && connections.length > 0) {
      setSelectedPlatform(connections[0].platform);
    }
  }, [connections]);

  // Auto-generate if URL came from CMS content page
  useEffect(() => {
    const urlParam = searchParams.get("url");
    if (urlParam && auditPages) {
      void handleGenerate(urlParam, searchParams.get("title") ?? urlParam);
    }
  }, [auditPages]);

  async function buildAllPagesContext() {
    // 1. Use audit pages as primary source (most complete)
    if (auditPages && auditPages.length > 0) {
      return auditPages.map((p) => ({ url: p.url, title: p.title ?? p.url, type: "page" }));
    }

    // 2. Try connected CMS
    const activeConn = connections?.find((c) => c.platform === selectedPlatform);
    if (!activeConn) return [];

    try {
      if (activeConn.platform === "wordpress") {
        const [posts, pages] = await Promise.all([
          listWpContent({ siteUrl: activeConn.siteUrl, credentials: activeConn.credentials, type: "posts", perPage: 50, page: 1 }),
          listWpContent({ siteUrl: activeConn.siteUrl, credentials: activeConn.credentials, type: "pages", perPage: 50, page: 1 }),
        ]);
        return [
          ...posts.items.map((i) => ({ url: i.url, title: i.title, type: i.type })),
          ...pages.items.map((i) => ({ url: i.url, title: i.title, type: i.type })),
        ];
      } else if (activeConn.platform === "webflow") {
        const creds = JSON.parse(activeConn.credentials) as { token: string; siteId: string };
        const result = await listWebflowPages({ apiToken: creds.token, siteId: creds.siteId });
        return result.items.map((i) => ({ url: i.url, title: i.title, type: i.type }));
      } else if (activeConn.platform === "wix") {
        const creds = JSON.parse(activeConn.credentials) as { token: string; siteId: string };
        const result = await listWixPages({ apiKey: creds.token, siteId: creds.siteId });
        return result.items.map((i) => ({ url: i.url, title: i.title, type: i.type }));
      }
    } catch { /* fallback */ }

    // 3. Fallback: use project website URL to make a rough list
    return project ? [{ url: project.websiteUrl, title: project.name, type: "page" }] : [];
  }

  async function handleGenerate(url?: string, title?: string) {
    const targetUrl = url ?? sourceUrl.trim();
    const targetTitle = title ?? sourceTitle.trim();
    if (!targetUrl) { toast.error("Enter a source URL"); return; }
    if (!activeProjectId) return;

    setGenerating(true);
    setSuggestions([]);
    resetInjectMap();
    setFetchedContent(false);

    try {
      const allPages = await buildAllPagesContext();
      // Pass WP credentials so the backend can fetch real page content
      const activeConn = connections?.find((c) => c.platform === selectedPlatform);
      const result = await generateLinks({
        projectId: activeProjectId,
        sourceUrl: targetUrl,
        sourceTitle: targetTitle || targetUrl,
        sourceContent: sourceContent || undefined,
        platform: selectedPlatform,
        allPagesContext: allPages,
        wpSiteUrl: activeConn?.platform === "wordpress" ? activeConn.siteUrl : undefined,
        wpCredentials: activeConn?.platform === "wordpress" ? activeConn.credentials : undefined,
      });
      setSuggestions(result.suggestions ?? []);
      setSummary(result.summary ?? "");
      setFetchedContent(result.fetchedContent ?? false);
    } catch (e) {
      const msg = e instanceof ConvexError ? (e.data as { message: string }).message : "Generation failed";
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  }

  if (!activeProjectId) {
    return (
      <div className="p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><LinkIcon /></EmptyMedia>
            <EmptyTitle>No project selected</EmptyTitle>
            <EmptyDescription>Select a project to generate internal link suggestions</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const connectedPlatforms = connections?.map((c) => c.platform) ?? [];

  const filteredSuggestions = priorityFilter === "all"
    ? suggestions
    : suggestions.filter((s) => s.priority === priorityFilter);

  // Clear injection state when new suggestions are generated
  function resetInjectMap() { setInjectMap({}); }

  // WordPress: inject directly. Other platforms: copy HTML to clipboard.
  async function handleAddLink(s: InternalLinkSuggestion, index: number) {
    const activeConn = connections?.find((c) => c.platform === selectedPlatform);

    if (selectedPlatform === "wordpress" && activeConn) {
      setInjectMap((prev) => ({ ...prev, [index]: { state: "loading" } }));
      try {
        const result = await injectWordPressLink({
          siteUrl: activeConn.siteUrl,
          credentials: activeConn.credentials,
          sourcePageUrl: sourceUrl,
          anchorText: s.anchorText,
          targetUrl: s.targetUrl,
          targetTitle: s.targetTitle,
        });
        if (result.success) {
          setInjectMap((prev) => ({ ...prev, [index]: { state: "done", message: result.message } }));
          toast.success(`Link added to WordPress — "${s.anchorText}" now links to the target page`);
        } else {
          setInjectMap((prev) => ({ ...prev, [index]: { state: "error", message: result.message } }));
          toast.error(result.message);
        }
      } catch (e) {
        const msg = e instanceof ConvexError ? (e.data as { message: string }).message : "Failed to inject link";
        setInjectMap((prev) => ({ ...prev, [index]: { state: "error", message: msg } }));
        toast.error(msg);
      }
    } else {
      // Non-WordPress or no connection: fallback to clipboard copy
      const html = `<a href="${s.targetUrl}" title="${s.targetTitle}">${s.anchorText}</a>`;
      void navigator.clipboard.writeText(html);
      toast.success("Link HTML copied — paste it into your editor where you want the link");
    }
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="border-b px-6 py-4">
        <div className="flex items-center gap-3">
          {cameFromContent && (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 cursor-pointer"
              onClick={() => navigate("/cms/content")}
            >
              <ArrowLeftIcon className="h-4 w-4" />
            </Button>
          )}
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <LinkIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Internal Linking Engine</h1>
            <p className="text-sm text-muted-foreground">AI-generated internal link suggestions for any post or page — with platform-specific insertion guides</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5 max-w-4xl">

        {/* Setup panel */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <SparklesIcon className="h-4 w-4 text-primary" />Analyze a Page
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Source Page URL</Label>
              <Input
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://yourblog.com/post-title"
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Page Title (optional)</Label>
              <Input
                value={sourceTitle}
                onChange={(e) => setSourceTitle(e.target.value)}
                placeholder="My Blog Post Title"
              />
            </div>
          </div>

          {/* Content excerpt — only shown when NOT WordPress (WP fetches automatically) */}
          {selectedPlatform !== "wordpress" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Page Content (paste your content — AI finds linkable phrases in it)</Label>
              <textarea
                className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                rows={4}
                value={sourceContent}
                onChange={(e) => setSourceContent(e.target.value)}
                placeholder="Paste your full page/post content here. AI will read it and find exact phrases that can become internal links…"
              />
            </div>
          )}

          {/* WordPress: show that content will be fetched automatically */}
          {selectedPlatform === "wordpress" && connections?.find((c) => c.platform === "wordpress") && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground p-3 rounded-lg bg-muted/40 border">
              <CheckCircleIcon className="h-3.5 w-3.5 text-green-600 shrink-0" />
              <span>WordPress content will be fetched automatically from your connected site — AI reads the real post text to find exact linkable phrases.</span>
            </div>
          )}

          <div className="flex items-end gap-3 flex-wrap">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Platform</Label>
              <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {connectedPlatforms.map((p) => (
                    <SelectItem key={p} value={p}>
                      {({ wordpress: "WordPress ✓", webflow: "Webflow ✓", wix: "Wix ✓", hercules: "Hercules ✓" } as Record<string, string>)[p] ?? p}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom / HTML</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => handleGenerate()} disabled={generating || !sourceUrl.trim()}>
              {generating
                ? <><RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />Analyzing content…</>
                : <><SparklesIcon className="h-4 w-4 mr-2" />Find Link Opportunities</>
              }
            </Button>
            {connectedPlatforms.length === 0 && (
              <Link to="/cms/connections">
                <Button variant="secondary" size="sm">
                  <PlugIcon className="h-3.5 w-3.5 mr-1.5" />Connect a CMS
                </Button>
              </Link>
            )}
          </div>

          {/* Source context info */}
          {auditPages && auditPages.length > 0 && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <CheckCircleIcon className="h-3.5 w-3.5 text-green-600" />
              Using {auditPages.length} crawled pages from your last site audit as link targets
            </p>
          )}
        </div>

        {/* Content fetched indicator */}
        {fetchedContent && suggestions.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
            <CheckCircleIcon className="h-3.5 w-3.5 shrink-0" />
            <span>Actual post content fetched from WordPress — all anchor texts below are exact phrases found in your content, ready to inject with one click.</span>
          </div>
        )}

        {/* AI summary */}
        {summary && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-2">
            <LightbulbIcon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-sm">{summary}</p>
          </div>
        )}

        {/* Stats + filters */}
        {suggestions.length > 0 && (
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex gap-3">
              {(["all", "high", "medium", "low"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriorityFilter(p)}
                  className={`text-xs px-3 py-1 rounded-full border cursor-pointer transition-colors capitalize ${priorityFilter === p ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}
                >
                  {p === "all" ? `All (${suggestions.length})` : `${p} (${suggestions.filter((s) => s.priority === p).length})`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Suggestions list */}
        {generating && (
          <div className="space-y-2">
            {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        )}

        {!generating && filteredSuggestions.length > 0 && (
          <div className="space-y-3">
            {filteredSuggestions.map((s, i) => {
              // Find the original index in full suggestions array (for injectMap)
              const originalIdx = suggestions.indexOf(s);
              return (
                <SuggestionCard
                  key={i}
                  suggestion={s}
                  index={originalIdx}
                  expanded={expandedIdx === originalIdx}
                  onToggle={() => setExpandedIdx(expandedIdx === originalIdx ? null : originalIdx)}
                  onAddLink={() => handleAddLink(s, originalIdx)}
                  platform={selectedPlatform}
                  injectState={injectMap[originalIdx]?.state ?? "idle"}
                  injectMessage={injectMap[originalIdx]?.message}
                />
              );
            })}
          </div>
        )}

        {!generating && suggestions.length === 0 && (
          <div className="rounded-xl border border-dashed p-10 text-center">
            <LinkIcon className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground text-sm">Enter a source page URL and click "Generate Link Suggestions"</p>
            <p className="text-xs text-muted-foreground mt-1">Works with any URL — connects to your CMS pages and site audit data for best results</p>
          </div>
        )}

      </div>
    </div>
  );
}

function SuggestionCard({
  suggestion, index, expanded, onToggle, onAddLink, platform, injectState, injectMessage,
}: {
  suggestion: InternalLinkSuggestion;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onAddLink: () => void;
  platform: string;
  injectState: InjectState;
  injectMessage?: string;
}) {
  const htmlSnippet = `<a href="${suggestion.targetUrl}" title="${suggestion.targetTitle}">${suggestion.anchorText}</a>`;
  const isWordPress = platform === "wordpress";
  const isDone = injectState === "done";
  const isLoading = injectState === "loading";
  const isError = injectState === "error";

  return (
    <div className={`rounded-xl border bg-card overflow-hidden transition-all ${expanded ? "ring-2 ring-primary/20" : ""} ${isDone ? "ring-2 ring-emerald-500/30 border-emerald-200 dark:border-emerald-800" : ""}`}>
      <div
        className="px-4 py-3 flex items-start gap-3 cursor-pointer hover:bg-accent/20 transition-colors"
        onClick={onToggle}
      >
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize mt-0.5 shrink-0 ${PRIORITY_COLORS[suggestion.priority]}`}>
          {suggestion.priority}
        </span>
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">"{suggestion.anchorText}"</span>
            <ArrowRightIcon className="h-3 w-3 text-muted-foreground shrink-0" />
            <a
              href={suggestion.targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              {suggestion.targetTitle} <ExternalLinkIcon className="h-3 w-3 shrink-0" />
            </a>
          </div>
          <p className="text-xs text-muted-foreground">{suggestion.reason}</p>
          {/* Inline status message */}
          {isDone && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
              <CheckIcon className="h-3 w-3" />Link injected into WordPress
            </p>
          )}
          {isError && injectMessage && (
            <p className="text-xs text-destructive flex items-center gap-1 mt-0.5">
              <XCircleIcon className="h-3 w-3" />{injectMessage}
            </p>
          )}
        </div>
        <div className="flex gap-1.5 shrink-0">
          {isDone ? (
            <span className="h-7 px-2.5 flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-md">
              <CheckIcon className="h-3 w-3" />Added
            </span>
          ) : (
            <Button
              size="sm"
              variant={isWordPress ? "default" : "secondary"}
              className="h-7 text-xs"
              disabled={isLoading}
              onClick={(e) => { e.stopPropagation(); onAddLink(); }}
            >
              {isLoading ? (
                <><Loader2Icon className="h-3 w-3 mr-1 animate-spin" />Adding…</>
              ) : isWordPress ? (
                <><PlusCircleIcon className="h-3 w-3 mr-1" />Add Link</>
              ) : (
                <><CopyIcon className="h-3 w-3 mr-1" />Copy HTML</>
              )}
            </Button>
          )}
          {expanded ? <ChevronUpIcon className="h-4 w-4 text-muted-foreground self-center" /> : <ChevronDownIcon className="h-4 w-4 text-muted-foreground self-center" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t px-4 py-4 space-y-3 bg-muted/20">
          {/* WordPress inject status banner */}
          {isWordPress && isDone && (
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 p-3">
              <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircleIcon className="h-3.5 w-3.5" />Link successfully injected
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                "{suggestion.anchorText}" now links to {suggestion.targetUrl}. The change is live in your WordPress post.
              </p>
            </div>
          )}
          {isWordPress && isError && injectMessage && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-3">
              <p className="text-xs font-semibold text-red-800 dark:text-red-400 flex items-center gap-1.5">
                <XCircleIcon className="h-3.5 w-3.5" />Could not inject link automatically
              </p>
              <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">{injectMessage}</p>
              <p className="text-xs text-muted-foreground mt-1.5">Use the HTML snippet below to add it manually.</p>
            </div>
          )}

          {/* Insertion hint */}
          {!isDone && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-400 mb-1 flex items-center gap-1.5">
                <LightbulbIcon className="h-3.5 w-3.5" />Where to add this link
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">{suggestion.insertionHint}</p>
            </div>
          )}

          {/* HTML code snippet */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5">HTML code:</p>
            <div className="flex items-center gap-2 bg-background border rounded-lg px-3 py-2">
              <code className="text-xs font-mono text-foreground flex-1 break-all">{htmlSnippet}</code>
              <Button size="sm" variant="ghost" className="h-7 shrink-0" onClick={(e) => {
                e.stopPropagation();
                void navigator.clipboard.writeText(htmlSnippet);
                toast.success("HTML copied to clipboard");
              }}>
                <CopyIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Platform-specific tip — only show for non-WP or when auto-inject failed */}
          {(!isWordPress || isError) && platform !== "custom" && (
            <p className="text-xs text-muted-foreground flex items-start gap-1.5">
              <AlertTriangleIcon className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
              <span>
                {platform === "webflow" && "In Webflow: edit the rich-text element, select the anchor text, and use the Link icon in the toolbar."}
                {platform === "wix" && "In Wix Editor: click the text element, select the anchor text, and use the Link icon in the formatting bar."}
                {platform === "hercules" && "In Hercules App Builder: find the text component and wrap the anchor text with the HTML link tag shown above."}
              </span>
            </p>
          )}
          {isWordPress && !isDone && !isError && (
            <p className="text-xs text-muted-foreground flex items-start gap-1.5">
              <CheckCircleIcon className="h-3.5 w-3.5 text-green-600 shrink-0 mt-0.5" />
              <span>Click "Add Link" above to automatically inject this link into your WordPress post — no copying or pasting needed.</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
