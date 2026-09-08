import { useState, useEffect, useRef } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { RefreshCwIcon, Settings2Icon, ArrowUpIcon, ArrowDownIcon } from "lucide-react";
import { subDays, format } from "date-fns";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from "recharts";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";

type DateRange = "7d" | "28d" | "90d";
type Connection = {
  _id: Doc<"ga4Connections">["_id"];
  googleEmail?: string;
  expiresAt: string;
  selectedProperties?: Record<string, string>;
};

type GA4Row = { dimensionValues: string[]; metricValues: string[] };
type GA4Result = { rows: GA4Row[]; dimensionHeaders: string[]; metricHeaders: string[] };

function getDateRange(range: DateRange) {
  const end = new Date();
  const daysMap: Record<DateRange, number> = { "7d": 7, "28d": 28, "90d": 90 };
  const start = subDays(end, daysMap[range]);
  return {
    startDate: format(start, "yyyy-MM-dd"),
    endDate: format(end, "yyyy-MM-dd"),
  };
}

function StatCard({
  label,
  value,
  change,
  format: fmt = "number",
}: {
  label: string;
  value: number;
  change?: number;
  format?: "number" | "percent" | "duration";
}) {
  const formatted =
    fmt === "percent"
      ? `${value.toFixed(1)}%`
      : fmt === "duration"
      ? `${Math.floor(value / 60)}m ${Math.round(value % 60)}s`
      : value >= 1000
      ? `${(value / 1000).toFixed(1)}K`
      : value.toFixed(0);

  const isUp = (change ?? 0) >= 0;

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-bold mt-1 tabular-nums">{formatted}</div>
      {change !== undefined && (
        <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${isUp ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
          {isUp ? <ArrowUpIcon className="h-3 w-3" /> : <ArrowDownIcon className="h-3 w-3" />}
          {Math.abs(change).toFixed(1)}% vs prev period
        </div>
      )}
    </div>
  );
}

