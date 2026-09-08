import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { ChevronDownIcon } from "lucide-react";
import LocationSelector, { type LocationValue } from "@/components/location-selector.tsx";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: Id<"projects">;
  projectCountry?: string;
};

export default function AddKeywordDialog({ open, onOpenChange, projectId, projectCountry }: Props) {
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [keyword, setKeyword] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [intent, setIntent] = useState<string>("none");
  const [priority, setPriority] = useState<string>("medium");
  const [targetUrl, setTargetUrl] = useState("");
  const [location, setLocation] = useState<LocationValue>({ country: projectCountry });
  const [locationOpen, setLocationOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const addKeyword = useMutation(api.keywords.mutations.addKeyword);
  const addKeywordsBulk = useMutation(api.keywords.mutations.addKeywordsBulk);

  function locationLabel(loc: LocationValue): string {
    const parts = [loc.city, loc.district, loc.state, loc.country].filter(Boolean);
    if (parts.length === 0) return "Global";
    if (parts.length === 1 && parts[0] === projectCountry) return "Project default";
    return parts.join(", ");
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      if (mode === "single") {
        if (!keyword.trim()) {
          toast.error("Please enter a keyword");
          return;
        }
        await addKeyword({
          projectId,
          keyword: keyword.trim(),
          intent: intent === "none" ? undefined : intent,
          priority,
          targetUrl: targetUrl.trim() || undefined,
          country: location.country,
          state: location.state,
          district: location.district,
          city: location.city,
          source: "manual",
        });
        toast.success(`"${keyword.trim()}" added — tracking for ${locationLabel(location)}`);
        setKeyword("");
        setTargetUrl("");
        onOpenChange(false);
      } else {
        const lines = bulkText
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
        if (lines.length === 0) {
          toast.error("Please enter at least one keyword");
          return;
        }
        const result = await addKeywordsBulk({
          projectId,
          keywords: lines.map((k) => ({
            keyword: k,
            intent: intent === "none" ? undefined : intent,
            priority,
          })),
          source: "manual",
        });
        toast.success(
          `Added ${result.added} keywords${result.skipped > 0 ? `, ${result.skipped} already existed` : ""}`
        );
        setBulkText("");
        onOpenChange(false);
      }
    } catch (e) {
      if (e instanceof ConvexError) {
        toast.error((e.data as { message: string }).message);
      } else {
        toast.error("Failed to add keyword(s)");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg flex flex-col max-h-[90vh]">
        <DialogHeader className="shrink-0">
          <DialogTitle>Add Keywords</DialogTitle>
          <DialogDescription>
            Add keywords to track their search engine rankings
          </DialogDescription>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="flex gap-2 p-1 bg-muted rounded-lg shrink-0">
          <button
            className={`flex-1 text-sm py-1.5 px-3 rounded-md font-medium transition-colors cursor-pointer ${mode === "single" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
            onClick={() => setMode("single")}
          >
            Single keyword
          </button>
          <button
            className={`flex-1 text-sm py-1.5 px-3 rounded-md font-medium transition-colors cursor-pointer ${mode === "bulk" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
            onClick={() => setMode("bulk")}
          >
            Bulk add
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 pr-1">
          <div className="space-y-4">
          {mode === "single" ? (
            <div className="space-y-1.5">
              <Label htmlFor="keyword">Keyword</Label>
              <Input
                id="keyword"
                placeholder="e.g. best seo tools 2024"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                autoFocus
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="bulk">Keywords (one per line)</Label>
              <Textarea
                id="bulk"
                placeholder={"best seo tools\nkeyword research guide\non-page seo checklist"}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                rows={12}
                className="font-mono text-sm resize-none"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                {bulkText.split("\n").filter((l) => l.trim()).length} keywords
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Search intent</Label>
              <Select value={intent} onValueChange={setIntent}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unknown</SelectItem>
                  <SelectItem value="informational">Informational</SelectItem>
                  <SelectItem value="navigational">Navigational</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="transactional">Transactional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {mode === "single" && (
            <div className="space-y-1.5">
              <Label htmlFor="targetUrl">Target URL (optional)</Label>
              <Input
                id="targetUrl"
                placeholder="https://example.com/page"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
              />
            </div>
          )}

          {/* Location targeting */}
          <Collapsible open={locationOpen} onOpenChange={setLocationOpen}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full text-sm font-medium py-2 border-t pt-3 cursor-pointer hover:text-primary transition-colors">
                <span>
                  Location targeting
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {locationLabel(location)}
                  </span>
                </span>
                <ChevronDownIcon
                  className={`h-4 w-4 text-muted-foreground transition-transform ${locationOpen ? "rotate-180" : ""}`}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pt-2 pb-1">
                <p className="text-xs text-muted-foreground mb-3">
                  Set a specific location to track rankings for that region. Supports country, state, district, and city.
                </p>
                <LocationSelector
                  value={location}
                  onChange={setLocation}
                  defaultCountry={projectCountry}
                  compact
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
          </div>
        </div>

        <DialogFooter className="shrink-0 pt-2 border-t">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Adding..." : mode === "single" ? "Add keyword" : "Add keywords"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
