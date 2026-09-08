import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { format, subDays } from "date-fns";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import GscOverviewCards from "./gsc-overview-cards.tsx";
import GscQueriesTable from "./gsc-queries-table.tsx";
import GscPagesTable from "./gsc-pages-table.tsx";
import GscMoversSection from "./gsc-movers-section.tsx";
import GscSitemaps from "./gsc-sitemaps.tsx";
import GscUrlInspector from "./gsc-url-inspector.tsx";

type DateRange = "7d" | "14d" | "28d" | "3m" | "6m";

type Props = {
  project: Doc<"projects">;
  propertyUrl: string;
  onChangeProperty: () => void;
};

type GscData = {
  rows: Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }>;
  totalClicks: number;
  totalImpressions: number;
  avgCtr: number;
  avgPosition: number;
} | null;

function getDateRange(range: DateRange): { startDate: string; endDate: string } {
  const end = subDays(new Date(), 3); // GSC data has ~3 day lag
  let start: Date;
  if (range === "7d") start = subDays(end, 7);
  else if (range === "14d") start = subDays(end, 14);
  else if (range === "28d") start = subDays(end, 28);
  else if (range === "3m") start = subDays(end, 90);
  else start = subDays(end, 180);

  return {
    startDate: format(start, "yyyy-MM-dd"),
    endDate: format(end, "yyyy-MM-dd"),
  };
}

export default function GscDashboard({ project, propertyUrl, onChangeProperty }: Props) {
  const [dateRange, setDateRange] = useState<DateRange>("28d");
  const [queriesData, setQueriesData] = useState<GscData>(null);
  const [pagesData, setPagesData] = useState<GscData>(null);
  const [countriesData, setCountriesData] = useState<GscData>(null);
  const [devicesData, setDevicesData] = useState<GscData>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const fetchAnalytics = useAction(api.gsc.actions.fetchSearchAnalytics);

  async function loadData(range: DateRange) {
    setLoading(true);
    const { startDate, endDate } = getDateRange(range);
    const base = {
      projectId: project._id,
      propertyUrl,
      startDate,
      endDate,
    };

    try {
      const [queries, pages, countries, devices] = await Promise.all([
        fetchAnalytics({ ...base, dimensions: ["query"], rowLimit: 500, cacheKey: `queries_${range}` }),
        fetchAnalytics({ ...base, dimensions: ["page"], rowLimit: 500, cacheKey: `pages_${range}` }),
        fetchAnalytics({ ...base, dimensions: ["country"], rowLimit: 100, cacheKey: `countries_${range}` }),
        fetchAnalytics({ ...base, dimensions: ["device"], rowLimit: 10, cacheKey: `devices_${range}` }),
      ]);
      setQueriesData(queries);
      setPagesData(pages);
      setCountriesData(countries);
      setDevicesData(devices);
      setLoaded(true);
    } catch (e) {
      if (e instanceof ConvexError) {
        toast.error((e.data as { message: string }).message);
      } else {
        toast.error("Failed to load Search Console data");
      }
    } finally {
      setLoading(false);
    }
  }

  // Load on first render
  if (!loaded && !loading) {
    loadData(dateRange);
  }

  function handleRangeChange(range: DateRange) {
    setDateRange(range);
    setLoaded(false);
    setQueriesData(null);
    setPagesData(null);
    setCountriesData(null);
    setDevicesData(null);
    loadData(range);
  }

  return (
    <div className="flex-1 overflow-auto">
      {/* Toolbar */}
      <div className="px-6 py-3 border-b flex items-center gap-3 flex-wrap">
        <div className="text-xs text-muted-foreground truncate max-w-[240px]">
          {propertyUrl}
        </div>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onChangeProperty}>
          Change
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <Select value={dateRange} onValueChange={(v) => handleRangeChange(v as DateRange)}>
            <SelectTrigger className="h-8 w-32 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="14d">Last 14 days</SelectItem>
              <SelectItem value="28d">Last 28 days</SelectItem>
              <SelectItem value="3m">Last 3 months</SelectItem>
              <SelectItem value="6m">Last 6 months</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            className="h-8"
            disabled={loading}
            onClick={() => {
              setLoaded(false);
              setQueriesData(null);
              setPagesData(null);
              loadData(dateRange);
            }}
          >
            {loading ? "Loading…" : "Refresh"}
          </Button>
        </div>
      </div>

      <div className="p-6">
        {/* Overview cards */}
        <GscOverviewCards
          data={queriesData}
          devicesData={devicesData}
          loading={loading && !queriesData}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Queries</TabsTrigger>
            <TabsTrigger value="pages">Pages</TabsTrigger>
            <TabsTrigger value="movers">Movers</TabsTrigger>
            <TabsTrigger value="inspect">URL Inspect</TabsTrigger>
            <TabsTrigger value="sitemaps">Sitemaps</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <GscQueriesTable data={queriesData} loading={loading && !queriesData} />
          </TabsContent>

          <TabsContent value="pages">
            <GscPagesTable data={pagesData} loading={loading && !pagesData} />
          </TabsContent>

          <TabsContent value="movers">
            <GscMoversSection
              project={project}
              propertyUrl={propertyUrl}
              dateRange={dateRange}
            />
          </TabsContent>

          <TabsContent value="inspect">
            <GscUrlInspector siteUrl={propertyUrl} />
          </TabsContent>

          <TabsContent value="sitemaps">
            <GscSitemaps siteUrl={propertyUrl} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
