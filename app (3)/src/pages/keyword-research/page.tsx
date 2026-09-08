import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useCurrentProject } from "@/hooks/use-current-project.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Textarea } from "@/components/ui/textarea.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select.tsx";
import {
  SearchIcon, SparklesIcon, RefreshCwIcon, PlusIcon,
  TrendingUpIcon, AlertTriangleIcon, LightbulbIcon, FilterIcon,
  ArrowRightIcon, UsersIcon, TargetIcon, ZapIcon, ChevronDownIcon,
  ChevronUpIcon, XIcon, CheckCircleIcon, FileTextIcon, GlobeIcon,
} from "lucide-react";
import {
  Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription,
} from "@/components/ui/empty.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import type {
  CompetitorAnalysisResult, KeywordCluster, CompetitorProfile,
  ContentGap, Recommendation,
} from "@/convex/keyword_research/actions.ts";

// ── Intent / difficulty colours ───────────────────────────────────────────────
const INTENT_COLORS: Record<string, string> = {
  informational: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  navigational: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  commercial: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  transactional: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  head: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  long_tail: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  question: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  local: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};
const DIFF_COLORS: Record<string, string> = {
  low: "text-green-600 dark:text-green-400",
  medium: "text-amber-600",
  high: "text-red-500",
};
const EFFORT_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function scoreColor(score: number | null) {
  if (score === null) return "text-muted-foreground";
  if (score >= 70) return "text-green-600 dark:text-green-400";
  if (score >= 40) return "text-amber-600";
  return "text-red-500";
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function KeywordResearchPage() {
  return (
    <>
      <AuthLoading><div className="p-8"><Skeleton className="h-64 w-full" /></div></AuthLoading>
      <Unauthenticated><div className="flex justify-center p-8"><SignInButton /></div></Unauthenticated>
      <Authenticated><KeywordResearchContent /></Authenticated>
    </>
  );
}

function KeywordResearchContent() {
  const { activeProjectId } = useCurrentProject();
  const projects = useQuery(api.projects.list, {});
  const project = projects?.find((p) => p._id === activeProjectId);
  const [activeTab, setActiveTab] = useState<"research" | "competitor">("research");

  if (!activeProjectId || !project) {
    return (
      <div className="p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><SearchIcon /></EmptyMedia>
            <EmptyTitle>No project selected</EmptyTitle>
            <EmptyDescription>Select a project to do keyword research</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="border-b px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <SearchIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Keyword Research & Competitor Analysis</h1>
              <p className="text-sm text-muted-foreground">Discover opportunities and outrank your competitors</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 border-b -mb-4 pb-0">
          {([
            { id: "research", label: "Keyword Ideas", icon: <SparklesIcon className="h-3.5 w-3.5" /> },
            { id: "competitor", label: "Competitor Analysis", icon: <UsersIcon className="h-3.5 w-3.5" /> },
          ] as const).map((tab) => (
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
        {activeTab === "research" && (
          <KeywordIdeasTab project={project} projectId={activeProjectId} />
        )}
        {activeTab === "competitor" && (
          <CompetitorAnalysisTab project={project} projectId={activeProjectId} />
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TAB 1 — Keyword Ideas
// ────────────────────────────────────────────────────────────────────────────

type KwIdea = {
  keyword: string;
  intent: "informational" | "navigational" | "commercial" | "transactional";
  difficulty: "low" | "medium" | "high";
  volume: string;
  priority: "high" | "medium" | "low";
  notes: string;
};

type ResearchResult = {
  ideas: KwIdea[];
  relatedTopics: string[];
  serpFeatures: string[];
  summary: string;
};

function KeywordIdeasTab({ project, projectId }: { project: { websiteUrl: string; businessCategory?: string; country?: string; name: string }; projectId: Id<"projects"> }) {
  const [seed, setSeed] = useState("");
  const [researchType, setResearchType] = useState<"broad" | "long_tail" | "questions" | "competitors" | "local">("broad");
  const [count, setCount] = useState("20");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set());
  const [intentFilter, setIntentFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [addingKeywords, setAddingKeywords] = useState(false);

  const generateIdeas = useAction(api.keyword_research.actions.generateKeywordIdeas);
  const addKeyword = useMutation(api.keywords.mutations.addKeyword);

  async function handleResearch() {
    if (!seed.trim()) return;
    setLoading(true); setResult(null); setSelectedKeywords(new Set());
    try {
      const res = await generateIdeas({
        seedKeyword: seed.trim(),
        websiteUrl: project.websiteUrl,
        businessCategory: project.businessCategory,
        country: project.country,
        count: parseInt(count),
        researchType,
      });
      setResult(res);
    } catch (e) {
      toast.error(e instanceof ConvexError ? (e.data as { message: string }).message : "Research failed");
    } finally { setLoading(false); }
  }

  async function addSelectedToTracker() {
    if (!result || selectedKeywords.size === 0) return;
    setAddingKeywords(true);
    let added = 0;
    for (const idea of result.ideas.filter((i) => selectedKeywords.has(i.keyword))) {
      try {
        await addKeyword({ projectId, keyword: idea.keyword, intent: idea.intent, priority: idea.priority, source: "keyword_research" });
        added++;
      } catch { /* skip duplicates */ }
    }
    toast.success(`Added ${added} keyword${added !== 1 ? "s" : ""} to tracker`);
    setSelectedKeywords(new Set()); setAddingKeywords(false);
  }

  const filteredIdeas = result?.ideas.filter((i) => {
    if (intentFilter !== "all" && i.intent !== intentFilter) return false;
    if (difficultyFilter !== "all" && i.difficulty !== difficultyFilter) return false;
    return true;
  }) ?? [];

  function toggleSelect(kw: string) {
    setSelectedKeywords((prev) => { const n = new Set(prev); n.has(kw) ? n.delete(kw) : n.add(kw); return n; });
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Research panel */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <SparklesIcon className="h-4 w-4 text-primary" /> AI Keyword Research
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Seed Keyword</Label>
            <Input value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="e.g. digital marketing agency" onKeyDown={(e) => e.key === "Enter" && handleResearch()} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Research Type</Label>
            <Select value={researchType} onValueChange={(v) => setResearchType(v as typeof researchType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="broad">Broad Variations</SelectItem>
                <SelectItem value="long_tail">Long-tail Keywords</SelectItem>
                <SelectItem value="questions">Question Keywords</SelectItem>
                <SelectItem value="competitors">Competitive Intent</SelectItem>
                <SelectItem value="local">Local SEO Keywords</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-end gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Number of Ideas</Label>
            <Select value={count} onValueChange={setCount}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["10","20","30","40"].map((n) => <SelectItem key={n} value={n}>{n} ideas</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleResearch} disabled={loading || !seed.trim()} className="cursor-pointer">
            {loading ? <><RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />Researching…</> : <><SparklesIcon className="h-4 w-4 mr-2" />Generate Ideas</>}
          </Button>
        </div>
      </div>

      {loading && <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>}

      {!loading && result && (
        <>
          {result.summary && (
            <div className="rounded-xl border bg-primary/5 border-primary/20 p-4 flex items-start gap-2">
              <LightbulbIcon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-sm">{result.summary}</p>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatBox label="Total Ideas" value={result.ideas.length} />
            <StatBox label="Low Difficulty" value={result.ideas.filter(i => i.difficulty === "low").length} color="text-green-600" />
            <StatBox label="High Priority" value={result.ideas.filter(i => i.priority === "high").length} color="text-primary" />
            <StatBox label="SERP Features" value={result.serpFeatures.length} />
          </div>
          {result.relatedTopics.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Related Topics</p>
              <div className="flex flex-wrap gap-2">
                {result.relatedTopics.map((t) => (
                  <button key={t} onClick={() => setSeed(t)} className="text-xs px-3 py-1.5 rounded-full border hover:bg-accent cursor-pointer transition-colors flex items-center gap-1">
                    <ArrowRightIcon className="h-3 w-3" />{t}
                  </button>
                ))}
              </div>
            </div>
          )}
          {result.serpFeatures.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-muted-foreground">SERP Features:</span>
              {result.serpFeatures.map((f) => <Badge key={f} variant="secondary" className="text-xs">{f}</Badge>)}
            </div>
          )}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex gap-2">
              <Select value={intentFilter} onValueChange={setIntentFilter}>
                <SelectTrigger className="w-40 h-8 text-xs"><FilterIcon className="h-3 w-3 mr-1.5 text-muted-foreground" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["all","informational","commercial","transactional","navigational"].map(v => <SelectItem key={v} value={v}>{v === "all" ? "All Intents" : v}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["all","low","medium","high"].map(v => <SelectItem key={v} value={v}>{v === "all" ? "All Difficulty" : v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 items-center">
              <button onClick={() => setSelectedKeywords(new Set(filteredIdeas.map(i => i.keyword)))} className="text-xs text-primary hover:underline cursor-pointer">Select all</button>
              <button onClick={() => setSelectedKeywords(new Set())} className="text-xs text-muted-foreground hover:underline cursor-pointer">Clear</button>
              {selectedKeywords.size > 0 && (
                <Button size="sm" onClick={addSelectedToTracker} disabled={addingKeywords} className="cursor-pointer">
                  {addingKeywords ? <RefreshCwIcon className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <PlusIcon className="h-3.5 w-3.5 mr-1.5" />}
                  Add {selectedKeywords.size} to Tracker
                </Button>
              )}
            </div>
          </div>
          <div className="rounded-xl border overflow-hidden">
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] text-xs font-semibold text-muted-foreground bg-muted/40 px-4 py-2 border-b">
              <div className="w-6" /><div>Keyword</div>
              <div className="w-24 text-center">Intent</div><div className="w-20 text-center">Volume</div>
              <div className="w-20 text-center">Difficulty</div><div className="w-16 text-center">Priority</div>
            </div>
            <div className="divide-y max-h-[600px] overflow-auto">
              {filteredIdeas.map((idea) => (
                <div key={idea.keyword}
                  className={`grid grid-cols-[auto_1fr_auto_auto_auto_auto] px-4 py-3 hover:bg-accent/30 transition-colors items-start cursor-pointer ${selectedKeywords.has(idea.keyword) ? "bg-primary/5" : ""}`}
                  onClick={() => toggleSelect(idea.keyword)}
                >
                  <div className="w-6 pt-0.5"><Checkbox checked={selectedKeywords.has(idea.keyword)} onCheckedChange={() => toggleSelect(idea.keyword)} onClick={(e) => e.stopPropagation()} /></div>
                  <div className="min-w-0 pr-4">
                    <p className="text-sm font-medium">{idea.keyword}</p>
                    {idea.notes && <p className="text-xs text-muted-foreground mt-0.5">{idea.notes}</p>}
                  </div>
                  <div className="w-24 flex justify-center"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${INTENT_COLORS[idea.intent] ?? ""}`}>{idea.intent}</span></div>
                  <div className="w-20 text-center text-xs font-medium">{idea.volume}</div>
                  <div className="w-20 text-center"><span className={`text-xs font-semibold capitalize ${DIFF_COLORS[idea.difficulty]}`}>{idea.difficulty}</span></div>
                  <div className="w-16 flex justify-center"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${idea.priority === "high" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{idea.priority}</span></div>
                </div>
              ))}
            </div>
          </div>
          {filteredIdeas.length === 0 && <p className="text-center py-8 text-sm text-muted-foreground">No ideas match your current filters</p>}
        </>
      )}

      {!loading && !result && (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <SearchIcon className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground text-sm">Enter a seed keyword and click "Generate Ideas" to start</p>
          <p className="text-xs text-muted-foreground mt-1">Powered by AI — generates keyword ideas with intent, difficulty, and volume estimates</p>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TAB 2 — Competitor Analysis
// ────────────────────────────────────────────────────────────────────────────

function CompetitorAnalysisTab({ project, projectId }: {
  project: { websiteUrl: string; businessCategory?: string; country?: string; businessDescription?: string };
  projectId: Id<"projects">;
}) {
  const domain = (() => {
    try { return new URL(project.websiteUrl).hostname.replace("www.", ""); } catch { return project.websiteUrl; }
  })();

  const [competitors, setCompetitors] = useState(["", "", ""]);
  const [seedKeywords, setSeedKeywords] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompetitorAnalysisResult | null>(null);
  const [activeSection, setActiveSection] = useState<"overview" | "clusters" | "gaps" | "recommendations">("overview");

  const runAnalysis = useAction(api.keyword_research.actions.runCompetitorAnalysis);
  const addKeyword = useMutation(api.keywords.mutations.addKeyword);

  function updateCompetitor(i: number, val: string) {
    setCompetitors((prev) => { const n = [...prev]; n[i] = val; return n; });
  }

  const validCompetitors = competitors.map((c) => c.trim()).filter(Boolean);

  async function handleRun() {
    if (validCompetitors.length === 0) {
      toast.error("Enter at least one competitor domain");
      return;
    }
    setLoading(true); setResult(null);
    try {
      const res = await runAnalysis({
        projectId,
        ourDomain: domain,
        competitorDomains: validCompetitors,
        seedKeywords: seedKeywords.trim() || undefined,
        businessDescription: (project as { businessDescription?: string }).businessDescription,
        country: project.country,
        businessCategory: project.businessCategory,
      });
      setResult(res);
      setActiveSection("overview");
    } catch (e) {
      toast.error(e instanceof ConvexError ? (e.data as { message: string }).message : "Analysis failed");
    } finally { setLoading(false); }
  }

  async function addClusterKeyword(cluster: KeywordCluster) {
    try {
      await addKeyword({
        projectId,
        keyword: cluster.primary_keyword,
        intent: cluster.type as "informational" | "commercial" | "transactional" | "navigational",
        priority: (cluster.opportunity_score ?? 0) >= 70 ? "high" : (cluster.opportunity_score ?? 0) >= 40 ? "medium" : "low",
        source: "keyword_research",
      });
      toast.success(`"${cluster.primary_keyword}" added to tracker`);
    } catch {
      toast.error("Already in tracker or failed to add");
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Setup form */}
      <div className="rounded-xl border bg-card p-5 space-y-5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <UsersIcon className="h-4 w-4 text-primary" /> Competitor Analysis Setup
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {/* Our domain (read-only) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Your Domain</Label>
            <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
              <GlobeIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="font-medium">{domain}</span>
              <Badge variant="secondary" className="text-[10px] ml-auto">Your site</Badge>
            </div>
          </div>

          {/* Seed keywords */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Focus Topics <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input
              placeholder="e.g. SEO tools, rank tracking, site audit"
              value={seedKeywords}
              onChange={(e) => setSeedKeywords(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Comma-separated keywords to focus the analysis</p>
          </div>
        </div>

        {/* Competitor domains */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Competitor Domains</Label>
          <div className="grid sm:grid-cols-3 gap-2">
            {competitors.map((c, i) => (
              <div key={i} className="relative">
                <Input
                  placeholder={`competitor${i + 1}.com`}
                  value={c}
                  onChange={(e) => updateCompetitor(i, e.target.value)}
                  className="pr-7"
                />
                {c && (
                  <button onClick={() => updateCompetitor(i, "")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
                    <XIcon className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {competitors.length < 5 && (
            <button onClick={() => setCompetitors((p) => [...p, ""])} className="text-xs text-primary hover:underline cursor-pointer flex items-center gap-1">
              <PlusIcon className="h-3 w-3" />Add another competitor
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 pt-1">
          <Button onClick={handleRun} disabled={loading || validCompetitors.length === 0} className="cursor-pointer">
            {loading
              ? <><RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />Analysing… (takes ~30s)</>
              : <><SparklesIcon className="h-4 w-4 mr-2" />Run Competitor Analysis</>}
          </Button>
          {validCompetitors.length > 0 && (
            <p className="text-xs text-muted-foreground">Comparing against {validCompetitors.length} competitor{validCompetitors.length !== 1 ? "s" : ""}</p>
          )}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-3">
          <div className="rounded-xl border p-5 flex items-center gap-3">
            <RefreshCwIcon className="h-5 w-5 animate-spin text-primary shrink-0" />
            <div>
              <p className="font-medium text-sm">Running deep competitor analysis…</p>
              <p className="text-xs text-muted-foreground mt-0.5">Using your tracked keywords + AI intelligence. This takes about 30 seconds.</p>
            </div>
          </div>
          {[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      )}

      {/* Results */}
      {!loading && result && (
        <>
          {/* Summary banner */}
          <div className="rounded-xl border bg-primary/5 border-primary/20 p-5 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <LightbulbIcon className="h-4 w-4" />Strategic Summary
            </div>
            <p className="text-sm leading-relaxed">{result.summary}</p>
            {result.missing_data.length > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-2">
                <AlertTriangleIcon className="h-3 w-3" />
                Missing data: {result.missing_data.join(", ")} — confidence may be lower
              </p>
            )}
          </div>

          {/* Section nav */}
          <div className="flex gap-1 rounded-lg border p-1 bg-muted w-fit flex-wrap">
            {([
              { id: "overview", label: "Competitors", count: result.competitors.length },
              { id: "clusters", label: "Keyword Clusters", count: result.keyword_clusters.length },
              { id: "gaps", label: "Content Gaps", count: result.content_gaps.length },
              { id: "recommendations", label: "Recommendations", count: result.recommendations.length },
            ] as const).map((s) => (
              <button key={s.id} onClick={() => setActiveSection(s.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${activeSection === s.id ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                {s.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeSection === s.id ? "bg-primary/10 text-primary" : "bg-muted-foreground/20 text-muted-foreground"}`}>{s.count}</span>
              </button>
            ))}
          </div>

          {/* Competitors */}
          {activeSection === "overview" && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Competitor Profiles</h2>
              {result.competitors.map((comp, i) => (
                <CompetitorCard key={i} comp={comp} />
              ))}
            </div>
          )}

          {/* Keyword Clusters */}
          {activeSection === "clusters" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Keyword Clusters — Ordered by Opportunity</h2>
                <p className="text-xs text-muted-foreground">Each cluster = one buildable page</p>
              </div>
              {result.keyword_clusters.map((cluster, i) => (
                <ClusterCard key={i} cluster={cluster} onAddToTracker={() => addClusterKeyword(cluster)} />
              ))}
            </div>
          )}

          {/* Content Gaps */}
          {activeSection === "gaps" && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Content Gaps</h2>
              <p className="text-xs text-muted-foreground mb-4">Topics your competitors cover that your site is missing. Add these pages to capture their traffic.</p>
              {result.content_gaps.sort((a, b) => a.priority - b.priority).map((gap, i) => (
                <ContentGapRow key={i} gap={gap} />
              ))}
            </div>
          )}

          {/* Recommendations */}
          {activeSection === "recommendations" && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Prioritised Recommendations</h2>
              {result.recommendations.sort((a, b) => a.priority - b.priority).map((rec, i) => (
                <RecommendationCard key={i} rec={rec} index={i} />
              ))}
            </div>
          )}
        </>
      )}

      {!loading && !result && (
        <div className="rounded-xl border border-dashed p-12 text-center space-y-3">
          <UsersIcon className="h-10 w-10 mx-auto text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm font-medium">Enter competitor domains and run analysis</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            The AI will compare your site against competitors, identify keyword clusters, content gaps, and give you a prioritised action plan.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CompetitorCard({ comp }: { comp: CompetitorProfile }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <button onClick={() => setExpanded((v) => !v)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/20 cursor-pointer transition-colors text-left">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <GlobeIcon className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">{comp.domain}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{comp.content_pattern}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-muted-foreground">SERP appearances</p>
            <p className="text-sm font-semibold">{comp.serp_appearances}</p>
          </div>
          {comp.avg_position !== null && (
            <div className="text-right hidden sm:block">
              <p className="text-xs text-muted-foreground">Avg. position</p>
              <p className="text-sm font-semibold">{comp.avg_position}</p>
            </div>
          )}
          {expanded ? <ChevronUpIcon className="h-4 w-4 text-muted-foreground" /> : <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>
      {expanded && (
        <div className="border-t px-5 py-4 grid sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide mb-2">Strengths</p>
            <ul className="space-y-1">
              {comp.strengths.map((s, i) => <li key={i} className="text-xs flex items-start gap-1.5"><CheckCircleIcon className="h-3 w-3 text-green-600 shrink-0 mt-0.5" />{s}</li>)}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">Exploitable Weaknesses</p>
            <ul className="space-y-1">
              {comp.exploitable_weaknesses.map((w, i) => <li key={i} className="text-xs flex items-start gap-1.5"><TargetIcon className="h-3 w-3 text-amber-600 shrink-0 mt-0.5" />{w}</li>)}
            </ul>
          </div>
          {comp.evidence.length > 0 && (
            <div className="sm:col-span-2 pt-2 border-t">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Evidence</p>
              <ul className="space-y-1">
                {comp.evidence.map((e, i) => <li key={i} className="text-xs text-muted-foreground">• {e}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ClusterCard({ cluster, onAddToTracker }: { cluster: KeywordCluster; onAddToTracker: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const rec = cluster.build_recommendation;
  const confColor = cluster.confidence === "high" ? "text-green-600" : cluster.confidence === "medium" ? "text-amber-600" : "text-muted-foreground";

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <button onClick={() => setExpanded((v) => !v)} className="w-full flex items-start gap-4 px-5 py-4 hover:bg-muted/20 cursor-pointer transition-colors text-left">
        {/* Opportunity score */}
        <div className="shrink-0 text-center w-14">
          <div className={`text-2xl font-bold tabular-nums ${scoreColor(cluster.opportunity_score)}`}>
            {cluster.opportunity_score ?? "—"}
          </div>
          <div className="text-[9px] text-muted-foreground uppercase">Score</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm">{cluster.cluster_name}</p>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${INTENT_COLORS[cluster.type] ?? "bg-muted text-muted-foreground"}`}>{cluster.type}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{cluster.serp_intent}</span>
            {!cluster.intent_match && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Intent mismatch</span>}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5 font-mono">{cluster.primary_keyword}</p>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs text-muted-foreground">
            {cluster.search_volume && <span>Vol: <strong className="text-foreground">{cluster.search_volume}</strong></span>}
            {cluster.difficulty && <span className={`font-semibold capitalize ${DIFF_COLORS[cluster.difficulty] ?? ""}`}>{cluster.difficulty} difficulty</span>}
            <span className={`text-xs ${confColor}`}>{cluster.confidence} confidence</span>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2 ml-2">
          <Button size="sm" variant="secondary" className="cursor-pointer text-xs h-7" onClick={(e) => { e.stopPropagation(); onAddToTracker(); }}>
            <PlusIcon className="h-3 w-3 mr-1" />Track
          </Button>
          {expanded ? <ChevronUpIcon className="h-4 w-4 text-muted-foreground" /> : <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t px-5 py-4 space-y-4">
          {/* Build recommendation */}
          <div className="rounded-lg bg-primary/5 border border-primary/10 p-4 space-y-3">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide flex items-center gap-1.5"><FileTextIcon className="h-3.5 w-3.5" />Build Recommendation — {rec.page_type}</p>
            <div className="space-y-2">
              <div><p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Title Tag</p><p className="text-sm font-medium">{rec.suggested_title}</p></div>
              <div><p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">H1</p><p className="text-sm">{rec.suggested_h1}</p></div>
              <div><p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Meta Description</p><p className="text-sm text-muted-foreground">{rec.suggested_meta}</p></div>
            </div>
            {rec.required_sections.length > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">Required Sections</p>
                <div className="flex flex-wrap gap-1.5">
                  {rec.required_sections.map((s) => <span key={s} className="text-xs bg-background border rounded px-2 py-0.5">{s}</span>)}
                </div>
              </div>
            )}
            {rec.target_word_count && <p className="text-xs text-muted-foreground">Target: <strong className="text-foreground">{rec.target_word_count.toLocaleString()} words</strong></p>}
          </div>

          {/* Supporting keywords */}
          {cluster.supporting_keywords.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Supporting Keywords</p>
              <div className="flex flex-wrap gap-2">
                {cluster.supporting_keywords.map((sk) => (
                  <div key={sk.keyword} className="flex items-center gap-1.5 text-xs border rounded-full px-3 py-1 bg-muted/40">
                    <span>{sk.keyword}</span>
                    {sk.type && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${INTENT_COLORS[sk.type] ?? "bg-muted text-muted-foreground"}`}>{sk.type}</span>}
                    {sk.search_volume && <span className="text-muted-foreground">{sk.search_volume}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ContentGapRow({ gap }: { gap: ContentGap }) {
  const priorityColor = gap.priority <= 2 ? "border-red-200 dark:border-red-900/50" : gap.priority <= 4 ? "border-amber-200 dark:border-amber-900/50" : "";
  return (
    <div className={`rounded-xl border bg-card px-5 py-4 flex items-start gap-4 ${priorityColor}`}>
      <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
        {gap.priority}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{gap.topic}</p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-xs text-muted-foreground">{gap.covered_by_competitors} competitor{gap.covered_by_competitors !== 1 ? "s" : ""} cover this</span>
          {gap.search_demand && <Badge variant="secondary" className="text-xs">{gap.search_demand}</Badge>}
          <span className="text-xs bg-muted rounded px-2 py-0.5">{gap.recommended_page_type}</span>
        </div>
      </div>
    </div>
  );
}

function RecommendationCard({ rec, index }: { rec: Recommendation; index: number }) {
  const [expanded, setExpanded] = useState(index < 3);
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <button onClick={() => setExpanded((v) => !v)} className="w-full flex items-start gap-4 px-5 py-4 hover:bg-muted/20 cursor-pointer transition-colors text-left">
        <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{rec.priority}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm">{rec.what}</p>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${EFFORT_COLORS[rec.effort]}`}>{rec.effort} effort</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{rec.expected_impact}</p>
        </div>
        {expanded ? <ChevronUpIcon className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDownIcon className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>
      {expanded && (
        <div className="border-t px-5 py-4 space-y-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Why</p>
            <p className="text-sm text-muted-foreground">{rec.why}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1 flex items-center gap-1"><ZapIcon className="h-3 w-3" />Exact Change</p>
            <div className="rounded-md bg-muted/60 border px-3 py-2.5 text-sm font-mono whitespace-pre-wrap">{rec.exact_change}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, color = "text-foreground" }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}
