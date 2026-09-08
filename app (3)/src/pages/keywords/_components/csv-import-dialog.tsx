import { useState, useRef } from "react";
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
import { toast } from "sonner";
import { UploadIcon, FileTextIcon, CheckCircleIcon } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: Id<"projects">;
};

type ParsedKeyword = {
  keyword: string;
  intent?: string;
  priority?: string;
  targetUrl?: string;
};

function parseCsv(text: string): ParsedKeyword[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  // Check if first line is a header
  const firstLine = lines[0].toLowerCase();
  const hasHeader = firstLine.includes("keyword") || firstLine.includes("url") || firstLine.includes("intent");
  const dataLines = hasHeader ? lines.slice(1) : lines;

  return dataLines.map((line) => {
    // Handle quoted CSV
    const cols = line.split(",").map((c) => c.trim().replace(/^"(.*)"$/, "$1").trim());
    return {
      keyword: cols[0] ?? "",
      targetUrl: cols[1] || undefined,
      intent: cols[2] || undefined,
      priority: cols[3] || undefined,
    };
  }).filter((k) => k.keyword.length > 0);
}

export default function CsvImportDialog({ open, onOpenChange, projectId }: Props) {
  const [parsed, setParsed] = useState<ParsedKeyword[] | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addKeywordsBulk = useMutation(api.keywords.mutations.addKeywordsBulk);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const keywords = parseCsv(text);
      setParsed(keywords);
    };
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".csv")) handleFile(file);
    else toast.error("Please upload a CSV file");
  }

  async function handleImport() {
    if (!parsed || parsed.length === 0) return;
    setLoading(true);
    try {
      const result = await addKeywordsBulk({
        projectId,
        keywords: parsed.map((k) => ({
          keyword: k.keyword,
          intent: k.intent,
          priority: k.priority,
          targetUrl: k.targetUrl,
        })),
        source: "csv",
      });
      toast.success(`Imported ${result.added} keywords${result.skipped > 0 ? `, ${result.skipped} duplicates skipped` : ""}`);
      setParsed(null);
      onOpenChange(false);
    } catch {
      toast.error("Failed to import keywords");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setParsed(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Keywords from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with your keywords. Columns: keyword, target URL (optional), intent (optional), priority (optional)
          </DialogDescription>
        </DialogHeader>

        {!parsed ? (
          <div
            className="border-2 border-dashed rounded-lg p-10 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadIcon className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium">Drop a CSV file here or click to browse</p>
            <p className="text-sm text-muted-foreground mt-1">Supports .csv files</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 font-medium">
              <CheckCircleIcon className="h-4 w-4" />
              {parsed.length} keywords ready to import
            </div>
            <div className="border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b text-muted-foreground uppercase tracking-wide">
                    <th className="py-2 px-3 text-left font-medium">Keyword</th>
                    <th className="py-2 px-3 text-left font-medium hidden sm:table-cell">URL</th>
                    <th className="py-2 px-3 text-left font-medium">Intent</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.slice(0, 20).map((kw, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 px-3 font-medium">{kw.keyword}</td>
                      <td className="py-2 px-3 text-muted-foreground hidden sm:table-cell truncate max-w-[160px]">
                        {kw.targetUrl ?? "—"}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground capitalize">
                        {kw.intent ?? "—"}
                      </td>
                    </tr>
                  ))}
                  {parsed.length > 20 && (
                    <tr>
                      <td colSpan={3} className="py-2 px-3 text-center text-muted-foreground">
                        +{parsed.length - 20} more keywords
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setParsed(null)}
            >
              Upload a different file
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          {parsed && (
            <Button onClick={handleImport} disabled={loading || parsed.length === 0}>
              {loading ? "Importing..." : `Import ${parsed.length} keywords`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
