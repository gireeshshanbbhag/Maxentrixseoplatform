import { useState, useMemo } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { SignInButton } from "@/components/ui/signin.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import {
  PlusIcon, TrashIcon, CopyIcon, CheckIcon, SparklesIcon,
  CodeIcon, CheckCircleIcon, XIcon, ChevronLeftIcon, EyeIcon, ListIcon,
  ZapIcon, ChevronDownIcon, ChevronUpIcon, InfoIcon, SaveIcon,
} from "lucide-react";
import { useCurrentProject } from "@/hooks/use-current-project.tsx";
import { useQuery as useRQQuery } from "convex/react";
import {
  SCHEMA_TYPES, buildJsonLdForType,
  type SchemaTypeDef,
} from "./_lib/schema-types.ts";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import type { GeneratedSchemaItem } from "@/convex/schema_markup/actions.ts";

export default function SchemaMarkupPage() {
  return (
    <>
      <AuthLoading><div className="p-8"><Skeleton className="h-64 w-full" /></div></AuthLoading>
      <Unauthenticated><div className="flex justify-center p-8"><SignInButton /></div></Unauthenticated>
      <Authenticated><SchemaMarkupContent /></Authenticated>
    </>
  );
}

function SchemaMarkupContent() {
  const { activeProjectId } = useCurrentProject();
  const projects = useRQQuery(api.projects.list, {});
  const project = projects?.find((p) => p._id === activeProjectId);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-muted-foreground">
        <CodeIcon className="h-12 w-12 opacity-30" />
        <div className="text-lg font-medium">No project selected</div>
        <div className="text-sm">Select a project to manage schema markup</div>
      </div>
    );
  }

  return <SchemaMarkupEditor project={project} />;
}

// ── AI Suite Generator panel ──────────────────────────────────────────────────

