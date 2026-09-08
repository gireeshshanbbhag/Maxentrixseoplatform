import { useState } from "react";
import { useAction, useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { SignInButton } from "@/components/ui/signin.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select.tsx";
import {
  SparklesIcon, NetworkIcon, RefreshCwIcon, PlusIcon, XIcon,
  CheckCircleIcon, AlertCircleIcon, PencilIcon,
  TrashIcon, ChevronDownIcon, ChevronRightIcon, LightbulbIcon, SaveIcon, GlobeIcon, InfoIcon,
  CircleDotIcon, LayoutIcon, FileTextIcon, SendIcon, ExternalLinkIcon,
  AlertTriangleIcon, ZapIcon, BookOpenIcon,
} from "lucide-react";
import { useCurrentProject } from "@/hooks/use-current-project.tsx";
import type { TopicCluster, GeneratedClusterPages } from "@/convex/advanced_seo/actions.ts";
import type { Id, Doc } from "@/convex/_generated/dataModel.d.ts";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import { useNavigate } from "react-router-dom";

type ClusterPage = {
  keyword: string;
  intent: string;
  pageUrl?: string;
  status: string;
  notes?: string;
};

type SavedCluster = Doc<"topicClusters">;

// ────────────────────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────────────────────

export default function TopicMapPage() {
  return (
    <>
      <AuthLoading><div className="p-8"><Skeleton className="h-64 w-full" /></div></AuthLoading>
      <Unauthenticated><div className="flex justify-center p-8"><SignInButton /></div></Unauthenticated>
      <Authenticated><TopicMapContent /></Authenticated>
    </>
  );
}

function TopicMapContent() {
  const { activeProjectId } = useCurrentProject();
  const projects = useQuery(api.projects.list, {});
  const project = projects?.find((p) => p._id === activeProjectId);

  if (!project) {
    return (
      <div className="p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><NetworkIcon /></EmptyMedia>
            <EmptyTitle>No project selected</EmptyTitle>
            <EmptyDescription>Select a project to build your topic map</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return <TopicMapMain projectId={project._id} project={project} />;
}

// ────────────────────────────────────────────────────────────────────────────
// Main layout — two panels: saved map (left) + AI suggestions (right)
// ────────────────────────────────────────────────────────────────────────────

type View = "map" | "add" | "edit";

function TopicMapMain({ projectId, project }: { projectId: Id<"projects">; project: Doc<"projects"> }) {
  const savedClusters = useQuery(api.topic_map.queries.listClusters, { projectId });
  const [view, setView] = useState<View>("map");
  const [editingCluster, setEditingCluster] = useState<SavedCluster | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<TopicCluster[] | null>(null);
  const [aiUngrouped, setAiUngrouped] = useState<string[]>([]);
  const [aiSummary, setAiSummary] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const generateTopicMap = useAction(api.advanced_seo.actions.generateTopicMap);
  const createCluster = useMutation(api.topic_map.mutations.createCluster);

  async function handleGenerate() {
    setAiLoading(true);
    try {
      const existingTopics = (savedClusters ?? []).map((c) => c.pillarTopic);
      const res = await generateTopicMap({ projectId, existingTopics });
      setAiSuggestions(res.clusters);
      setAiUngrouped(res.ungrouped);
      setAiSummary(res.summary);
    } catch (e) {
      toast.error(e instanceof ConvexError ? (e.data as { message: string }).message : "Failed to generate suggestions");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleAddSuggestion(cluster: TopicCluster) {
    try {
      await createCluster({
        projectId,
        pillarTopic: cluster.pillarTopic,
        pillarKeyword: cluster.pillarKeyword,
        description: cluster.description,
        clusterPages: cluster.clusterKeywords.map((kw) => ({
          keyword: kw.keyword,
          intent: kw.intent,
          status: kw.hasContent ? "published" : "missing",
        })),
      });
      // Remove from suggestions
      setAiSuggestions((prev) => prev?.filter((c) => c.pillarTopic !== cluster.pillarTopic) ?? null);
      toast.success(`"${cluster.pillarTopic}" added to your topic map`);
    } catch (e) {
      toast.error("Failed to add cluster");
    }
  }

  function handleEdit(cluster: SavedCluster) {
    setEditingCluster(cluster);
    setView("edit");
  }

  function handleClose() {
    setView("map");
    setEditingCluster(null);
  }

  const loading = savedClusters === undefined;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="border-b px-6 py-4 shrink-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <NetworkIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Topic Map</h1>
              <p className="text-sm text-muted-foreground">Build your pillar-cluster content strategy</p>
            </div>
            {!loading && savedClusters && savedClusters.length > 0 && (
              <Badge variant="secondary">{savedClusters.length} cluster{savedClusters.length !== 1 ? "s" : ""} saved</Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => { setEditingCluster(null); setView("add"); }} className="cursor-pointer">
              <PlusIcon className="h-4 w-4 mr-1.5" />Add Cluster
            </Button>
            <Button onClick={handleGenerate} disabled={aiLoading} className="cursor-pointer">
              {aiLoading ? <><RefreshCwIcon className="h-4 w-4 mr-1.5 animate-spin" />Analyzing…</> : <><SparklesIcon className="h-4 w-4 mr-1.5" />Get AI Suggestions</>}
            </Button>
          </div>
        </div>
      </div>

      {/* How it works banner — shown until user has saved clusters */}
      {!loading && savedClusters && savedClusters.length === 0 && view === "map" && (
        <HowItWorksBanner onAdd={() => setView("add")} onGenerate={handleGenerate} aiLoading={aiLoading} />
      )}

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        {view === "map" && (
          <div className="p-6 space-y-6 max-w-5xl">
            {/* Saved topic map */}
            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
              </div>
            ) : savedClusters && savedClusters.length > 0 ? (
              <SavedClustersSection
                clusters={savedClusters}
                onEdit={handleEdit}
                projectId={projectId}
                websiteContext={project?.businessDescription ?? project?.name}
              />
            ) : null}

            {/* AI Suggestions */}
            {aiLoading && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <SparklesIcon className="h-4 w-4 animate-pulse" />
                  AI is analyzing your keywords and finding new topic opportunities…
                </div>
                {[1,2,3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            )}

            {aiSuggestions && aiSuggestions.length > 0 && (
              <AiSuggestionsSection
                clusters={aiSuggestions}
                summary={aiSummary}
                ungrouped={aiUngrouped}
                onAdd={handleAddSuggestion}
                onRegenerate={handleGenerate}
                aiLoading={aiLoading}
                savedCount={savedClusters?.length ?? 0}
              />
            )}

            {aiSuggestions && aiSuggestions.length === 0 && !aiLoading && savedClusters && savedClusters.length > 0 && (
              <div className="rounded-xl border border-dashed p-6 text-center space-y-2">
                <CheckCircleIcon className="h-8 w-8 text-green-500 mx-auto" />
                <p className="text-sm font-medium">All suggested topics are already in your map</p>
                <p className="text-xs text-muted-foreground">Add more keywords to your project for new suggestions</p>
              </div>
            )}
          </div>
        )}

        {(view === "add" || view === "edit") && (
          <ClusterForm
            projectId={projectId}
            cluster={editingCluster}
            onClose={handleClose}
          />
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// How it works — shown to new users
// ────────────────────────────────────────────────────────────────────────────

function HowItWorksBanner({ onAdd, onGenerate, aiLoading }: {
  onAdd: () => void;
  onGenerate: () => void;
  aiLoading: boolean;
}) {
  const steps = [
    {
      icon: <BookOpenIcon className="h-5 w-5 text-primary" />,
      title: "What is a Topic Map?",
      desc: "A topic map organises your website content into pillars and clusters. Each pillar is a broad topic page (e.g. \"Email Marketing\") with supporting cluster pages covering subtopics (e.g. \"best email subject lines\", \"email automation tips\").",
    },
    {
      icon: <LayoutIcon className="h-5 w-5 text-primary" />,
      title: "Step 1 — Add your pillar topics",
      desc: "Click \"Add Cluster\" to create a pillar topic. Give it a name, the main keyword, and add the cluster pages you've written or plan to write. Set each page's status (Published, Draft, or Missing).",
    },
    {
      icon: <SparklesIcon className="h-5 w-5 text-primary" />,
      title: "Step 2 — Get AI suggestions",
      desc: "Click \"Get AI Suggestions\" and AI will analyse your tracked keywords to suggest new topic clusters you haven't covered yet. Existing topics are skipped — every suggestion is genuinely new.",
    },
    {
      icon: <CheckCircleIcon className="h-5 w-5 text-primary" />,
      title: "Step 3 — Save and act",
      desc: "Add AI suggestions to your map with one click. Fill in missing page URLs as you publish content. Missing pages are your content gaps — the highest-priority opportunities to improve your SEO.",
    },
  ];

  return (
    <div className="mx-6 mt-4 rounded-xl border bg-card p-6 space-y-5">
      <div className="flex items-center gap-2">
        <LightbulbIcon className="h-5 w-5 text-amber-500" />
        <h2 className="text-base font-semibold">How to use the Topic Map</h2>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
            <div className="shrink-0 mt-0.5 rounded-lg p-1.5 bg-primary/10">{step.icon}</div>
            <div>
              <p className="text-sm font-semibold">{step.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-3 pt-1">
        <Button onClick={onAdd} className="cursor-pointer">
          <PlusIcon className="h-4 w-4 mr-1.5" />Add your first cluster
        </Button>
        <Button variant="secondary" onClick={onGenerate} disabled={aiLoading} className="cursor-pointer">
          <SparklesIcon className="h-4 w-4 mr-1.5" />{aiLoading ? "Analyzing…" : "Or let AI suggest topics"}
        </Button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Saved clusters section
// ────────────────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  published: { label: "Published", color: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300", dot: "bg-green-500" },
  draft: { label: "Draft", color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300", dot: "bg-blue-500" },
  missing: { label: "Missing", color: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300", dot: "bg-amber-500" },
};

const INTENT_COLORS: Record<string, string> = {
  informational: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300",
  commercial: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
  transactional: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  navigational: "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300",
};

function SavedClustersSection({ clusters, onEdit, projectId, websiteContext }: {
  clusters: SavedCluster[];
  onEdit: (c: SavedCluster) => void;
  projectId: Id<"projects">;
  websiteContext?: string;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [generationResults, setGenerationResults] = useState<Record<string, GeneratedClusterPages>>({});
  const deleteCluster = useMutation(api.topic_map.mutations.deleteCluster);
  const generateClusterPages = useAction(api.advanced_seo.actions.generateClusterPages);
  const publishContentToCms = useAction(api.content.actions.publishContentToCms);
  const navigate = useNavigate();

  async function handleDelete(id: Id<"topicClusters">, name: string) {
    if (!confirm(`Delete "${name}"?`)) return;
    await deleteCluster({ id });
    toast.success("Cluster deleted");
  }

  async function handleGenerate(cluster: SavedCluster) {
    setGenerating(cluster._id);
    try {
      const result = await generateClusterPages({
        projectId,
        pillarTopic: cluster.pillarTopic,
        pillarKeyword: cluster.pillarKeyword,
        pillarDescription: cluster.description,
        clusterPages: cluster.clusterPages.map((p) => ({ keyword: p.keyword, intent: p.intent })),
        websiteContext: websiteContext ?? cluster.pillarTopic,
        wordCount: 1200,
      });
      setGenerationResults((prev) => ({ ...prev, [cluster._id]: result }));
      toast.success(result.summary);
    } catch (e) {
      const msg = e instanceof ConvexError ? (e.data as { message: string }).message : "Generation failed";
      toast.error(msg);
    } finally {
      setGenerating(null);
    }
  }

  async function handlePublishPage(title: string, content: string, status: "draft" | "publish") {
    try {
      const result = await publishContentToCms({ projectId, title, content, status });
      if (result.postUrl) {
        toast.success(status === "publish" ? `Published: ${title}` : `Saved draft: ${title}`);
      }
    } catch (e) {
      const msg = e instanceof ConvexError ? (e.data as { message: string }).message : "Publish failed";
      toast.error(msg);
    }
  }

  const activeClusters = clusters.filter((c) => c.status === "active");

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Your Topic Map</h2>
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">{activeClusters.length} pillar{activeClusters.length !== 1 ? "s" : ""}</span>
      </div>

      {activeClusters.map((cluster) => {
        const missing = cluster.clusterPages.filter((p) => p.status === "missing").length;
        const published = cluster.clusterPages.filter((p) => p.status === "published").length;
        const isOpen = expanded === cluster._id;
        const isGenerating = generating === cluster._id;
        const genResult = generationResults[cluster._id];

        return (
          <div key={cluster._id} className="rounded-xl border bg-card overflow-hidden">
            {/* Pillar header */}
            <button
              className="w-full flex items-center gap-3 px-5 py-4 hover:bg-accent/20 transition-colors cursor-pointer text-left"
              onClick={() => setExpanded(isOpen ? null : cluster._id)}
            >
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{cluster.pillarTopic}</span>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-mono">{cluster.pillarKeyword}</span>
                  {missing > 0 && (
                    <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">
                      {missing} missing page{missing !== 1 ? "s" : ""}
                    </span>
                  )}
                  <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">
                    {published}/{cluster.clusterPages.length} published
                  </span>
                  {genResult && (
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <FileTextIcon className="h-3 w-3" />{1 + genResult.clusterPages.length} pages generated
                    </span>
                  )}
                </div>
                {cluster.description && (
                  <p className="text-xs text-muted-foreground">{cluster.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(cluster); }}
                  className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                >
                  <PencilIcon className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); void handleDelete(cluster._id, cluster.pillarTopic); }}
                  className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
                {isOpen ? <ChevronDownIcon className="h-4 w-4 text-muted-foreground" /> : <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />}
              </div>
            </button>

            {/* Expanded cluster pages */}
            {isOpen && (
              <div className="border-t px-5 py-4 space-y-4">
                {/* Pillar page */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                  <CircleDotIcon className="h-3.5 w-3.5 text-primary" />
                  Pillar page
                  {cluster.pillarPageUrl ? (
                    <a href={cluster.pillarPageUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-0.5 ml-1">
                      {cluster.pillarPageUrl} <GlobeIcon className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-amber-600">— no URL set</span>
                  )}
                </div>

                {/* Cluster pages */}
                <div className="grid sm:grid-cols-2 gap-2">
                  {cluster.clusterPages.map((page, i) => {
                    const sc = STATUS_CONFIG[page.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.missing;
                    const ic = INTENT_COLORS[page.intent] ?? INTENT_COLORS.informational;
                    return (
                      <div key={i} className="flex items-start gap-2 rounded-lg border px-3 py-2.5 bg-background">
                        <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${sc.dot}`} />
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <p className="text-xs font-medium truncate">{page.keyword}</p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${sc.color}`}>{sc.label}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${ic}`}>{page.intent}</span>
                            {page.pageUrl && (
                              <a href={page.pageUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline truncate max-w-[120px]">
                                {page.pageUrl}
                              </a>
                            )}
                          </div>
                          {page.notes && <p className="text-[10px] text-muted-foreground italic">{page.notes}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {cluster.clusterPages.filter((p) => p.status === "missing").length > 0 && (
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 px-3 py-2 flex items-start gap-2">
                    <AlertCircleIcon className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      <strong>{cluster.clusterPages.filter((p) => p.status === "missing").length} missing pages</strong> — write these to complete your cluster and boost your topical authority for "{cluster.pillarTopic}"
                    </p>
                  </div>
                )}

                {/* Generate Pages CTA */}
                {!genResult && (
                  <div className="rounded-xl border-2 border-dashed border-primary/20 bg-primary/5 p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <SparklesIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold">Generate All Pages with AI</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          AI will write the pillar page + all {cluster.clusterPages.length} cluster pages (~1200 words each), check for cannibalization, score quality, and save everything as drafts. You review before publishing.
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => void handleGenerate(cluster)}
                      disabled={isGenerating}
                      className="cursor-pointer"
                    >
                      {isGenerating ? (
                        <><RefreshCwIcon className="h-3.5 w-3.5 mr-1.5 animate-spin" />Generating {1 + cluster.clusterPages.length} pages…</>
                      ) : (
                        <><SparklesIcon className="h-3.5 w-3.5 mr-1.5" />Generate {1 + cluster.clusterPages.length} pages as drafts</>
                      )}
                    </Button>
                    {isGenerating && (
                      <p className="text-xs text-muted-foreground">
                        Writing pillar page + cluster pages in parallel. Quality checks run automatically. This may take 60-90 seconds.
                      </p>
                    )}
                  </div>
                )}

                {/* Generation Results */}
                {genResult && (
                  <GenerationResultsPanel
                    result={genResult}
                    projectId={projectId}
                    onPublish={handlePublishPage}
                    onRegenerate={() => void handleGenerate(cluster)}
                    onOpenInWriter={() => navigate("/content")}
                    isRegenerating={isGenerating}
                  />
                )}

                <div className="flex justify-end pt-1 gap-2">
                  <Button size="sm" variant="secondary" onClick={() => onEdit(cluster)} className="cursor-pointer text-xs">
                    <PencilIcon className="h-3 w-3 mr-1" />Edit cluster
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Generation Results Panel — shown after bulk page generation
// ────────────────────────────────────────────────────────────────────────────

type QualityScores = { overall: number; eeat: number; peopleFirst: number; seo: number; readability: number; words: number };

function QualityMini({ scores }: { scores?: QualityScores }) {
  if (!scores) return null;
  const color = scores.overall >= 80 ? "text-green-600 dark:text-green-400" : scores.overall >= 60 ? "text-amber-600" : "text-red-500";
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className={`font-bold text-sm ${color}`}>{scores.overall}/100</span>
      {[["E-E-A-T", scores.eeat],["People-First", scores.peopleFirst],["SEO", scores.seo],["Readability", scores.readability],["Words", scores.words]].map(([l, v]) => (
        <span key={l as string} className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">
          {l}: {v}
        </span>
      ))}
    </div>
  );
}

function GenerationResultsPanel({
  result, projectId, onPublish, onRegenerate, onOpenInWriter, isRegenerating,
}: {
  result: GeneratedClusterPages;
  projectId: Id<"projects">;
  onPublish: (title: string, content: string, status: "draft" | "publish") => Promise<void>;
  onRegenerate: () => void;
  onOpenInWriter: () => void;
  isRegenerating: boolean;
}) {
  const [publishingIdx, setPublishingIdx] = useState<number | "pillar" | null>(null);

  async function pub(title: string, content: string, status: "draft" | "publish", idx: number | "pillar") {
    setPublishingIdx(idx);
    await onPublish(title, content, status);
    setPublishingIdx(null);
  }

  const cannibalizationCount = result.clusterPages.filter((p) => p.cannibalizes).length;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="rounded-xl border bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 p-4 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <CheckCircleIcon className="h-4 w-4 text-blue-600 shrink-0" />
          <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">{result.summary}</span>
        </div>
        {cannibalizationCount > 0 && (
          <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
            <AlertTriangleIcon className="h-3.5 w-3.5 shrink-0" />
            {cannibalizationCount} cannibalization warning{cannibalizationCount !== 1 ? "s" : ""} — review flagged pages before publishing
          </div>
        )}
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={onOpenInWriter} className="cursor-pointer h-7 text-xs">
            <ExternalLinkIcon className="h-3 w-3 mr-1" />Open Content Writer
          </Button>
          <Button size="sm" variant="ghost" onClick={onRegenerate} disabled={isRegenerating} className="cursor-pointer h-7 text-xs">
            <RefreshCwIcon className={`h-3 w-3 mr-1 ${isRegenerating ? "animate-spin" : ""}`} />Regenerate
          </Button>
        </div>
      </div>

      {/* Pillar page */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <CircleDotIcon className="h-3.5 w-3.5 text-primary" />Pillar Page
        </div>
        <div className="rounded-lg border bg-card p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{result.pillar.title}</p>
              <p className="text-xs text-muted-foreground">{result.pillar.wordCount.toLocaleString()} words · keyword: {result.pillar.keyword}</p>
            </div>
            <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full shrink-0">Draft</span>
          </div>
          <QualityMini scores={result.pillar.qualityScores} />
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" className="h-6 text-[10px] cursor-pointer" disabled={publishingIdx === "pillar"} onClick={() => void pub(result.pillar.title, result.pillar.content, "draft", "pillar")}>
              {publishingIdx === "pillar" ? <RefreshCwIcon className="h-3 w-3 animate-spin" /> : <SaveIcon className="h-3 w-3 mr-1" />}Save Draft to CMS
            </Button>
            <Button size="sm" className="h-6 text-[10px] cursor-pointer" disabled={publishingIdx === "pillar"} onClick={() => void pub(result.pillar.title, result.pillar.content, "publish", "pillar")}>
              {publishingIdx === "pillar" ? <RefreshCwIcon className="h-3 w-3 animate-spin" /> : <SendIcon className="h-3 w-3 mr-1" />}Publish
            </Button>
          </div>
        </div>
      </div>

      {/* Cluster pages */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <LayoutIcon className="h-3.5 w-3.5 text-primary" />Cluster Pages ({result.clusterPages.length})
        </div>
        {result.clusterPages.map((page, i) => (
          <div key={i} className={`rounded-lg border bg-card p-3 space-y-2 ${page.cannibalizes ? "border-amber-300 dark:border-amber-700" : ""}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm font-semibold truncate">{page.title}</p>
                  {page.cannibalizes && (
                    <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                      <AlertTriangleIcon className="h-2.5 w-2.5" />Cannibalization risk
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{page.wordCount.toLocaleString()} words · {page.intent} · {page.keyword}</p>
                {page.cannibalizationWarning && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">{page.cannibalizationWarning}</p>
                )}
              </div>
              <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full shrink-0">Draft</span>
            </div>
            <QualityMini scores={page.qualityScores} />
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" className="h-6 text-[10px] cursor-pointer" disabled={publishingIdx === i} onClick={() => void pub(page.title, page.content, "draft", i)}>
                {publishingIdx === i ? <RefreshCwIcon className="h-3 w-3 animate-spin" /> : <SaveIcon className="h-3 w-3 mr-1" />}Save Draft to CMS
              </Button>
              <Button size="sm" className="h-6 text-[10px] cursor-pointer" disabled={publishingIdx === i} onClick={() => void pub(page.title, page.content, "publish", i)}>
                {publishingIdx === i ? <RefreshCwIcon className="h-3 w-3 animate-spin" /> : <SendIcon className="h-3 w-3 mr-1" />}Publish
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// AI Suggestions section
// ────────────────────────────────────────────────────────────────────────────

function AiSuggestionsSection({
  clusters, summary, ungrouped, onAdd, onRegenerate, aiLoading, savedCount,
}: {
  clusters: TopicCluster[];
  summary: string;
  ungrouped: string[];
  onAdd: (c: TopicCluster) => void;
  onRegenerate: () => void;
  aiLoading: boolean;
  savedCount: number;
}) {
  const [adding, setAdding] = useState<string | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0);

  async function handleAdd(cluster: TopicCluster) {
    setAdding(cluster.pillarTopic);
    await onAdd(cluster);
    setAdding(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <SparklesIcon className="h-3.5 w-3.5 text-primary" />AI Suggestions — New Topics
        </h2>
        <div className="flex-1 h-px bg-border" />
        <Button size="sm" variant="ghost" onClick={onRegenerate} disabled={aiLoading} className="cursor-pointer text-xs">
          <RefreshCwIcon className={`h-3.5 w-3.5 mr-1 ${aiLoading ? "animate-spin" : ""}`} />Regenerate
        </Button>
      </div>

      {savedCount > 0 && (
        <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 flex items-center gap-2 text-xs text-primary">
          <InfoIcon className="h-3.5 w-3.5 shrink-0" />
          These are <strong>new topics only</strong> — AI skipped your {savedCount} existing cluster{savedCount !== 1 ? "s" : ""} to avoid duplicates.
        </div>
      )}

      {summary && <p className="text-sm text-muted-foreground">{summary}</p>}

      <div className="space-y-2">
        {clusters.map((cluster, i) => {
          const isOpen = expandedIdx === i;
          const missingCount = cluster.clusterKeywords.filter((k) => !k.hasContent).length;

          return (
            <div key={i} className="rounded-xl border-2 border-dashed border-primary/20 bg-primary/5 overflow-hidden">
              <button
                className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-primary/10 transition-colors cursor-pointer text-left"
                onClick={() => setExpandedIdx(isOpen ? null : i)}
              >
                <SparklesIcon className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{cluster.pillarTopic}</span>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-mono">{cluster.pillarKeyword}</span>
                    {missingCount > 0 && (
                      <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">
                        {missingCount} content gaps
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{cluster.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); void handleAdd(cluster); }}
                    disabled={adding === cluster.pillarTopic}
                    className="cursor-pointer h-7 text-xs"
                  >
                    {adding === cluster.pillarTopic ? (
                      <RefreshCwIcon className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <PlusIcon className="h-3 w-3 mr-1" />
                    )}
                    Add to map
                  </Button>
                  {isOpen ? <ChevronDownIcon className="h-4 w-4 text-muted-foreground" /> : <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />}
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-primary/20 px-5 py-3 grid sm:grid-cols-2 gap-1.5">
                  {cluster.clusterKeywords.map((kw, j) => {
                    const ic = INTENT_COLORS[kw.intent] ?? INTENT_COLORS.informational;
                    return (
                      <div key={j} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${kw.hasContent ? "bg-green-500/10" : "bg-amber-500/10"}`}>
                        <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${kw.hasContent ? "bg-green-500" : "bg-amber-500"}`} />
                        <span className="flex-1 min-w-0 truncate font-medium">{kw.keyword}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${ic}`}>{kw.intent}</span>
                        {!kw.hasContent && <span className="text-[10px] text-amber-600 dark:text-amber-400 shrink-0">gap</span>}
                        {kw.hasContent && <span className="text-[10px] text-green-600 dark:text-green-400 shrink-0">covered</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {ungrouped.length > 0 && (
        <div className="rounded-xl border p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <AlertCircleIcon className="h-3.5 w-3.5" />Ungrouped keywords ({ungrouped.length})
            <span className="font-normal">— these don't fit existing clusters; consider creating new pillar topics for them</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {ungrouped.map((kw, i) => (
              <span key={i} className="text-xs bg-muted px-2 py-1 rounded-full">{kw}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Cluster form (add / edit)
// ────────────────────────────────────────────────────────────────────────────

const INTENT_OPTIONS = ["informational", "commercial", "transactional", "navigational"];
const STATUS_OPTIONS = ["published", "draft", "missing"];

function ClusterForm({
  projectId, cluster, onClose,
}: {
  projectId: Id<"projects">;
  cluster: SavedCluster | null; // null = add mode
  onClose: () => void;
}) {
  const isEdit = cluster !== null;

  const [pillarTopic, setPillarTopic] = useState(cluster?.pillarTopic ?? "");
  const [pillarKeyword, setPillarKeyword] = useState(cluster?.pillarKeyword ?? "");
  const [description, setDescription] = useState(cluster?.description ?? "");
  const [pillarPageUrl, setPillarPageUrl] = useState(cluster?.pillarPageUrl ?? "");
  const [pages, setPages] = useState<ClusterPage[]>(cluster?.clusterPages ?? []);
  const [newKw, setNewKw] = useState("");
  const [newIntent, setNewIntent] = useState("informational");
  const [saving, setSaving] = useState(false);

  const createCluster = useMutation(api.topic_map.mutations.createCluster);
  const updateCluster = useMutation(api.topic_map.mutations.updateCluster);

  function addPage() {
    const kw = newKw.trim();
    if (!kw) return;
    setPages((prev) => [...prev, { keyword: kw, intent: newIntent, status: "missing" }]);
    setNewKw("");
  }

  function updatePage(i: number, field: keyof ClusterPage, val: string) {
    setPages((prev) => { const n = [...prev]; n[i] = { ...n[i], [field]: val }; return n; });
  }

  function removePage(i: number) {
    setPages((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    if (!pillarTopic.trim() || !pillarKeyword.trim()) {
      toast.error("Pillar topic and keyword are required");
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await updateCluster({
          id: cluster._id,
          pillarTopic: pillarTopic.trim(),
          pillarKeyword: pillarKeyword.trim(),
          description: description.trim() || undefined,
          pillarPageUrl: pillarPageUrl.trim() || undefined,
          clusterPages: pages,
        });
        toast.success("Cluster updated");
      } else {
        await createCluster({
          projectId,
          pillarTopic: pillarTopic.trim(),
          pillarKeyword: pillarKeyword.trim(),
          description: description.trim() || undefined,
          pillarPageUrl: pillarPageUrl.trim() || undefined,
          clusterPages: pages,
        });
        toast.success("Cluster added to your topic map");
      }
      onClose();
    } catch (e) {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl space-y-6">
      {/* Back */}
      <button onClick={onClose} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
        <ChevronRightIcon className="h-4 w-4 rotate-180" />{isEdit ? "Back to topic map" : "Back"}
      </button>

      <div>
        <h2 className="text-lg font-semibold">{isEdit ? `Edit: ${cluster.pillarTopic}` : "Add Pillar Cluster"}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          A cluster = one pillar page + multiple supporting pages. The pillar page ranks for the broad keyword; cluster pages cover subtopics and link back to it.
        </p>
      </div>

      {/* Pillar fields */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <CircleDotIcon className="h-4 w-4 text-primary" />Pillar Topic
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Topic Name <span className="text-destructive">*</span></Label>
            <Input value={pillarTopic} onChange={(e) => setPillarTopic(e.target.value)} placeholder="e.g. Email Marketing" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Pillar Keyword <span className="text-destructive">*</span></Label>
            <Input value={pillarKeyword} onChange={(e) => setPillarKeyword(e.target.value)} placeholder="e.g. email marketing software" className="font-mono text-xs" />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Pillar Page URL <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input value={pillarPageUrl} onChange={(e) => setPillarPageUrl(e.target.value)} placeholder="https://yourdomain.com/email-marketing" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this topic cluster is about" />
          </div>
        </div>
      </div>

      {/* Cluster pages */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <LayoutIcon className="h-4 w-4 text-primary" />Cluster Pages
            <Badge variant="secondary">{pages.length}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">Each cluster page targets a subtopic and links to your pillar</p>
        </div>

        {pages.length > 0 && (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {pages.map((page, i) => {
              const sc = STATUS_CONFIG[page.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.missing;
              return (
                <div key={i} className="rounded-lg border bg-background p-3 space-y-2">
                  <div className="grid grid-cols-[1fr_100px_110px_32px] gap-2 items-center">
                    <Input value={page.keyword} onChange={(e) => updatePage(i, "keyword", e.target.value)} className="h-7 text-xs font-mono" placeholder="keyword" />
                    <Select value={page.intent} onValueChange={(v) => updatePage(i, "intent", v)}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{INTENT_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={page.status} onValueChange={(v) => updatePage(i, "status", v)}>
                      <SelectTrigger className={`h-7 text-xs ${sc.color}`}><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUS_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                    <button onClick={() => removePage(i)} className="flex items-center justify-center h-7 w-7 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer transition-colors">
                      <XIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {(page.status === "published" || page.status === "draft") && (
                    <Input
                      value={page.pageUrl ?? ""}
                      onChange={(e) => updatePage(i, "pageUrl", e.target.value)}
                      className="h-7 text-xs"
                      placeholder="Page URL (optional)"
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {pages.length === 0 && (
          <div className="text-center py-6 text-xs text-muted-foreground border-2 border-dashed rounded-lg">
            No cluster pages yet — add supporting topics below
          </div>
        )}

        {/* Add row */}
        <div className="flex gap-2 items-center pt-1 border-t">
          <Input
            value={newKw}
            onChange={(e) => setNewKw(e.target.value)}
            placeholder="e.g. best email subject lines"
            className="flex-1 h-8 text-sm font-mono"
            onKeyDown={(e) => e.key === "Enter" && addPage()}
          />
          <Select value={newIntent} onValueChange={setNewIntent}>
            <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
            <SelectContent>{INTENT_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
          </Select>
          <Button size="sm" variant="secondary" onClick={addPage} className="cursor-pointer h-8">
            <PlusIcon className="h-3.5 w-3.5 mr-1" />Add page
          </Button>
        </div>

        <div className="bg-muted/30 rounded-lg px-3 py-2.5 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Status guide:</p>
          <ul className="space-y-0.5">
            <li><span className="text-green-600 font-medium">Published</span> — page exists and is live, paste the URL above</li>
            <li><span className="text-blue-600 font-medium">Draft</span> — page is being written</li>
            <li><span className="text-amber-600 font-medium">Missing</span> — page needs to be created (content gap)</li>
          </ul>
        </div>
      </div>

      {/* Save */}
      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving || !pillarTopic.trim() || !pillarKeyword.trim()} className="cursor-pointer">
          {saving ? <><RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />Saving…</> : <><SaveIcon className="h-4 w-4 mr-2" />{isEdit ? "Save changes" : "Add to topic map"}</>}
        </Button>
        <Button variant="secondary" onClick={onClose} className="cursor-pointer">Cancel</Button>
      </div>
    </div>
  );
}
