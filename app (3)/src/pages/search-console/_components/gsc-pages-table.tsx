import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Input } from "@/components/ui/input.tsx";
import { SearchIcon, ArrowUpDownIcon } from "lucide-react";

type Row = {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

type GscData = { rows: Row[] } | null;
type SortKey = "clicks" | "impressions" | "ctr" | "position";

export default function GscPagesTable({
  data,
  loading,
}: {
  data: GscData;
  loading: boolean;
}) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("clicks");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    );
  }

  const rows = data?.rows ?? [];
  const filtered = rows.filter((r) =>
    r.keys[0]?.toLowerCase().includes(search.toLowerCase())
  );
  const sorted = [...filtered].sort((a, b) => {
    const v = sortDir === "asc" ? 1 : -1;
    return (a[sortKey] - b[sortKey]) * v;
  });

  // Identify CTR opportunities: high impressions, low CTR, position < 20
  const ctrOpportunities = rows
    .filter((r) => r.impressions > 100 && r.ctr < 0.05 && r.position < 20)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 5);

  const ColHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <th
      className="py-2.5 px-3 text-right font-medium cursor-pointer select-none hover:text-foreground whitespace-nowrap"
      onClick={() => toggleSort(k)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDownIcon className="h-3 w-3 opacity-50" />
      </span>
    </th>
  );

  return (
    <div className="space-y-4">
      {ctrOpportunities.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400 mb-2">
            CTR Opportunities — High impressions, low CTR
          </div>
          <div className="space-y-1.5">
            {ctrOpportunities.map((r, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="flex-1 truncate font-medium text-xs">{r.keys[0]}</span>
                <span className="text-xs text-muted-foreground">{r.impressions.toLocaleString()} impr.</span>
                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">{(r.ctr * 100).toFixed(1)}% CTR</span>
                <span className="text-xs text-muted-foreground">Pos {r.position.toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="relative max-w-sm">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filter pages…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-8 text-sm"
        />
      </div>

      <div className="rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-muted-foreground text-xs uppercase tracking-wide">
                <th className="py-2.5 px-3 text-left font-medium">Page URL</th>
                <ColHeader label="Clicks" k="clicks" />
                <ColHeader label="Impressions" k="impressions" />
                <ColHeader label="CTR" k="ctr" />
                <ColHeader label="Position" k="position" />
              </tr>
            </thead>
            <tbody>
              {sorted.slice(0, 100).map((row, i) => (
                <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="py-2 px-3 font-medium max-w-xs">
                    <a
                      href={row.keys[0]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline truncate block max-w-[320px]"
                      title={row.keys[0]}
                    >
                      {row.keys[0].replace(/^https?:\/\/[^/]+/, "") || "/"}
                    </a>
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums">{row.clicks.toLocaleString()}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{row.impressions.toLocaleString()}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{(row.ctr * 100).toFixed(1)}%</td>
                  <td className="py-2 px-3 text-right tabular-nums">
                    <span className={`font-semibold ${row.position <= 10 ? "text-green-600 dark:text-green-400" : row.position <= 20 ? "text-amber-600" : "text-muted-foreground"}`}>
                      {row.position.toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    No pages found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {sorted.length > 100 && (
          <div className="px-3 py-2 text-xs text-muted-foreground border-t text-center">
            Showing 100 of {sorted.length} pages
          </div>
        )}
      </div>
    </div>
  );
}