function AiSuitePanel({ project, onSaveAll }: {
  project: Doc<"projects">;
  onSaveAll: (items: GeneratedSchemaItem[]) => Promise<void>;
}) {
  const autoGenerate = useAction(api.schema_markup.actions.autoGenerateSchemaSuite);
  const [topic, setTopic] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [pageType, setPageType] = useState("blog_post");
  const [pageContent, setPageContent] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<GeneratedSchemaItem[] | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [open, setOpen] = useState(true);

  async function handleGenerate() {
    if (!topic.trim()) { toast.error("Enter a page topic first"); return; }
    setGenerating(true);
    setResults(null);
    try {
      const items = await autoGenerate({
        topic,
        pageUrl: pageUrl || undefined,
        pageType,
        pageContent: pageContent || undefined,
        businessContext: project.businessDescription ?? project.name,
        siteUrl: project.websiteUrl ?? undefined,
        organizationName: project.name,
        authorName: authorName || undefined,
      });
      setResults(items);
      toast.success(`Generated ${items.length} schema${items.length !== 1 ? "s" : ""} for your page`);
    } catch (e) {
      if (e instanceof ConvexError) toast.error((e.data as { message: string }).message);
      else toast.error("Generation failed — try again");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveAll() {
    if (!results?.length) return;
    setSaving(true);
    try {
      await onSaveAll(results);
      toast.success(`Saved ${results.length} schemas`);
      setResults(null);
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy(jsonld: Record<string, unknown>, idx: number) {
    const script = `<script type="application/ld+json">\n${JSON.stringify(jsonld, null, 2)}\n</script>`;
    await navigator.clipboard.writeText(script);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  const PAGE_TYPES = [
    ["blog_post", "Blog Post"],
    ["landing_page", "Landing Page"],
    ["local_business", "Local Business Page"],
    ["ecommerce", "E-commerce / Product"],
    ["organization", "About / Homepage"],
    ["other", "Other"],
  ] as const;

  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3.5 bg-gradient-to-r from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/15 transition-colors cursor-pointer"
        onClick={() => setOpen((o) => !o)}
      >
        <ZapIcon className="h-4 w-4 text-primary shrink-0" />
        <div className="flex-1 text-left">
          <div className="text-sm font-semibold">AI Auto-Generate Schema Suite</div>
          <div className="text-xs text-muted-foreground">Analyze any topic or page — AI picks the right schemas and fills them fully</div>
        </div>
        {open ? <ChevronUpIcon className="h-4 w-4 text-muted-foreground" /> : <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="p-4 space-y-4 border-t">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Page Topic / Title <span className="text-red-500">*</span></Label>
              <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. How to do keyword research for SEO" className="text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Page Type <span className="text-red-500">*</span></Label>
              <Select value={pageType} onValueChange={setPageType}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAGE_TYPES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Page URL (optional)</Label>
              <Input value={pageUrl} onChange={(e) => setPageUrl(e.target.value)} placeholder="https://example.com/blog/keyword-research" className="text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Author Name (optional)</Label>
              <Input value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder="Jane Smith" className="text-sm" />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-medium">Page Content Snippet (optional — improves accuracy)</Label>
            <Textarea
              value={pageContent}
              onChange={(e) => setPageContent(e.target.value)}
              placeholder="Paste a few paragraphs of your page content for more accurate schema generation…"
              className="text-sm resize-none h-20"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button onClick={() => void handleGenerate()} disabled={generating || !topic.trim()} className="cursor-pointer">
              <SparklesIcon className="h-4 w-4 mr-2" />
              {generating ? "Analyzing & generating…" : "Auto-Generate Schema Suite"}
            </Button>
            {generating && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <SparklesIcon className="h-3 w-3 animate-pulse text-primary" />
                AI is choosing the best schemas for your page…
              </span>
            )}
          </div>

          {results && results.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold flex items-center gap-2">
                  <CheckCircleIcon className="h-4 w-4 text-green-500" />
                  {results.length} schemas generated
                </div>
                <Button size="sm" onClick={() => void handleSaveAll()} disabled={saving} className="cursor-pointer">
                  <SaveIcon className="h-3.5 w-3.5 mr-1.5" />
                  {saving ? "Saving…" : `Save All ${results.length} Schemas`}
                </Button>
              </div>

              {results.map((item, idx) => (
                <div key={idx} className="rounded-lg border bg-card overflow-hidden">
                  <div
                    className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-accent/20 transition-colors"
                    onClick={() => setExpanded(expanded === idx ? null : idx)}
                  >
                    <Badge variant="secondary" className="text-[10px] shrink-0">{item.schemaType}</Badge>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{item.label}</div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <InfoIcon className="h-2.5 w-2.5 shrink-0" />{item.reasoning}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); void handleCopy(item.jsonld, idx); }}
                        className="text-[10px] flex items-center gap-1 text-muted-foreground hover:text-foreground cursor-pointer px-1.5 py-0.5 rounded hover:bg-muted transition-colors"
                      >
                        {copiedIdx === idx ? <CheckIcon className="h-3 w-3 text-green-500" /> : <CopyIcon className="h-3 w-3" />}
                        {copiedIdx === idx ? "Copied" : "Copy"}
                      </button>
                      {expanded === idx ? <ChevronUpIcon className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDownIcon className="h-3.5 w-3.5 text-muted-foreground" />}
                    </div>
                  </div>

                  {expanded === idx && (
                    <div className="border-t bg-muted/20">
                      <pre className="text-[10px] font-mono text-muted-foreground p-3 overflow-x-auto leading-relaxed whitespace-pre-wrap break-all max-h-64">
                        {`<script type="application/ld+json">\n${JSON.stringify(item.jsonld, null, 2)}\n</script>`}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type MobileView = "list" | "types" | "form" | "preview";

function SchemaMarkupEditor({ project }: { project: Doc<"projects"> }) {
  const [selectedType, setSelectedType] = useState<SchemaTypeDef | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [markupName, setMarkupName] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [editingId, setEditingId] = useState<Id<"schemaMarkups"> | null>(null);
  const [copied, setCopied] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [mobileView, setMobileView] = useState<MobileView>("list");

  const markups = useQuery(api.schema_markup.queries.list, { projectId: project._id });
  const createMarkup = useMutation(api.schema_markup.mutations.create);
  const updateMarkup = useMutation(api.schema_markup.mutations.update);
  const removeMarkup = useMutation(api.schema_markup.mutations.remove);
  const generateFields = useAction(api.schema_markup.actions.generateSchemaFields);

  const jsonld = useMemo(() => {
    if (!selectedType) return null;
    return buildJsonLdForType(selectedType.type, fieldValues);
  }, [selectedType, fieldValues]);

  const jsonldString = useMemo(() => {
    if (!jsonld) return "";
    return JSON.stringify(jsonld, null, 2);
  }, [jsonld]);

  const scriptTag = jsonldString
    ? `<script type="application/ld+json">\n${jsonldString}\n</script>`
    : "";

  function handleSelectType(typeDef: SchemaTypeDef) {
    setSelectedType(typeDef);
    setFieldValues({});
    setMarkupName(`${typeDef.label} Markup`);
    setEditingId(null);
    setMobileView("form");
  }

  function handleEdit(markup: Doc<"schemaMarkups">) {
    const typeDef = SCHEMA_TYPES.find((t) => t.type === markup.schemaType);
    if (!typeDef) return;
    setSelectedType(typeDef);
    setMarkupName(markup.name);
    setTargetUrl(markup.targetUrl ?? "");
    setEditingId(markup._id);
    try {
      const parsed = JSON.parse(markup.jsonld) as Record<string, unknown>;
      const flat: Record<string, string> = {};
      flattenObject(parsed, flat, "");
      setFieldValues(flat);
    } catch {
      setFieldValues({});
    }
    setMobileView("form");
  }

  function handleNewSchema() {
    setSelectedType(null);
    setEditingId(null);
    setFieldValues({});
    setMarkupName("");
    setMobileView("types");
  }

  async function handleAutoFill() {
    if (!selectedType) return;
    const context = project.businessDescription ?? project.name;
    setAiLoading(true);
    try {
      const fields = await generateFields({
        schemaType: selectedType.type,
        businessContext: context,
        targetUrl: targetUrl || undefined,
      });
      setFieldValues((prev) => ({ ...prev, ...fields }));
      toast.success("Fields auto-filled with AI");
    } catch {
      toast.error("AI fill failed");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSave() {
    if (!selectedType || !markupName.trim()) {
      toast.error("Please select a schema type and enter a name");
      return;
    }
    try {
      if (editingId) {
        await updateMarkup({ id: editingId, name: markupName, jsonld: jsonldString, targetUrl: targetUrl || undefined, schemaType: selectedType.type });
        toast.success("Schema markup updated");
      } else {
        await createMarkup({
          projectId: project._id,
          name: markupName,
          schemaType: selectedType.type,
          jsonld: jsonldString,
          targetUrl: targetUrl || undefined,
          isActive: true,
        });
        toast.success("Schema markup saved");
      }
      setSelectedType(null);
      setFieldValues({});
      setMarkupName("");
      setEditingId(null);
      setMobileView("list");
    } catch (e) {
      if (e instanceof ConvexError) toast.error((e.data as { message: string }).message);
      else toast.error("Failed to save markup");
    }
  }

  async function handleDelete(id: Id<"schemaMarkups">) {
    try {
      await removeMarkup({ id });
      toast.success("Deleted");
      if (editingId === id) { setSelectedType(null); setEditingId(null); setMobileView("list"); }
    } catch { toast.error("Failed to delete"); }
  }

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSaveAll(items: GeneratedSchemaItem[]) {
    for (const item of items) {
      await createMarkup({
        projectId: project._id,
        name: item.label,
        schemaType: item.schemaType,
        jsonld: JSON.stringify(item.jsonld, null, 2),
        isActive: true,
      });
    }
  }

  // ─── Panels ───────────────────────────────────────────────────────────────

  const savedListPanel = (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b text-xs font-semibold uppercase tracking-wide text-muted-foreground shrink-0">
        Saved Schemas
      </div>
      <div className="flex-1 overflow-y-auto">
        {markups === undefined ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : markups.length === 0 ? (
          <div className="p-4 text-xs text-muted-foreground text-center py-8">
            No schemas yet. Use the AI generator above or tap "New Schema".
          </div>
        ) : (
          <div className="divide-y">
            {markups.map((m) => (
              <div
                key={m._id}
                className={`flex items-start gap-2 px-4 py-3 hover:bg-accent/20 cursor-pointer transition-colors ${editingId === m._id ? "bg-accent/30" : ""}`}
                onClick={() => handleEdit(m)}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{m.name}</div>
                  <Badge variant="secondary" className="text-xs mt-0.5">{m.schemaType}</Badge>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); void handleDelete(m._id); }}
                  className="text-muted-foreground hover:text-destructive mt-0.5 cursor-pointer"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="p-3 border-t shrink-0">
        <Button size="sm" variant="secondary" className="w-full cursor-pointer" onClick={handleNewSchema}>
          <PlusIcon className="h-3.5 w-3.5 mr-1.5" />New Schema
        </Button>
      </div>
    </div>
  );

  const typeSelectorPanel = (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <button
          className="lg:hidden text-muted-foreground hover:text-foreground cursor-pointer"
          onClick={() => setMobileView("list")}
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-base font-semibold">Choose a Schema Type</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Select the type of structured data to create</p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {SCHEMA_TYPES.map((typeDef) => (
          <button
            key={typeDef.type}
            onClick={() => handleSelectType(typeDef)}
            className="text-left rounded-xl border p-3 sm:p-4 hover:border-primary hover:bg-accent/20 transition-all cursor-pointer"
          >
            <div className="text-xl sm:text-2xl mb-1.5 sm:mb-2">{typeDef.icon}</div>
            <div className="text-xs sm:text-sm font-semibold leading-tight">{typeDef.label}</div>
            <div className="text-[10px] sm:text-xs text-muted-foreground mt-1 line-clamp-2">{typeDef.description}</div>
          </button>
        ))}
      </div>
    </div>
  );

  const formPanel = selectedType ? (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <button
          className="lg:hidden text-muted-foreground hover:text-foreground cursor-pointer"
          onClick={() => setMobileView("types")}
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <span className="text-xl sm:text-2xl">{selectedType.icon}</span>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm sm:text-base font-semibold">{selectedType.label} Schema</h2>
          <p className="text-xs text-muted-foreground">{selectedType.description}</p>
        </div>
        <button onClick={() => { setSelectedType(null); setMobileView("list"); }} className="text-muted-foreground hover:text-foreground cursor-pointer shrink-0">
          <XIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-medium">Schema Name</Label>
          <Input value={markupName} onChange={(e) => setMarkupName(e.target.value)} className="mt-1 text-sm" placeholder="e.g. Homepage FAQ" />
        </div>
        <div>
          <Label className="text-xs font-medium">Target Page URL (optional)</Label>
          <Input value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} className="mt-1 text-sm" placeholder="https://example.com/page" />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button variant="secondary" size="sm" onClick={handleAutoFill} disabled={aiLoading} className="cursor-pointer">
          <SparklesIcon className="h-3.5 w-3.5 mr-1.5" />
          {aiLoading ? "Filling…" : "AI Auto-fill"}
        </Button>
        {jsonldString && (
          <Button variant="ghost" size="sm" className="lg:hidden cursor-pointer" onClick={() => setMobileView("preview")}>
            <EyeIcon className="h-3.5 w-3.5 mr-1.5" />Preview JSON-LD
          </Button>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {selectedType.fields.map((field) => (
          <div key={field.key} className={field.type === "textarea" ? "sm:col-span-2" : ""}>
            <Label className="text-xs font-medium">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {field.hint && <div className="text-xs text-muted-foreground">{field.hint}</div>}
            {field.type === "textarea" ? (
              <Textarea
                value={fieldValues[field.key] ?? ""}
                onChange={(e) => setFieldValues((p) => ({ ...p, [field.key]: e.target.value }))}
                className="mt-1 text-sm min-h-[80px]"
                placeholder={field.placeholder}
              />
            ) : field.type === "select" ? (
              <Select
                value={fieldValues[field.key] ?? ""}
                onValueChange={(v) => setFieldValues((p) => ({ ...p, [field.key]: v }))}
              >
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {(field.options ?? []).map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                type={field.type === "date" ? "date" : "text"}
                value={fieldValues[field.key] ?? ""}
                onChange={(e) => setFieldValues((p) => ({ ...p, [field.key]: e.target.value }))}
                className="mt-1 text-sm"
                placeholder={field.placeholder}
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-2">
        <Button onClick={handleSave} className="cursor-pointer">
          <CheckCircleIcon className="h-4 w-4 mr-1.5" />
          {editingId ? "Update Schema" : "Save Schema"}
        </Button>
      </div>
    </div>
  ) : null;

  const previewPanel = (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <button
            className="lg:hidden text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={() => setMobileView(selectedType ? "form" : "list")}
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">JSON-LD Preview</span>
        </div>
        {scriptTag && (
          <button
            onClick={() => void handleCopy(scriptTag)}
            className="text-xs flex items-center gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            {copied ? <CheckIcon className="h-3.5 w-3.5 text-green-600" /> : <CopyIcon className="h-3.5 w-3.5" />}
            {copied ? "Copied!" : "Copy tag"}
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {jsonldString ? (
          <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all bg-muted/30 rounded-lg p-3 leading-relaxed">
            {scriptTag}
          </pre>
        ) : (
          <div className="text-xs text-muted-foreground text-center py-12">
            Fill in the fields to see the JSON-LD output
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-4 sm:px-6 py-4 shrink-0">
        <h1 className="text-lg sm:text-xl font-bold">Schema Markup Builder</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Generate JSON-LD structured data for rich search results</p>
      </div>

      <div className="px-4 sm:px-6 py-4 border-b shrink-0">
        <AiSuitePanel project={project} onSaveAll={handleSaveAll} />
      </div>

      {/* Desktop: 3-column layout (lg+) */}
      <div className="hidden lg:flex flex-1 overflow-hidden">
        <div className="w-72 border-r flex flex-col overflow-hidden shrink-0">
          {savedListPanel}
        </div>
        <div className="flex-1 overflow-y-auto">
          {!selectedType ? typeSelectorPanel : formPanel}
        </div>
        <div className="w-[360px] border-l flex flex-col overflow-hidden shrink-0">
          {previewPanel}
        </div>
      </div>

      {/* Mobile / Tablet: single-panel with nav (< lg) */}
      <div className="lg:hidden flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {mobileView === "list" && savedListPanel}
          {mobileView === "types" && typeSelectorPanel}
          {mobileView === "form" && (selectedType ? formPanel : typeSelectorPanel)}
          {mobileView === "preview" && previewPanel}
        </div>
        <div className="border-t bg-background shrink-0 flex">
          <button
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs cursor-pointer transition-colors ${mobileView === "list" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setMobileView("list")}
          >
            <ListIcon className="h-4 w-4" />Schemas
          </button>
          <button
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs cursor-pointer transition-colors ${mobileView === "types" || mobileView === "form" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => mobileView === "form" && selectedType ? setMobileView("form") : setMobileView(selectedType ? "form" : "types")}
          >
            <CodeIcon className="h-4 w-4" />Builder
          </button>
          <button
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs cursor-pointer transition-colors ${mobileView === "preview" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setMobileView("preview")}
          >
            <EyeIcon className="h-4 w-4" />Preview
          </button>
        </div>
      </div>
    </div>
  );
}

/** Best-effort flatten a JSON-LD object back into dotted field keys */
function flattenObject(obj: Record<string, unknown>, result: Record<string, string>, prefix: string): void {
  for (const [key, value] of Object.entries(obj)) {
    if (key === "@context" || key === "@type") continue;
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      result[fullKey] = String(value);
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      flattenObject(value as Record<string, unknown>, result, fullKey);
    }
  }
}
