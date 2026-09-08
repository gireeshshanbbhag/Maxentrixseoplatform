import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { SparklesIcon, ChevronDownIcon, ChevronRightIcon, PlusIcon } from "lucide-react";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import type { ContentBrief } from "@/convex/content/actions.ts";

export default function BriefGenerator({
  project,
  onUseBrief,
}: {
  project: Doc<"projects">;
  onUseBrief: (brief: ContentBrief, keyword: string) => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [contentType, setContentType] = useState("blog_post");
  const [loading, setLoading] = useState(false);
  const [brief, setBrief] = useState<ContentBrief | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());

  const generateBrief = useAction(api.content.actions.generateBrief);
  const createPiece = useMutation(api.content.mutations.create);

  async function handleGenerate() {
    if (!keyword.trim()) { toast.error("Enter a keyword"); return; }
    setLoading(true);
    try {
      const result = await generateBrief({
        keyword,
        contentType,
        websiteContext: project.businessDescription ?? project.name,
      });
      setBrief(result);
    } catch (e) {
      if (e instanceof ConvexError) toast.error((e.data as { message: string }).message);
      else toast.error("Failed to generate brief");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveBrief() {
    if (!brief) return;
    try {
      await createPiece({
        projectId: project._id,
        title: brief.title,
        targetKeyword: brief.targetKeyword,
        secondaryKeywords: brief.secondaryKeywords,
        contentType,
        status: "brief",
        content: formatBriefAsMarkdown(brief),
      });
      toast.success("Brief saved as content piece");
    } catch (e) {
      toast.error("Failed to save brief");
    }
  }

  function toggleSection(i: number) {
    setExpandedSections((prev) => {
      const n = new Set(prev);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  }

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-bold">Content Brief Generator</h2>
        <p className="text-sm text-muted-foreground mt-1">
          AI-powered content briefs with complete outlines, SEO guidelines, and audience targeting.
        </p>
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <Label className="text-xs font-medium">Target Keyword</Label>
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
            placeholder="e.g. best CRM software for small business"
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs font-medium">Type</Label>
          <Select value={contentType} onValueChange={setContentType}>
            <SelectTrigger className="mt-1 w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[["blog_post","Blog Post"],["landing_page","Landing Page"],["product_page","Product Page"]].map(([v,l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button onClick={handleGenerate} disabled={loading || !keyword.trim()}>
            <SparklesIcon className="h-4 w-4 mr-1.5" />
            {loading ? "Generating…" : "Generate Brief"}
          </Button>
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1,2,3,4].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      )}

      {brief && (
        <div className="space-y-5">
          {/* Header */}
          <div className="rounded-xl border p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold">{brief.title}</h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    🎯 {brief.targetKeyword}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    ~{brief.recommendedWordCount.toLocaleString()} words
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {brief.searchIntent}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="secondary" onClick={handleSaveBrief}>
                  <PlusIcon className="h-3.5 w-3.5 mr-1.5" />
                  Save brief
                </Button>
                <Button size="sm" onClick={() => onUseBrief(brief, brief.targetKeyword)}>
                  <SparklesIcon className="h-3.5 w-3.5 mr-1.5" />
                  Write article
                </Button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Target Audience</div>
                <p className="text-sm">{brief.targetAudience}</p>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Content Goal</div>
                <p className="text-sm">{brief.contentGoal}</p>
              </div>
            </div>

            {brief.secondaryKeywords.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Secondary Keywords</div>
                <div className="flex flex-wrap gap-1.5">
                  {brief.secondaryKeywords.map((kw) => (
                    <Badge key={kw} variant="outline" className="text-xs">{kw}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Outline */}
          <div className="rounded-xl border overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/20 text-sm font-semibold">Content Outline</div>
            <div className="divide-y">
              {brief.outline.map((section, i) => (
                <div key={i}>
                  <button
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => toggleSection(i)}
                  >
                    {expandedSections.has(i) ? (
                      <ChevronDownIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRightIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <span className="text-xs text-muted-foreground mr-1">H2</span>
                    {section.heading}
                  </button>
                  {expandedSections.has(i) && (
                    <div className="px-10 pb-3 space-y-1.5">
                      {section.subheadings.map((sub, j) => (
                        <div key={j} className="text-sm text-muted-foreground flex items-center gap-2">
                          <span className="text-xs text-muted-foreground/60">H3</span>
                          {sub}
                        </div>
                      ))}
                      {section.notes && (
                        <p className="text-xs text-muted-foreground/80 italic mt-1">{section.notes}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Key points + SEO guidelines */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Must-Cover Points</div>
              <ul className="space-y-1.5">
                {brief.keyPoints.map((pt, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    {pt}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">SEO Guidelines</div>
              <ul className="space-y-1.5">
                {brief.seoGuidelines.map((g, i) => (
                  <li key={i} className="text-sm flex items-start gap-2 text-muted-foreground">
                    <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-xl border p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Call to Action</div>
            <p className="text-sm">{brief.callToAction}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function formatBriefAsMarkdown(brief: ContentBrief): string {
  const lines = [
    `# Content Brief: ${brief.title}`,
    ``,
    `**Target Keyword:** ${brief.targetKeyword}`,
    `**Secondary Keywords:** ${brief.secondaryKeywords.join(", ")}`,
    `**Search Intent:** ${brief.searchIntent}`,
    `**Recommended Word Count:** ${brief.recommendedWordCount}`,
    `**Target Audience:** ${brief.targetAudience}`,
    `**Content Goal:** ${brief.contentGoal}`,
    ``,
    `## Outline`,
    ...brief.outline.flatMap((s) => [
      `### ${s.heading}`,
      ...s.subheadings.map((sub) => `- ${sub}`),
      s.notes ? `*${s.notes}*` : "",
    ]),
    ``,
    `## Key Points to Cover`,
    ...brief.keyPoints.map((pt) => `- ${pt}`),
    ``,
    `## SEO Guidelines`,
    ...brief.seoGuidelines.map((g) => `- ${g}`),
    ``,
    `## Call to Action`,
    brief.callToAction,
  ];
  return lines.join("\n");
}
