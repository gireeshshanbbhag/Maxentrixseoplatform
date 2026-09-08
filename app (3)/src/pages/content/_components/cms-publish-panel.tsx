/**
 * CmsPublishPanel — shows platform-specific CMS publish fields based on the
 * active connection (WordPress, Webflow, Wix, Squarespace, generic).
 *
 * - Fetches categories/tags from WP REST API
 * - Lets user pick a featured image from Unsplash (royalty-free, no attribution required for editorial use)
 * - Maps all fields to the correct API on publish
 */

import { useState, useEffect } from "react";
import React from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import {
  SendIcon, SaveIcon, RefreshCwIcon, CheckCircleIcon, ExternalLinkIcon,
  ImageIcon, XIcon, SearchIcon, TagIcon, FolderIcon, GlobeIcon, AlertCircleIcon,
} from "lucide-react";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

type WpTerm = { id: number; name: string; slug: string };

type FeaturedImageResult = {
  id: string;
  url: string;
  thumb: string;
  alt: string;
  photographer: string;
  photographerUrl: string;
  source: "unsplash" | "pexels";
};

// ─── Unsplash image search (uses public Unsplash search, no key required for demo) ──
// We use Unsplash Source for random images by query (no API key needed)
// and Unsplash API for search results
async function searchUnsplash(query: string): Promise<FeaturedImageResult[]> {
  // Use the public Unsplash source endpoint to get random images by topic
  // Format: https://source.unsplash.com/featured/?{topic}
  // For a proper search experience, we use the Unsplash random photo endpoint
  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=12&orientation=landscape`,
    {
      headers: {
        // Public demo key — works for low-volume use
        Authorization: "Client-ID w_ub9lqJbYqyHc3Qo6Sk6Jjr3M_wNLj8XG_P-I_yMIY",
      },
    }
  );
  if (!res.ok) {
    // Fallback: use static topic-based URLs from Unsplash
    return getFallbackImages(query);
  }
  const data = await res.json() as {
    results?: Array<{
      id: string;
      urls: { regular: string; thumb: string };
      alt_description: string | null;
      user: { name: string; links: { html: string } };
    }>;
  };
  return (data.results ?? []).map((img) => ({
    id: img.id,
    url: img.urls.regular,
    thumb: img.urls.thumb,
    alt: img.alt_description ?? query,
    photographer: img.user.name,
    photographerUrl: img.user.links.html,
    source: "unsplash" as const,
  }));
}

function getFallbackImages(query: string): FeaturedImageResult[] {
  // Generate 8 Unsplash Source URLs (always free, no attribution required by Unsplash Source)
  const seeds = ["nature", "technology", "business", "minimal", "abstract", "work", "office", "creative"];
  return seeds.map((seed, i) => ({
    id: `fallback-${i}`,
    url: `https://source.unsplash.com/1200x630/?${encodeURIComponent(query)}&sig=${i}`,
    thumb: `https://source.unsplash.com/400x280/?${encodeURIComponent(query)},${seed}&sig=${i}`,
    alt: `${query} image ${i + 1}`,
    photographer: "Unsplash",
    photographerUrl: "https://unsplash.com",
    source: "unsplash" as const,
  }));
}

// ─── Featured Image Picker ────────────────────────────────────────────────────

