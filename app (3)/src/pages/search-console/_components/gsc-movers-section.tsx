import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { format, subDays } from "date-fns";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { TrendingUpIcon, TrendingDownIcon, SparklesIcon, AlertTriangleIcon } from "lucide-react";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";

type Row = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number };
type DateRange = "7d" | "14d" | "28d" | "3m" | "6m";

type Props = {
  project: Doc<"projects">;
  propertyUrl: string;
  dateRange: DateRange;
};

function getDateRange(range: DateRange) {
  const end = subDays(new Date(), 3);
  const daysMap: Record<DateRange, number> = { "7d": 7, "14d": 14, "28d": 28, "3m": 90, "6m": 180 };
  const days = daysMap[range];
  const start = subDays(end, days);
  const prevEnd = subDays(start, 1);
  const prevStart = subDays(prevEnd, days);

  return {
    current: { startDate: format(start, "yyyy-MM-dd"), endDate: format(end, "yyyy-MM-dd") },
    previous: { startDate: format(prevStart, "yyyy-MM-dd"), endDate: format(prevEnd, "yyyy-MM-dd") },
  };
}

type MoverItem = {
  query: string;
  currentClicks: number;
  previousClicks: number;
  currentPosition: number;
  previousPosition: number;
  clickChange: number;
  posChange: number;
};

export default function GscMoversSection({ project, propertyUrl, dateRange }: Props) {
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [gainers, setGainers] = useState<MoverItem[]>([]);
  const [losers, setLosers] = useState<MoverItem[]>([]);
  const [newQueries, setNewQueries] = useState<Row[]>([]);
  const [lostQueries, setLostQueries] = useState<Row[]>([]);

  const fetchAnalytics = useAction(api.gsc.actions.fetchSearchAnalytics);

  async function loadData() {
    setLoading(true);
    const { current, previous } = getDateRange(dateRange);

    try {
      const [curr, prev] = await Promise.all([
        fetchAnalytics({
          projectId: project._id,
          propertyUrl,
          ...current,
          dimensions: ["query"],
          rowLimit: 500,
          cacheKey: `movers_curr_${dateRange}`,
        }),
        fetchAnalytics({
          projectId: project._id,
          propertyUrl,
          ...previous,
          dimensions: ["query"],
          rowLimit: 500,
          cacheKey: `movers_prev_${dateRange}`,
        }),
      ]);

      const currMap = new Map(curr.rows.map((r) => [r.keys[0], r]));
      const prevMap = new Map(prev.rows.map((r) => [r.keys[0], r]));

      const movers: MoverItem[] = [];
      for (const [query, currRow] of currMap) {
        const prevRow = prevMap.get(query);
        if (prevRow) {
          movers.push({
            query,
            currentClicks: currRow.clicks,
            previousClicks: prevRow.clicks,
            currentPosition: currRow.position,
            previousPosition: prevRow.position,
            clickChange: currRow.clicks - prevRow.clicks,
            posChange: prevRow.position - currRow.position, // positive = improved
          });
        }
      }

      movers.sort((a, b) => Math.abs(b.clickChange) - Math.abs(a.clickChange));
      setGainers(movers.filter((m) => m.clickChange > 0).slice(0, 15));
      setLosers(movers.filter((m) => m.clickChange < 0).slice(0, 15));

      // New: in current but not previous
      const newQ = curr.rows.filter((r) => !prevMap.has(r.keys[0])).slice(0, 15);
      setNewQueries(newQ);

      // Lost: in previous but not current
      const lostQ = prev.rows.filter((r) => !currMap.has(r.keys[0])).slice(0, 15);
      setLostQueries(lostQ);

      setLoaded(true);
    } catch (e) {
      if (e instanceof ConvexError) {
        toast.error((e.data as { message: string }).message);
      } else {
        toast.error("Failed to load movers data");
      }
    } finally {
      setLoading(false);
    }
  }

  if (!loaded && !loading) {
    loadData();
  }

  if (loading) {
    return (
      <div className="grid md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-48" />)}
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <MoverCard
        title="Gaining Queries"
        subtitle="More clicks vs previous period"
        icon={<TrendingUpIcon className="h-4 w-4 text-green-600 dark:text-green-400" />}
        items={gainers}
        renderItem={(item) => (
          <MoverRow
            key={item.query}
            label={item.query}
            value={`+${item.clickChange}`}
            sub={`#${item.currentPosition.toFixed(0)}`}
            valueClass="text-green-600 dark:text-green-400"
          />
        )}
        emptyText="No gaining queries in this period"
      />

      <MoverCard
        title="Declining Queries"
        subtitle="Fewer clicks vs previous period"
        icon={<TrendingDownIcon className="h-4 w-4 text-red-500" />}
        items={losers}
        renderItem={(item) => (
          <MoverRow
            key={item.query}
            label={item.query}
            value={`${item.clickChange}`}
            sub={`#${item.currentPosition.toFixed(0)}`}
            valueClass="text-red-500"
          />
        )}
        emptyText="No declining queries in this period"
      />

      <MoverCard
        title="New Queries"
        subtitle="Appeared this period"
        icon={<SparklesIcon className="h-4 w-4 text-primary" />}
        items={newQueries}
        renderItem={(item) => (
          <MoverRow
            key={item.keys[0]}
            label={item.keys[0]}
            value={`${item.clicks}`}
            sub={`#${item.position.toFixed(0)}`}
            valueClass="text-primary"
          />
        )}
        emptyText="No new queries in this period"
      />

      <MoverCard
        title="Lost Queries"
        subtitle="Not ranking this period"
        icon={<AlertTriangleIcon className="h-4 w-4 text-amber-600" />}
        items={lostQueries}
        renderItem={(item) => (
          <MoverRow
            key={item.keys[0]}
            label={item.keys[0]}
            value={`${item.clicks}`}
            sub={`Was #${item.position.toFixed(0)}`}
            valueClass="text-amber-600"
          />
        )}
        emptyText="No lost queries in this period"
      />
    </div>
  );
}

function MoverCard<T>({
  title,
  subtitle,
  icon,
  items,
  renderItem,
  emptyText,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  emptyText: string;
}) {
  return (
    <div className="rounded-xl border overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/20">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <div className="text-sm font-medium">{title}</div>
            <div className="text-xs text-muted-foreground">{subtitle}</div>
          </div>
        </div>
      </div>
      <div className="divide-y max-h-72 overflow-y-auto">
        {items.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">{emptyText}</div>
        ) : (
          items.map((item) => renderItem(item))
        )}
      </div>
    </div>
  );
}

function MoverRow({
  label,
  value,
  sub,
  valueClass,
}: {
  label: string;
  value: string;
  sub: string;
  valueClass: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <div className="flex-1 min-w-0">
        <span className="text-sm truncate block">{label}</span>
      </div>
      <div className="text-right shrink-0">
        <div className={`text-sm font-semibold tabular-nums ${valueClass}`}>{value}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </div>
    </div>
  );
}