export default function GA4Dashboard({
  project,
  propertyId,
  connection,
}: {
  project: Doc<"projects">;
  propertyId: string;
  connection: Connection;
}) {
  const [dateRange, setDateRange] = useState<DateRange>("28d");
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<{
    sessions: number; organicSessions: number; users: number;
    bounceRate: number; avgDuration: number;
    sessionsChange?: number; organicChange?: number;
  } | null>(null);
  const [trendData, setTrendData] = useState<Array<{ date: string; sessions: number; organic: number }>>([]);
  const [topPages, setTopPages] = useState<Array<{ page: string; sessions: number; bounceRate: number; duration: number }>>([]);
  const [deviceData, setDeviceData] = useState<Array<{ device: string; sessions: number }>>([]);

  const runReport = useAction(api.ga4.actions.runReport);
  const changeProperty = useMutation(api.ga4.mutations.setProjectProperty);

  async function loadAll() {
    setLoading(true);
    const { startDate, endDate } = getDateRange(dateRange);
    const daysMap: Record<DateRange, number> = { "7d": 7, "28d": 28, "90d": 90 };
    const prevEnd = subDays(new Date(startDate), 1);
    const prevStart = subDays(prevEnd, daysMap[dateRange]);

    const organicFilter = JSON.stringify({
      filter: {
        fieldName: "sessionDefaultChannelGroup",
        stringFilter: { value: "Organic Search", matchType: "EXACT" },
      },
    });

    try {
      const [overview, prevOverview, trend, pages, devices] = await Promise.all([
        runReport({
          propertyId,
          startDate,
          endDate,
          dimensions: [],
          metrics: ["sessions", "totalUsers", "bounceRate", "averageSessionDuration"],
          limit: 1,
        }),
        runReport({
          propertyId,
          startDate: format(prevStart, "yyyy-MM-dd"),
          endDate: format(prevEnd, "yyyy-MM-dd"),
          dimensions: [],
          metrics: ["sessions", "totalUsers"],
          limit: 1,
        }),
        runReport({
          propertyId,
          startDate,
          endDate,
          dimensions: ["date", "sessionDefaultChannelGroup"],
          metrics: ["sessions"],
          orderBy: JSON.stringify([{ dimension: { dimensionName: "date" } }]),
          limit: 500,
        }),
        runReport({
          propertyId,
          startDate,
          endDate,
          dimensions: ["pagePath"],
          metrics: ["sessions", "bounceRate", "averageSessionDuration"],
          dimensionFilter: organicFilter,
          orderBy: JSON.stringify([{ metric: { metricName: "sessions" }, desc: true }]),
          limit: 20,
        }),
        runReport({
          propertyId,
          startDate,
          endDate,
          dimensions: ["deviceCategory"],
          metrics: ["sessions"],
          orderBy: JSON.stringify([{ metric: { metricName: "sessions" }, desc: true }]),
        }),
      ]);

      // Parse overview
      const ov = overview.rows[0];
      const prevOv = prevOverview.rows[0];
      const sessions = ov ? parseFloat(ov.metricValues[0]) : 0;
      const prevSessions = prevOv ? parseFloat(prevOv.metricValues[0]) : 0;

      // Get organic sessions from trend
      let organicSessions = 0;
      let prevOrganicSessions = 0;

      const trendMap = new Map<string, { total: number; organic: number }>();
      for (const row of trend.rows) {
        const date = row.dimensionValues[0];
        const channel = row.dimensionValues[1];
        const s = parseFloat(row.metricValues[0]);
        const entry = trendMap.get(date) ?? { total: 0, organic: 0 };
        entry.total += s;
        if (channel === "Organic Search") entry.organic += s;
        trendMap.set(date, entry);
        if (channel === "Organic Search") organicSessions += s;
      }

      const trendArr = Array.from(trendMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, d]) => ({
          date: date.replace(/(\d{4})(\d{2})(\d{2})/, "$2/$3"),
          sessions: d.total,
          organic: d.organic,
        }));

      setOverview({
        sessions,
        organicSessions,
        users: ov ? parseFloat(ov.metricValues[1]) : 0,
        bounceRate: ov ? parseFloat(ov.metricValues[2]) : 0,
        avgDuration: ov ? parseFloat(ov.metricValues[3]) : 0,
        sessionsChange: prevSessions > 0 ? ((sessions - prevSessions) / prevSessions) * 100 : undefined,
        organicChange: prevOrganicSessions > 0
          ? ((organicSessions - prevOrganicSessions) / prevOrganicSessions) * 100
          : undefined,
      });
      setTrendData(trendArr);
      setTopPages(
        pages.rows.map((r) => ({
          page: r.dimensionValues[0],
          sessions: parseFloat(r.metricValues[0]),
          bounceRate: parseFloat(r.metricValues[1]),
          duration: parseFloat(r.metricValues[2]),
        }))
      );
      setDeviceData(
        devices.rows.map((r) => ({
          device: r.dimensionValues[0],
          sessions: parseFloat(r.metricValues[0]),
        }))
      );
      setLoaded(true);
    } catch (e) {
      const msg = e instanceof ConvexError
        ? (e.data as { message: string }).message
        : e instanceof Error
        ? e.message
        : "Failed to load GA4 data";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  // Use a ref to prevent double-call in strict mode
  const initRef = useRef(false);
  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true;
      void loadAll();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId, dateRange]);

  // Re-trigger when dateRange changes (after first load)
  const prevDateRange = useRef(dateRange);
  useEffect(() => {
    if (prevDateRange.current !== dateRange) {
      prevDateRange.current = dateRange;
      setLoaded(false);
      void loadAll();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
          <p className="text-sm text-muted-foreground">
            {connection.googleEmail && `Connected: ${connection.googleEmail} · `}
            Property: <span className="font-mono text-xs">{propertyId}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={(v) => { setDateRange(v as DateRange); setLoaded(false); }}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="28d">Last 28 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setLoaded(false); setError(null); void loadAll(); }}
            disabled={loading}
          >
            <RefreshCwIcon className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await changeProperty({ projectId: project._id, propertyId: "" });
            }}
          >
            <Settings2Icon className="h-3.5 w-3.5 mr-1.5" />
            Change property
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      {error && !loading ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <p className="font-semibold mb-1">Failed to load GA4 data</p>
          <p className="text-xs opacity-80 break-words">{error}</p>
          <Button
            size="sm"
            variant="ghost"
            className="mt-2 h-7 text-xs text-destructive hover:text-destructive"
            onClick={() => { setError(null); void loadAll(); }}
          >
            <RefreshCwIcon className="h-3 w-3 mr-1.5" />
            Retry
          </Button>
        </div>
      ) : null}

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : overview ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Sessions" value={overview.sessions} change={overview.sessionsChange} />
          <StatCard label="Organic Sessions" value={overview.organicSessions} change={overview.organicChange} />
          <StatCard label="Users" value={overview.users} />
          <StatCard label="Avg Duration" value={overview.avgDuration} format="duration" />
        </div>
      ) : null}

      {/* Traffic trend chart */}
      {loading ? (
        <Skeleton className="h-56 w-full rounded-xl" />
      ) : trendData.length > 0 ? (
        <div className="rounded-xl border p-4">
          <div className="text-sm font-semibold mb-4">Traffic Trend</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="sessions" name="All Sessions" stroke="var(--chart-2)" fill="var(--chart-2)" fillOpacity={0.15} strokeWidth={2} />
              <Area type="monotone" dataKey="organic" name="Organic" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.2} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : null}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top organic landing pages */}
        {loading ? (
          <Skeleton className="h-64 rounded-xl" />
        ) : topPages.length > 0 ? (
          <div className="rounded-xl border overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/20">
              <div className="text-sm font-semibold">Top Organic Landing Pages</div>
            </div>
            <div className="divide-y max-h-72 overflow-y-auto">
              {topPages.map((p, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.page}</div>
                    <div className="text-xs text-muted-foreground">
                      {Math.floor(p.duration / 60)}m{Math.round(p.duration % 60)}s avg · {p.bounceRate.toFixed(0)}% bounce
                    </div>
                  </div>
                  <div className="text-sm font-semibold tabular-nums shrink-0">{p.sessions.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Device breakdown */}
        {loading ? (
          <Skeleton className="h-64 rounded-xl" />
        ) : deviceData.length > 0 ? (
          <div className="rounded-xl border p-4">
            <div className="text-sm font-semibold mb-4">Sessions by Device</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={deviceData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="device" tick={{ fontSize: 11 }} width={70} />
                <Tooltip />
                <Bar dataKey="sessions" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : null}
      </div>
    </div>
  );
}
