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

export default function GscQueriesTable({
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

  const ColHeader = ({ label, key: k }: { label: string; key: SortKey }) => (
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
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filter queries…"
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
                <th className="py-2.5 px-3 text-left font-medium">Query</th>
                <ColHeader label="Clicks" key="clicks" />
                <ColHeader label="Impressions" key="impressions" />
                <ColHeader label="CTR" key="ctr" />
                <ColHeader label="Position" key="position" />
              </tr>
            </thead>
            <tbody>
              {sorted.slice(0, 100).map((row, i) => (
                <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="py-2 px-3 font-medium max-w-xs truncate">{row.keys[0]}</td>
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
                    No queries found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {sorted.length > 100 && (
          <div className="px-3 py-2 text-xs text-muted-foreground border-t text-center">
            Showing 100 of {sorted.length} queries
          </div>
        )}
      </div>
    </div>
  );
}
