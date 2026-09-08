import { useState, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import {
  SparklesIcon, SaveIcon, ArrowLeftIcon, CheckCircleIcon,
  AlertTriangleIcon, RefreshCwIcon, ZapIcon, LinkIcon,
  ExternalLinkIcon, GlobeIcon, CheckIcon, XCircleIcon,
  ChevronDownIcon, ChevronUpIcon,
} from "lucide-react";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import type { ContentAnalysis, AutoMeta, InternalLinkSuggestion } from "@/convex/content/actions.ts";
import RichEditor, { htmlToText } from "./rich-editor.tsx";
import CmsPublishPanel from "./cms-publish-panel.tsx";

const IMPROVE_ACTIONS = [
  { label: "Improve readability", instruction: "Improve the readability. Use shorter sentences, simpler words, and better paragraph breaks." },
  { label: "Add more detail", instruction: "Expand the content with more detail, examples, and explanation while preserving the structure." },
  { label: "Optimize for SEO", instruction: "Optimize the content for SEO: ensure the target keyword appears naturally in key positions, improve heading structure, and add semantic variations." },
  { label: "Improve intro", instruction: "Rewrite only the introduction to be more compelling and hook the reader immediately." },
  { label: "Make concise", instruction: "Make the content more concise. Remove fluff and repetition while preserving all key information." },
  { label: "Fix grammar & style", instruction: "Fix any grammar, punctuation, and style issues." },
  { label: "Add E-E-A-T signals", instruction: "Add E-E-A-T signals: include expert insights, first-hand experience language, verifiable statistics, and authoritative references." },
];

// ── Score bar component ─────────────────────────────────────────────────────

function ScoreBar({ label, score, issues = [], passed = [] }: {
  label: string;
  score: number;
  issues?: string[];
  passed?: string[];
}) {
  const [open, setOpen] = useState(false);
  const color = score >= 85 ? "bg-green-500" : score >= 65 ? "bg-amber-500" : "bg-red-500";
  const textColor = score >= 85 ? "text-green-600 dark:text-green-400" : score >= 65 ? "text-amber-600" : "text-red-500";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">{label}</span>
        <button onClick={() => setOpen((o) => !o)} className={`font-bold tabular-nums cursor-pointer ${textColor} hover:underline flex items-center gap-0.5`}>
          {score}/100 {open ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />}
        </button>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
      </div>
      {open && (issues.length > 0 || passed.length > 0) && (
        <div className="mt-1.5 space-y-1 pl-1">
          {issues.map((iss, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <XCircleIcon className="h-3 w-3 text-red-500 shrink-0 mt-0.5" />
              {iss}
            </div>
          ))}
          {passed.map((p, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <CheckIcon className="h-3 w-3 text-green-500 shrink-0 mt-0.5" />
              {p}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main editor ─────────────────────────────────────────────────────────────

export default function ContentEditor({
  project,
  pieceId,
  onClose,
  prefillTitle,
  prefillKeyword,
}: {
  project: Doc<"projects">;
  pieceId: Id<"contentPieces"> | null;
  onClose: () => void;
  prefillTitle?: string;
  prefillKeyword?: string;
}) {
  const existing = useQuery(api.content.queries.getById, pieceId ? { id: pieceId } : "skip");

  const [title, setTitle] = useState(prefillTitle ?? "");
  const [keyword, setKeyword] = useState(prefillKeyword ?? "");
  // contentHtml is the HTML from TipTap (source of truth for the editor)
  const [contentHtml, setContentHtml] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDesc, setMetaDesc] = useState("");
  const [contentType, setContentType] = useState("blog_post");
  const [status, setStatus] = useState("draft");
  const [tone, setTone] = useState("professional");
  const [wordCount, setWordCount] = useState(1500);

  const [generating, setGenerating] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [generatingMeta, setGeneratingMeta] = useState(false);
  const [suggestingLinks, setSuggestingLinks] = useState(false);
  const [improving, setImproving] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [analysis, setAnalysis] = useState<ContentAnalysis | null>(null);
  const [meta, setMeta] = useState<AutoMeta | null>(null);
  const [linkSuggestions, setLinkSuggestions] = useState<InternalLinkSuggestion[] | null>(null);
  const [copiedLink, setCopiedLink] = useState<number | null>(null);

  const [rightPanel, setRightPanel] = useState<"quality" | "links">("quality");

  const createPiece = useMutation(api.content.mutations.create);
  const updatePiece = useMutation(api.content.mutations.update);
  const generateArticle = useAction(api.content.actions.generateArticle);
  const analyzeContent = useAction(api.content.actions.analyzeContent);
  const improveContent = useAction(api.content.actions.improveContent);
  const autoGenerateMeta = useAction(api.content.actions.autoGenerateMeta);
  const suggestInternalLinks = useAction(api.content.actions.suggestInternalLinks);

  const contentPieces = useQuery(api.content.queries.list, { projectId: project._id });

  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setKeyword(existing.targetKeyword ?? "");
      // existing.content may be markdown or HTML — set it and the editor will normalise
      setContentHtml(existing.content ?? "");
      setMetaTitle(existing.metaTitle ?? "");
      setMetaDesc(existing.metaDescription ?? "");
      setContentType(existing.contentType);
      setStatus(existing.status);
    }
  }, [existing?._id]);

  // Plain text version for analysis/improvement (strip HTML tags)
  const plainText = htmlToText(contentHtml);
  const wc = plainText.split(/\s+/).filter(Boolean).length;

  async function handleGenerate() {
    if (!keyword.trim()) { toast.error("Enter a target keyword first"); return; }
    setGenerating(true);
    setAnalysis(null);
    setMeta(null);
    setLinkSuggestions(null);
    try {
      const result = await generateArticle({
        keyword,
        title: title || keyword,
        tone,
        wordCount,
        websiteContext: project.businessDescription ?? project.name,
      });
      // The AI returns markdown — set it as contentHtml; the editor will convert it
      setContentHtml(result.content);
      if (!title) setTitle(keyword);
      toast.success(`Generated ${result.wordCount} words`);
      void runAutoChecks(result.content);
    } catch (e) {
      if (e instanceof ConvexError) toast.error((e.data as { message: string }).message);
      else toast.error("Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function runAutoChecks(articleContent: string) {
    setAnalyzing(true);
    setGeneratingMeta(true);
    try {
      const plain = htmlToText(articleContent).slice(0, 4000) || articleContent.slice(0, 4000);
      const [analysisResult, metaResult] = await Promise.all([
        analyzeContent({ content: plain, keyword: keyword || undefined }),
        autoGenerateMeta({ content: plain, keyword, brand: project.name }),
      ]);
      setAnalysis(analysisResult);
      setMeta(metaResult);
      setMetaTitle(metaResult.metaTitle);
      setMetaDesc(metaResult.metaDescription);
    } catch {
      // Silently ignore
    } finally {
      setAnalyzing(false);
      setGeneratingMeta(false);
    }
  }

  async function handleAnalyze() {
    if (!plainText.trim()) { toast.error("Add some content first"); return; }
    setAnalyzing(true);
    try {
      const result = await analyzeContent({ content: plainText.slice(0, 4000), keyword: keyword || undefined });
      setAnalysis(result);
      setRightPanel("quality");
    } catch {
      toast.error("Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSuggestLinks() {
    if (!plainText.trim()) { toast.error("Add some content first"); return; }
    setSuggestingLinks(true);
    setRightPanel("links");
    try {
      const pages = (contentPieces ?? [])
        .filter((p) => p.targetUrl && p.title !== title)
        .map((p) => ({ title: p.title, url: p.targetUrl! }));
      const result = await suggestInternalLinks({ content: plainText, keyword, existingPages: pages });
      setLinkSuggestions(result);
    } catch {
      toast.error("Link suggestion failed");
    } finally {
      setSuggestingLinks(false);
    }
  }

  async function handleImprove(instruction: string) {
    if (!plainText.trim()) return;
    setImproving(instruction);
    try {
      const result = await improveContent({ content: plainText, instruction });
      // result.content comes back as markdown — set it; editor will convert
      setContentHtml(result.content);
      toast.success("Content improved");
      void handleAnalyze();
    } catch {
      toast.error("Improvement failed");
    } finally {
      setImproving(null);
    }
  }

  async function handleSave(overrideStatus?: string) {
    if (!title.trim()) { toast.error("Enter a title"); return; }
    setSaving(true);
    try {
      const saveStatus = overrideStatus ?? status;
      if (pieceId) {
        await updatePiece({
          id: pieceId,
          title,
          content: contentHtml,
          metaTitle: metaTitle || undefined,
          metaDescription: metaDesc || undefined,
          targetKeyword: keyword || undefined,
          status: saveStatus,
          ...(analysis ? { qualityScore: analysis.overallScore, qualityFlags: analysis.weaknesses } : {}),
        });
        toast.success("Saved");
      } else {
        await createPiece({
          projectId: project._id,
          title,
          content: contentHtml || undefined,
          metaTitle: metaTitle || undefined,
          metaDescription: metaDesc || undefined,
          targetKeyword: keyword || undefined,
          contentType,
          status: saveStatus,
        });
        toast.success("Created");
        onClose();
      }
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (pieceId && existing === undefined) {
    return <div className="p-6"><Skeleton className="h-96 w-full" /></div>;
  }

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* ── Left: Editor ── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-auto p-4 sm:p-5 space-y-4">
        {/* Top bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={onClose} className="cursor-pointer">
            <ArrowLeftIcon className="h-4 w-4 mr-1" />Back
          </Button>
          <div className="flex gap-2 flex-wrap flex-1">
            <Select value={contentType} onValueChange={setContentType}>
              <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[["blog_post","Blog Post"],["pillar_page","Pillar Page"],["cluster_page","Cluster Page"],["landing_page","Landing Page"],["product_page","Product Page"]].map(([v,l]) => (
                  <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["draft","review","published"].map((s) => (
                  <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["professional","conversational","authoritative","friendly"].map((t) => (
                  <SelectItem key={t} value={t} className="text-xs capitalize">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(wordCount)} onValueChange={(v) => setWordCount(Number(v))}>
              <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[[800,"800 words"],[1200,"1200 words"],[1500,"1500 words"],[2000,"2000 words"],[2500,"2500 words"],[3000,"3000 words"]].map(([v,l]) => (
                  <SelectItem key={v} value={String(v)} className="text-xs">{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" variant="secondary" onClick={() => handleSave()} disabled={saving} className="cursor-pointer">
            <SaveIcon className="h-3.5 w-3.5 mr-1" />{saving ? "Saving…" : "Save"}
          </Button>
        </div>

        {/* Title + Keyword */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs font-medium">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Content title…" className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium">Target Keyword</Label>
            <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Primary keyword…" className="h-9 font-mono text-sm" />
          </div>
        </div>

        {/* AI Generate + Quick improvements */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <Button
            onClick={handleGenerate}
            disabled={generating || !keyword.trim()}
            className="cursor-pointer h-8"
            size="sm"
          >
            <SparklesIcon className="h-3.5 w-3.5 mr-1.5" />
            {generating ? "Generating…" : "Generate with AI"}
          </Button>
          {contentHtml && IMPROVE_ACTIONS.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              size="sm"
              className="text-xs h-7 cursor-pointer"
              disabled={improving !== null || generating}
              onClick={() => handleImprove(action.instruction)}
            >
              {improving === action.instruction ? (
                <RefreshCwIcon className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <ZapIcon className="h-3 w-3 mr-1 opacity-60" />
              )}
              {action.label}
            </Button>
          ))}
        </div>

        {generating && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
            <SparklesIcon className="h-4 w-4 animate-pulse text-primary" />
            Writing {wordCount}-word article, then auto-running quality check + meta generation…
          </div>
        )}

        {/* Rich Editor */}
        <div className="flex-1 min-h-[380px]">
          <RichEditor
            value={contentHtml}
            onChange={setContentHtml}
            placeholder="Write your content here, or use AI to generate it…"
            className="h-full min-h-[380px]"
          />
        </div>

        {/* ── Meta section ── */}
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <GlobeIcon className="h-3.5 w-3.5" />Meta Tags
            </div>
            {generatingMeta && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <RefreshCwIcon className="h-3 w-3 animate-spin" />Auto-generating…
              </span>
            )}
            {meta && !generatingMeta && (
              <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <SparklesIcon className="h-3 w-3" />AI-generated
              </span>
            )}
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Meta Title</Label>
              <Input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder="SEO title (50-60 chars)" className="text-sm h-8" />
              <div className={`text-xs ${metaTitle.length > 60 ? "text-red-500" : metaTitle.length >= 50 ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                {metaTitle.length}/60 {metaTitle.length >= 50 && metaTitle.length <= 60 && "✓"}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Meta Description</Label>
              <Textarea value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} placeholder="SEO description (140-160 chars)" className="text-sm resize-none h-16" />
              <div className={`text-xs ${metaDesc.length > 160 ? "text-red-500" : metaDesc.length >= 140 ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                {metaDesc.length}/160 {metaDesc.length >= 140 && metaDesc.length <= 160 && "✓"}
              </div>
            </div>
          </div>
        </div>

        {/* ── CMS Publish Panel ── */}
        <CmsPublishPanel
          projectId={project._id}
          title={title}
          contentHtml={contentHtml}
          metaTitle={metaTitle}
          metaDescription={metaDesc}
          keyword={keyword}
          onPublishSuccess={(url) => {
            setStatus("published");
            void handleSave("published");
          }}
        />
      </div>

      {/* ── Right: Quality + Links panel ── */}
      <div className="w-80 shrink-0 border-l flex flex-col min-h-0 overflow-hidden">
        {/* Panel tabs */}
        <div className="flex border-b shrink-0">
          {[
            { id: "quality" as const, label: "Quality Check" },
            { id: "links" as const, label: "Internal Links" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setRightPanel(tab.id)}
              className={`flex-1 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${rightPanel === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* ── Quality panel ── */}
          {rightPanel === "quality" && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">6 quality factors — target 100</p>
                <Button variant="secondary" size="sm" className="h-7 text-xs cursor-pointer" onClick={handleAnalyze} disabled={analyzing || !plainText.trim()}>
                  <SparklesIcon className="h-3 w-3 mr-1" />{analyzing ? "Analyzing…" : "Re-analyze"}
                </Button>
              </div>

              {!analysis && !analyzing && (
                <div className="text-xs text-muted-foreground text-center py-8 leading-relaxed">
                  Generate or write content, then AI will auto-check quality — or click Re-analyze.
                </div>
              )}

              {analyzing && (
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <SparklesIcon className="h-3.5 w-3.5 animate-pulse text-primary" />
                    Checking E-E-A-T, People-First, SEO, Readability, Words…
                  </div>
                  {[1,2,3,4,5,6].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              )}

              {analysis && (
                <div className="space-y-4">
                  <div className="rounded-xl border p-4 text-center space-y-1">
                    <div className={`text-4xl font-bold tabular-nums ${analysis.overallScore >= 85 ? "text-green-600 dark:text-green-400" : analysis.overallScore >= 65 ? "text-amber-600" : "text-red-500"}`}>
                      {analysis.overallScore}
                    </div>
                    <div className="text-xs text-muted-foreground font-medium">Overall Score</div>
                    {analysis.overallScore < 100 && (
                      <div className="text-xs text-muted-foreground">
                        {analysis.overallScore >= 85 ? "Excellent — minor refinements possible" : analysis.overallScore >= 65 ? "Good — address the issues below" : "Needs improvement — see critical issues below"}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <ScoreBar label="E-E-A-T" score={analysis.eeatScore} issues={analysis.factorDetails?.eeat?.issues} passed={analysis.factorDetails?.eeat?.passed} />
                    <ScoreBar label="People-First" score={analysis.peopleFirstScore} issues={analysis.factorDetails?.peopleFirst?.issues} passed={analysis.factorDetails?.peopleFirst?.passed} />
                    <ScoreBar label="SEO" score={analysis.seoScore} issues={analysis.factorDetails?.seo?.issues} passed={analysis.factorDetails?.seo?.passed} />
                    <ScoreBar label="Readability" score={analysis.readabilityScore} issues={analysis.factorDetails?.readability?.issues} passed={analysis.factorDetails?.readability?.passed} />
                    <ScoreBar label="Words" score={wc >= 1500 ? 90 : Math.round((wc / 1500) * 90)} issues={analysis.factorDetails?.words?.issues} passed={analysis.factorDetails?.words?.passed} />
                  </div>

                  {analysis.suggestions.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold flex items-center gap-1.5">
                        <AlertTriangleIcon className="h-3.5 w-3.5 text-amber-500" />To reach 100 — fix these
                      </div>
                      {analysis.suggestions.slice(0, 5).map((s, i) => (
                        <div key={i} className="text-xs text-muted-foreground flex items-start gap-1.5 leading-relaxed">
                          <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                          {s}
                        </div>
                      ))}
                    </div>
                  )}

                  {analysis.passedChecks.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-xs font-semibold flex items-center gap-1.5 text-green-600 dark:text-green-400">
                        <CheckCircleIcon className="h-3.5 w-3.5" />Passed checks
                      </div>
                      {analysis.passedChecks.slice(0, 4).map((s, i) => (
                        <div key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                          <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                          {s}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── Internal Links panel ── */}
          {rightPanel === "links" && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">AI suggests links from your content</p>
                <Button variant="secondary" size="sm" className="h-7 text-xs cursor-pointer" onClick={handleSuggestLinks} disabled={suggestingLinks || !plainText.trim()}>
                  <LinkIcon className="h-3 w-3 mr-1" />{suggestingLinks ? "Analyzing…" : "Suggest Links"}
                </Button>
              </div>

              {!linkSuggestions && !suggestingLinks && (
                <div className="text-xs text-muted-foreground text-center py-8 leading-relaxed">
                  Click "Suggest Links" to find internal linking opportunities based on your content.
                </div>
              )}

              {suggestingLinks && (
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <LinkIcon className="h-3.5 w-3.5 animate-pulse text-primary" />Scanning your content pages…
                  </div>
                  {[1,2,3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              )}

              {linkSuggestions && linkSuggestions.length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-8">
                  No relevant internal links found. Add more content pieces with target URLs to improve suggestions.
                </div>
              )}

              {linkSuggestions && linkSuggestions.length > 0 && (
                <div className="space-y-2.5">
                  {linkSuggestions.map((link, i) => {
                    const priorityColor = link.priority === "high" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground";
                    return (
                      <div key={i} className="rounded-lg border bg-card p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5 min-w-0">
                            <p className="text-xs font-semibold truncate">{link.targetTitle}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{link.targetUrl}</p>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${priorityColor}`}>{link.priority}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Anchor: <span className="font-mono bg-muted px-1 rounded">"{link.anchorText}"</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground italic leading-relaxed">
                          Context: "{link.contextSentence}"
                        </div>
                        <div className="text-[10px] text-muted-foreground">{link.reason}</div>
                        <button
                          onClick={() => {
                            const mdLink = `[${link.anchorText}](${link.targetUrl})`;
                            void navigator.clipboard.writeText(mdLink);
                            setCopiedLink(i);
                            setTimeout(() => setCopiedLink(null), 1500);
                          }}
                          className="flex items-center gap-1 text-[10px] text-primary hover:underline cursor-pointer"
                        >
                          {copiedLink === i ? <CheckCircleIcon className="h-3 w-3" /> : <ExternalLinkIcon className="h-3 w-3" />}
                          {copiedLink === i ? "Copied!" : "Copy markdown link"}
                        </button>
                      </div>
                    );
                  })}
                  <p className="text-[10px] text-muted-foreground text-center pt-1">
                    Copy any link and paste it into your content to improve internal linking score
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