function FeaturedImagePicker({
  value,
  onChange,
  defaultQuery,
}: {
  value: string;
  onChange: (url: string) => void;
  defaultQuery: string;
}) {
  const [query, setQuery] = useState(defaultQuery);
  const [results, setResults] = useState<FeaturedImageResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const imgs = await searchUnsplash(query.trim());
      setResults(imgs);
      setHasSearched(true);
    } catch {
      setResults(getFallbackImages(query));
      setHasSearched(true);
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="space-y-3">
      <Label className="text-xs font-medium flex items-center gap-1.5">
        <ImageIcon className="h-3.5 w-3.5" />Featured Image
      </Label>

      {/* Current image preview */}
      {value && (
        <div className="relative rounded-lg overflow-hidden border group">
          <img src={value} alt="Featured" className="w-full h-32 object-cover" />
          <button
            onClick={() => onChange("")}
            className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            <XIcon className="h-3.5 w-3.5" />
          </button>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
            <p className="text-[10px] text-white/80">Photo from Unsplash — free to use</p>
          </div>
        </div>
      )}

      {/* Custom URL input */}
      <div className="space-y-1">
        <div className="flex gap-1.5">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Paste image URL or search below…"
            className="text-xs h-7 flex-1"
          />
        </div>
      </div>

      {/* Search Unsplash */}
      <div className="rounded-lg border bg-muted/20 p-3 space-y-2.5">
        <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
          Search free royalty-free photos (Unsplash)
        </div>
        <div className="flex gap-1.5">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleSearch()}
            placeholder="e.g. content marketing, SEO…"
            className="text-xs h-7 flex-1"
          />
          <Button size="sm" className="h-7 text-xs cursor-pointer" onClick={() => void handleSearch()} disabled={searching}>
            {searching ? <RefreshCwIcon className="h-3 w-3 animate-spin" /> : <SearchIcon className="h-3 w-3" />}
          </Button>
        </div>

        {!hasSearched && (
          <p className="text-[10px] text-muted-foreground">
            All Unsplash photos are free to use without attribution under the Unsplash License.
          </p>
        )}

        {results.length > 0 && (
          <div className="grid grid-cols-3 gap-1.5">
            {results.map((img) => (
              <button
                key={img.id}
                onClick={() => onChange(img.url)}
                className={`relative rounded overflow-hidden border-2 transition-all cursor-pointer ${value === img.url ? "border-primary" : "border-transparent hover:border-primary/50"}`}
              >
                <img src={img.thumb} alt={img.alt} className="w-full h-16 object-cover" />
                {value === img.url && (
                  <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                    <CheckCircleIcon className="h-4 w-4 text-primary" />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Reusable chip-input component ────────────────────────────────────────────

function ChipInput({
  label,
  icon,
  chips,
  onAdd,
  onRemove,
  placeholder,
  prefix = "",
}: {
  label: string;
  icon?: React.ReactNode;
  chips: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  placeholder?: string;
  prefix?: string;
}) {
  const [input, setInput] = useState("");

  function handleAdd() {
    const val = input.trim();
    if (!val) return;
    onAdd(val);
    setInput("");
  }

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium flex items-center gap-1.5">
        {icon}{label}
      </Label>
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <button
              key={chip}
              onClick={() => onRemove(chip)}
              className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-0.5 cursor-pointer hover:bg-primary/20 transition-colors"
            >
              {prefix}{chip} <XIcon className="h-2.5 w-2.5 ml-0.5" />
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-1.5">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
          placeholder={placeholder ?? `Add ${label.toLowerCase()}…`}
          className="text-xs h-7 flex-1"
        />
        <Button size="sm" variant="secondary" className="h-7 text-xs cursor-pointer" onClick={handleAdd}>
          Add
        </Button>
      </div>
    </div>
  );
}

// ─── WordPress-specific fields ────────────────────────────────────────────────

function WordPressFields({
  conn,
  fields,
  onChange,
}: {
  conn: Doc<"cmsConnections">;
  fields: WpPublishFields;
  onChange: (f: Partial<WpPublishFields>) => void;
}) {
  const [wpCategories, setWpCategories] = useState<WpTerm[]>([]);
  const [wpTags, setWpTags] = useState<WpTerm[]>([]);
  const [loadingTerms, setLoadingTerms] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [creatingTag, setCreatingTag] = useState(false);

  useEffect(() => {
    void fetchTerms();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conn._id]);

  async function fetchTerms() {
    setLoadingTerms(true);
    try {
      const base = conn.siteUrl?.replace(/\/$/, "") ?? "";
      const auth = `Basic ${conn.credentials}`;
      const [catRes, tagRes] = await Promise.all([
        fetch(`${base}/wp-json/wp/v2/categories?per_page=100`, { headers: { Authorization: auth } }),
        fetch(`${base}/wp-json/wp/v2/tags?per_page=100`, { headers: { Authorization: auth } }),
      ]);
      if (catRes.ok) setWpCategories(await catRes.json() as WpTerm[]);
      if (tagRes.ok) setWpTags(await tagRes.json() as WpTerm[]);
    } catch {
      // Silently ignore — connection may not be live in dev
    } finally {
      setLoadingTerms(false);
    }
  }

  function toggleCategory(id: number) {
    const current = fields.categories ?? [];
    onChange({ categories: current.includes(id) ? current.filter((c) => c !== id) : [...current, id] });
  }

  function toggleTag(id: number) {
    const current = fields.tags ?? [];
    onChange({ tags: current.includes(id) ? current.filter((t) => t !== id) : [...current, id] });
  }

  // Create a brand-new category directly on WP via API
  async function handleCreateCategory(name: string) {
    const base = conn.siteUrl?.replace(/\/$/, "") ?? "";
    const auth = `Basic ${conn.credentials}`;
    setCreatingCategory(true);
    try {
      const res = await fetch(`${base}/wp-json/wp/v2/categories`, {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const newCat = await res.json() as WpTerm;
        setWpCategories((prev) => [...prev, newCat]);
        onChange({ categories: [...(fields.categories ?? []), newCat.id] });
        toast.success(`Category "${name}" created`);
      } else {
        // Fall back to creating via newCategoryNames (resolved on publish)
        onChange({ newCategoryNames: [...(fields.newCategoryNames ?? []), name] });
        toast.info(`Category "${name}" will be created on publish`);
      }
    } catch {
      onChange({ newCategoryNames: [...(fields.newCategoryNames ?? []), name] });
      toast.info(`Category "${name}" will be created on publish`);
    } finally {
      setCreatingCategory(false);
    }
  }

  // Create a brand-new tag directly on WP via API
  async function handleCreateTag(name: string) {
    const base = conn.siteUrl?.replace(/\/$/, "") ?? "";
    const auth = `Basic ${conn.credentials}`;
    setCreatingTag(true);
    try {
      const res = await fetch(`${base}/wp-json/wp/v2/tags`, {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const newTag = await res.json() as WpTerm;
        setWpTags((prev) => [...prev, newTag]);
        onChange({ tags: [...(fields.tags ?? []), newTag.id] });
        toast.success(`Tag "${name}" created`);
      } else {
        onChange({ newTagNames: [...(fields.newTagNames ?? []), name] });
        toast.info(`Tag "${name}" will be created on publish`);
      }
    } catch {
      onChange({ newTagNames: [...(fields.newTagNames ?? []), name] });
      toast.info(`Tag "${name}" will be created on publish`);
    } finally {
      setCreatingTag(false);
    }
  }

  function removePendingCategory(name: string) {
    onChange({ newCategoryNames: (fields.newCategoryNames ?? []).filter((n) => n !== name) });
  }

  function removePendingTag(name: string) {
    onChange({ newTagNames: (fields.newTagNames ?? []).filter((n) => n !== name) });
  }

  return (
    <div className="space-y-4">
      {/* Excerpt */}
      <div className="space-y-1">
        <Label className="text-xs font-medium">Excerpt (optional)</Label>
        <Textarea
          value={fields.excerpt ?? ""}
          onChange={(e) => onChange({ excerpt: e.target.value })}
          placeholder="Short post excerpt shown in listings…"
          className="text-xs resize-none h-16"
        />
      </div>

      {/* Slug */}
      <div className="space-y-1">
        <Label className="text-xs font-medium">URL Slug (optional)</Label>
        <Input
          value={fields.slug ?? ""}
          onChange={(e) => onChange({ slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
          placeholder="my-post-url-slug"
          className="text-xs h-7 font-mono"
        />
      </div>

      {/* Categories — blog posts only */}
      {fields.postType !== "page" && (
      <div className="space-y-2">
        <Label className="text-xs font-medium flex items-center gap-1.5">
          <FolderIcon className="h-3.5 w-3.5" />Categories
          {(loadingTerms || creatingCategory) && <RefreshCwIcon className="h-3 w-3 animate-spin ml-1" />}
        </Label>

        {/* Existing WP categories — click to select */}
        {wpCategories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {wpCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => toggleCategory(cat.id)}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${(fields.categories ?? []).includes(cat.id) ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
        {wpCategories.length === 0 && !loadingTerms && (
          <p className="text-[10px] text-muted-foreground">
            No categories found.{" "}
            <button onClick={() => void fetchTerms()} className="underline cursor-pointer">Retry</button>
          </p>
        )}

        {/* Pending new categories (to be created on publish) */}
        {(fields.newCategoryNames ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {(fields.newCategoryNames ?? []).map((name) => (
              <button
                key={name}
                onClick={() => removePendingCategory(name)}
                className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-400/30 flex items-center gap-0.5 cursor-pointer hover:bg-amber-500/20 transition-colors"
              >
                + {name} <XIcon className="h-2.5 w-2.5 ml-0.5" />
              </button>
            ))}
          </div>
        )}

        {/* Create new category */}
        <ChipInput
          label=""
          chips={[]}
          onAdd={handleCreateCategory}
          onRemove={() => {}}
          placeholder="Create new category…"
          icon={<FolderIcon className="h-3 w-3 text-muted-foreground" />}
        />
        <p className="text-[10px] text-muted-foreground -mt-1">
          New categories are created on your WP site immediately (if connected) or on publish.
        </p>
      </div>
      )}

      {/* Tags — blog posts only */}
      {fields.postType !== "page" && (
      <div className="space-y-2">
        <Label className="text-xs font-medium flex items-center gap-1.5">
          <TagIcon className="h-3.5 w-3.5" />Tags
          {creatingTag && <RefreshCwIcon className="h-3 w-3 animate-spin ml-1" />}
        </Label>

        {/* Existing WP tags — click to select */}
        {wpTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {wpTags.slice(0, 40).map((tag) => (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${(fields.tags ?? []).includes(tag.id) ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
              >
                #{tag.name}
              </button>
            ))}
          </div>
        )}

        {/* Pending new tags */}
        {(fields.newTagNames ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {(fields.newTagNames ?? []).map((t) => (
              <button
                key={t}
                onClick={() => removePendingTag(t)}
                className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-0.5 cursor-pointer hover:bg-primary/20 transition-colors"
              >
                #{t} <XIcon className="h-2.5 w-2.5 ml-0.5" />
              </button>
            ))}
          </div>
        )}

        {/* Create new tag */}
        <ChipInput
          label=""
          chips={[]}
          onAdd={handleCreateTag}
          onRemove={() => {}}
          placeholder="Create new tag…"
          icon={<TagIcon className="h-3 w-3 text-muted-foreground" />}
        />
        <p className="text-[10px] text-muted-foreground -mt-1">
          New tags are created on your WP site immediately (if connected) or on publish.
        </p>
      </div>
      )}

      {/* Post type */}
      <div className="space-y-1">
        <Label className="text-xs font-medium">Post Type</Label>
        <div className="flex gap-2">
          {["post", "page"].map((t) => (
            <button
              key={t}
              onClick={() => onChange({ postType: t as "post" | "page" })}
              className={`text-xs px-3 py-1 rounded border transition-colors cursor-pointer capitalize ${fields.postType === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Webflow fields ───────────────────────────────────────────────────────────

function WebflowFields({
  fields,
  onChange,
}: {
  fields: GenericPublishFields;
  onChange: (f: Partial<GenericPublishFields>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 px-3 py-2 flex items-start gap-2">
        <AlertCircleIcon className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Webflow publishing via API requires a CMS Collection. The content will be created as a new Collection item.
        </p>
      </div>
      <div className="space-y-1">
        <Label className="text-xs font-medium">Collection ID</Label>
        <Input
          value={fields.collectionId ?? ""}
          onChange={(e) => onChange({ collectionId: e.target.value })}
          placeholder="Webflow CMS Collection ID…"
          className="text-xs h-7 font-mono"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs font-medium">Slug (optional)</Label>
        <Input
          value={fields.slug ?? ""}
          onChange={(e) => onChange({ slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
          placeholder="my-article-slug"
          className="text-xs h-7 font-mono"
        />
      </div>
    </div>
  );
}

// ─── Wix fields ───────────────────────────────────────────────────────────────

function WixFields({
  fields,
  onChange,
}: {
  fields: GenericPublishFields;
  onChange: (f: Partial<GenericPublishFields>) => void;
}) {
  // Parse comma-separated strings into arrays for chip display
  const categoryChips = (fields.categoryNames ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const tagChips = (fields.tagNames ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  function addCategory(name: string) {
    const updated = [...categoryChips, name].filter(Boolean);
    onChange({ categoryNames: updated.join(", ") });
  }
  function removeCategory(name: string) {
    onChange({ categoryNames: categoryChips.filter((c) => c !== name).join(", ") });
  }
  function addTag(name: string) {
    const updated = [...tagChips, name].filter(Boolean);
    onChange({ tagNames: updated.join(", ") });
  }
  function removeTag(name: string) {
    onChange({ tagNames: tagChips.filter((t) => t !== name).join(", ") });
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 px-3 py-2 flex items-start gap-2">
        <AlertCircleIcon className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 dark:text-blue-300">
          Wix Blog posts are created via the Wix Blog API. Categories and tags must match existing ones in your Wix site.
        </p>
      </div>
      <ChipInput
        label="Categories"
        icon={<FolderIcon className="h-3.5 w-3.5" />}
        chips={categoryChips}
        onAdd={addCategory}
        onRemove={removeCategory}
        placeholder="Add category…"
      />
      <ChipInput
        label="Tags"
        icon={<TagIcon className="h-3.5 w-3.5" />}
        chips={tagChips}
        onAdd={addTag}
        onRemove={removeTag}
        placeholder="Add tag…"
      />
    </div>
  );
}

// ─── Squarespace fields ───────────────────────────────────────────────────────

function SquarespaceFields({
  fields,
  onChange,
}: {
  fields: GenericPublishFields;
  onChange: (f: Partial<GenericPublishFields>) => void;
}) {
  const tagChips = (fields.tagNames ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  function addTag(name: string) {
    onChange({ tagNames: [...tagChips, name].join(", ") });
  }
  function removeTag(name: string) {
    onChange({ tagNames: tagChips.filter((t) => t !== name).join(", ") });
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-muted/30 px-3 py-2 flex items-start gap-2">
        <AlertCircleIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Squarespace has limited API publishing support. This will create a draft blog post.
        </p>
      </div>
      <div className="space-y-1">
        <Label className="text-xs font-medium">Collection ID (Blog)</Label>
        <Input
          value={fields.collectionId ?? ""}
          onChange={(e) => onChange({ collectionId: e.target.value })}
          placeholder="Squarespace Blog collection ID…"
          className="text-xs h-7 font-mono"
        />
      </div>
      <ChipInput
        label="Tags"
        icon={<TagIcon className="h-3.5 w-3.5" />}
        chips={tagChips}
        onAdd={addTag}
        onRemove={removeTag}
        placeholder="Add tag…"
      />
    </div>
  );
}

// ─── Field state types ────────────────────────────────────────────────────────

export type WpPublishFields = {
  featuredImageUrl?: string;
  categories?: number[];
  tags?: number[];
  newTagNames?: string[];
  newCategoryNames?: string[];
  excerpt?: string;
  slug?: string;
  postType?: "post" | "page";
};

export type GenericPublishFields = {
  featuredImageUrl?: string;
  slug?: string;
  collectionId?: string;
  categoryNames?: string;
  tagNames?: string;
};

export type PublishPayload = {
  featuredImageUrl?: string;
  categories?: number[];
  tags?: number[];
  newTagNames?: string[];
  newCategoryNames?: string[];
  excerpt?: string;
  slug?: string;
  postType?: "post" | "page";
  collectionId?: string;
  categoryNames?: string;
  tagNames?: string;
};

// ─── Main CMS publish panel ───────────────────────────────────────────────────

type CmsPublishPanelProps = {
  projectId: Id<"projects">;
  title: string;
  contentHtml: string;
  metaTitle?: string;
  metaDescription?: string;
  keyword?: string;
  onPublishSuccess?: (url?: string) => void;
};

export default function CmsPublishPanel({
  projectId,
  title,
  contentHtml,
  metaTitle,
  metaDescription,
  keyword,
  onPublishSuccess,
}: CmsPublishPanelProps) {
  const connections = useQuery(api.cms.queries.listConnections, { projectId });
  const publishContentToCms = useAction(api.content.actions.publishContentToCms);

  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ url?: string; error?: string } | null>(null);
  const [wpFields, setWpFields] = useState<WpPublishFields>({ postType: "post" });
  const [genericFields, setGenericFields] = useState<GenericPublishFields>({});

  const activeConn = connections?.find((c) => c.status === "active");
  const platform = activeConn?.platform ?? "none";
  const searchQuery = keyword || title;

  async function handlePublish(status: "draft" | "publish") {
    if (!title.trim()) { toast.error("Enter a title first"); return; }
    if (!activeConn) { toast.error("No active CMS connection"); return; }
    setPublishing(true);
    setPublishResult(null);

    // Merge all extra fields into the action payload
    const extra: PublishPayload = platform === "wordpress"
      ? {
          featuredImageUrl: wpFields.featuredImageUrl,
          categories: wpFields.categories,
          tags: wpFields.tags,
          newTagNames: wpFields.newTagNames,
          newCategoryNames: wpFields.newCategoryNames,
          excerpt: wpFields.excerpt,
          slug: wpFields.slug,
          postType: wpFields.postType,
        }
      : {
          featuredImageUrl: genericFields.featuredImageUrl,
          slug: genericFields.slug,
          collectionId: genericFields.collectionId,
          categoryNames: genericFields.categoryNames,
          tagNames: genericFields.tagNames,
        };

    try {
      const result = await publishContentToCms({
        projectId,
        title,
        content: contentHtml,
        metaTitle: metaTitle || undefined,
        metaDescription: metaDescription || undefined,
        status,
        featuredImageUrl: extra.featuredImageUrl,
        categories: extra.categories,
        tags: extra.tags,
        newTagNames: extra.newTagNames,
        newCategoryNames: extra.newCategoryNames,
        excerpt: extra.excerpt,
        slug: extra.slug,
        postType: extra.postType,
        collectionId: extra.collectionId,
        categoryNames: extra.categoryNames,
        tagNames: extra.tagNames,
      });
      setPublishResult({ url: result.postUrl });
      onPublishSuccess?.(result.postUrl);
      toast.success(status === "publish" ? "Published to your website!" : "Saved as draft in CMS");
    } catch (e) {
      const msg = e instanceof ConvexError ? (e.data as { message: string }).message : "Publish failed";
      setPublishResult({ error: msg });
      toast.error(msg);
    } finally {
      setPublishing(false);
    }
  }

  if (connections === undefined) {
    return <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>;
  }

  return (
    <div className="rounded-xl border bg-card space-y-4 overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-0">
        <div className="flex items-center gap-2">
          <SendIcon className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-semibold">Publish to Website</span>
          {activeConn && (
            <Badge variant="secondary" className="text-[10px] capitalize ml-auto">{activeConn.platform}</Badge>
          )}
        </div>
      </div>

      {/* No connection state */}
      {!activeConn && (
        <div className="px-4 pb-4">
          <div className="rounded-lg border bg-muted/30 px-3 py-3 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-medium">
              <GlobeIcon className="h-3.5 w-3.5 text-muted-foreground" />
              No CMS connected
            </div>
            <p className="text-xs text-muted-foreground">
              Connect a CMS to publish. Go to <strong>CMS → CMS Connections</strong> to connect WordPress, Webflow, Wix, or Squarespace.
            </p>
          </div>
        </div>
      )}

      {/* Active connection fields */}
      {activeConn && (
        <div className="px-4 pb-4 space-y-4">
          {/* Success/error feedback */}
          {publishResult?.url && (
            <div className="flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-2 text-xs text-green-700 dark:text-green-300">
              <CheckCircleIcon className="h-3.5 w-3.5 shrink-0" />
              Published!{" "}
              <a href={publishResult.url} target="_blank" rel="noopener noreferrer" className="underline hover:no-underline flex items-center gap-0.5 ml-1">
                View post <ExternalLinkIcon className="h-3 w-3" />
              </a>
            </div>
          )}
          {publishResult?.error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-700 dark:text-red-300">
              {publishResult.error}
            </div>
          )}

          {/* Featured image picker — blog posts only */}
          {(platform !== "wordpress" || wpFields.postType !== "page") && (
          <FeaturedImagePicker
            value={platform === "wordpress" ? (wpFields.featuredImageUrl ?? "") : (genericFields.featuredImageUrl ?? "")}
            onChange={(url) => {
              if (platform === "wordpress") setWpFields((p) => ({ ...p, featuredImageUrl: url }));
              else setGenericFields((p) => ({ ...p, featuredImageUrl: url }));
            }}
            defaultQuery={searchQuery}
          />
          )}

          {/* Platform-specific fields */}
          {platform === "wordpress" && (
            <WordPressFields
              conn={activeConn}
              fields={wpFields}
              onChange={(f) => setWpFields((p) => ({ ...p, ...f }))}
            />
          )}
          {platform === "webflow" && (
            <WebflowFields
              fields={genericFields}
              onChange={(f) => setGenericFields((p) => ({ ...p, ...f }))}
            />
          )}
          {platform === "wix" && (
            <WixFields
              fields={genericFields}
              onChange={(f) => setGenericFields((p) => ({ ...p, ...f }))}
            />
          )}
          {platform === "squarespace" && (
            <SquarespaceFields
              fields={genericFields}
              onChange={(f) => setGenericFields((p) => ({ ...p, ...f }))}
            />
          )}

          {/* Publish buttons */}
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void handlePublish("draft")}
              disabled={publishing || !title.trim()}
              className="cursor-pointer flex-1"
            >
              {publishing ? <RefreshCwIcon className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <SaveIcon className="h-3.5 w-3.5 mr-1.5" />}
              Save Draft
            </Button>
            <Button
              size="sm"
              onClick={() => void handlePublish("publish")}
              disabled={publishing || !title.trim()}
              className="cursor-pointer flex-1"
            >
              {publishing ? <RefreshCwIcon className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <SendIcon className="h-3.5 w-3.5 mr-1.5" />}
              Publish Live
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
