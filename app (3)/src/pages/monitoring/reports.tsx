import { useState, useCallback } from "react";
import { useQuery, usePaginatedQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import {
  Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription,
} from "@/components/ui/empty.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import {
  FileTextIcon, DownloadIcon, BarChart3Icon, SearchIcon,
  TrendingUpIcon, TrendingDownIcon, TargetIcon, AlertTriangleIcon,
  CheckCircleIcon, CalendarIcon, RefreshCwIcon, SparklesIcon,
  TableIcon, FileIcon, SettingsIcon, ChevronDownIcon,
} from "lucide-react";
import { useCurrentProject } from "@/hooks/use-current-project.tsx";
import { format, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Papa from "papaparse";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";

// ── Types ────────────────────────────────────────────────────────────────────

type PeriodPreset = "7d" | "28d" | "last_month" | "3months" | "custom";
type ExportFormat = "pdf_smart" | "pdf_detailed" | "csv_combined" | "csv_gsc" | "csv_ga4" | "csv_keywords";

type ReportConfig = {
  label: string;
  period: PeriodPreset;
  customStart: string;
  customEnd: string;
  comparePrevious: boolean;
  sections: {
    gsc: boolean;
    ga4: boolean;
    keywords: boolean;
    onPage: boolean;
    issuesResolved: boolean;
  };
  groupBy: "daily" | "weekly" | "monthly";
};

type GscData = {
  totalClicks: number;
  totalImpressions: number;
  avgCtr: number;
  avgPosition: number;
  topQueries: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>;
  topPages: Array<{ page: string; clicks: number; impressions: number }>;
};

type Ga4Data = {
  sessions: number;
  organicSessions: number;
  users: number;
  bounceRate: number;
  avgDuration: number;
  topPages: Array<{ page: string; sessions: number; bounceRate: number }>;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function getPeriodDates(preset: PeriodPreset, customStart: string, customEnd: string) {
  const today = new Date();
  switch (preset) {
    case "7d":
      return { start: format(subDays(today, 7), "yyyy-MM-dd"), end: format(today, "yyyy-MM-dd") };
    case "28d":
      return { start: format(subDays(today, 28), "yyyy-MM-dd"), end: format(today, "yyyy-MM-dd") };
    case "last_month": {
      const lm = subMonths(today, 1);
      return { start: format(startOfMonth(lm), "yyyy-MM-dd"), end: format(endOfMonth(lm), "yyyy-MM-dd") };
    }
    case "3months":
      return { start: format(subMonths(today, 3), "yyyy-MM-dd"), end: format(today, "yyyy-MM-dd") };
    case "custom":
      return { start: customStart, end: customEnd };
  }
}

function getPrevPeriodDates(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const diffMs = e.getTime() - s.getTime();
  const prevEnd = subDays(s, 1);
  const prevStart = new Date(prevEnd.getTime() - diffMs);
  return {
    start: format(prevStart, "yyyy-MM-dd"),
    end: format(prevEnd, "yyyy-MM-dd"),
  };
}

function pctChange(curr: number, prev: number) {
  if (prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}

function fmtPct(n: number | null) {
  if (n === null) return "—";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

const BRAND_COLOR: [number, number, number] = [15, 80, 68];

// ── Main export ──────────────────────────────────────────────────────────────

export default function ReportsPage() {
  return (
    <>
      <AuthLoading><div className="p-8"><Skeleton className="h-64 w-full" /></div></AuthLoading>
      <Unauthenticated><div className="flex justify-center p-8"><SignInButton /></div></Unauthenticated>
      <Authenticated><ReportsContent /></Authenticated>
    </>
  );
}

// ── Content ──────────────────────────────────────────────────────────────────

function ReportsContent() {
  const { activeProjectId } = useCurrentProject();
  const projects = useQuery(api.projects.list, {});
  const project = projects?.find((p) => p._id === activeProjectId);

  if (!project) {
    return (
      <div className="p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><FileTextIcon /></EmptyMedia>
            <EmptyTitle>No project selected</EmptyTitle>
            <EmptyDescription>Select a project to generate reports</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <FileTextIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Smart Reports</h1>
            <p className="text-sm text-muted-foreground">
              GSC + GA4 + Keywords — comparison periods, custom labels, PDF & CSV
            </p>
          </div>
        </div>
      </div>
      <div className="p-6">
        <ReportBuilder project={project} />
      </div>
    </div>
  );
}

// ── Report Builder ────────────────────────────────────────────────────────────

function ReportBuilder({ project }: { project: Doc<"projects"> }) {
  const [config, setConfig] = useState<ReportConfig>({
    label: `${project.name} — SEO Report`,
    period: "last_month",
    customStart: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    customEnd: format(new Date(), "yyyy-MM-dd"),
    comparePrevious: true,
    sections: { gsc: true, ga4: true, keywords: true, onPage: true, issuesResolved: true },
    groupBy: "monthly",
  });

  const [generating, setGenerating] = useState<ExportFormat | null>(null);
  const [gscData, setGscData] = useState<GscData | null>(null);
  const [gscPrevData, setGscPrevData] = useState<GscData | null>(null);
  const [ga4Data, setGa4Data] = useState<Ga4Data | null>(null);
  const [ga4PrevData, setGa4PrevData] = useState<Ga4Data | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);

  // Data queries
  const { results: keywords } = usePaginatedQuery(
    api.keywords.queries.listKeywords,
    { projectId: project._id },
    { initialNumItems: 500 }
  );
  const changes = useQuery(api.monitoring.queries.listChanges, { projectId: project._id });
  const alerts = useQuery(api.monitoring.queries.listAlerts, { projectId: project._id });
  const audits = useQuery(api.audits.queries.listByProject, { projectId: project._id });
  const gscConnection = useQuery(api.gsc.queries.getConnection, {});
  const ga4Connection = useQuery(api.ga4.queries.getConnection, {});

  const fetchGscAnalytics = useAction(api.gsc.actions.fetchSearchAnalytics);
  const runGa4Report = useAction(api.ga4.actions.runReport);

  const { start, end } = getPeriodDates(config.period, config.customStart, config.customEnd);
  const { start: prevStart, end: prevEnd } = getPrevPeriodDates(start, end);

  // Derived keyword stats
  const totalKeywords = keywords?.length ?? 0;
  const top3 = keywords?.filter((k) => (k.latestPosition ?? 999) <= 3).length ?? 0;
  const top10 = keywords?.filter((k) => (k.latestPosition ?? 999) <= 10).length ?? 0;
  const improved = keywords?.filter((k) =>
    k.latestPosition !== undefined && k.previousPosition !== undefined && k.latestPosition < k.previousPosition
  ).length ?? 0;
  const declined = keywords?.filter((k) =>
    k.latestPosition !== undefined && k.previousPosition !== undefined && k.latestPosition > k.previousPosition
  ).length ?? 0;
  const latestAudit = audits?.[0];
  const openAlerts = alerts?.filter((a) => !a.isResolved).length ?? 0;

  // Filter changes by period
  const periodChanges = changes?.filter((c) => {
    const d = c.createdAt;
    return d >= start && d <= end;
  }) ?? [];

  // Filter resolved audit issues
  const latestAuditIssues = audits?.[0];

  const setSection = (key: keyof ReportConfig["sections"], val: boolean) => {
    setConfig((c) => ({ ...c, sections: { ...c.sections, [key]: val } }));
  };

  async function fetchLiveData() {
    setDataLoading(true);
    setDataLoaded(false);
    try {
      const gscProp = gscConnection?.selectedProperties?.[project._id];
      const ga4Prop = ga4Connection?.selectedProperties?.[project._id];

      const fetchGscPeriod = async (s: string, e: string): Promise<GscData | null> => {
        if (!gscProp || !config.sections.gsc) return null;
        try {
          const [queriesRes, pagesRes] = await Promise.all([
            fetchGscAnalytics({
              projectId: project._id,
              propertyUrl: gscProp,
              startDate: s,
              endDate: e,
              dimensions: ["query"],
              rowLimit: 50,
            }),
            fetchGscAnalytics({
              projectId: project._id,
              propertyUrl: gscProp,
              startDate: s,
              endDate: e,
              dimensions: ["page"],
              rowLimit: 20,
            }),
          ]);
          const topQueries = (queriesRes.rows ?? []).map((r) => ({
            query: r.keys[0],
            clicks: r.clicks,
            impressions: r.impressions,
            ctr: r.ctr,
            position: r.position,
          }));
          const topPages = (pagesRes.rows ?? []).map((r) => ({
            page: r.keys[0],
            clicks: r.clicks,
            impressions: r.impressions,
          }));
          return {
            totalClicks: queriesRes.totalClicks,
            totalImpressions: queriesRes.totalImpressions,
            avgCtr: queriesRes.avgCtr,
            avgPosition: queriesRes.avgPosition,
            topQueries,
            topPages,
          };
        } catch { return null; }
      };

      const fetchGa4Period = async (s: string, e: string): Promise<Ga4Data | null> => {
        if (!ga4Prop || !config.sections.ga4) return null;
        try {
          const [ov, trend, pages] = await Promise.all([
            runGa4Report({
              propertyId: ga4Prop,
              startDate: s,
              endDate: e,
              dimensions: [],
              metrics: ["sessions", "totalUsers", "bounceRate", "averageSessionDuration"],
              limit: 1,
            }),
            runGa4Report({
              propertyId: ga4Prop,
              startDate: s,
              endDate: e,
              dimensions: ["sessionDefaultChannelGroup"],
              metrics: ["sessions"],
              limit: 20,
            }),
            runGa4Report({
              propertyId: ga4Prop,
              startDate: s,
              endDate: e,
              dimensions: ["pagePath"],
              metrics: ["sessions", "bounceRate"],
              orderBy: JSON.stringify([{ metric: { metricName: "sessions" }, desc: true }]),
              limit: 20,
            }),
          ]);
          const ovRow = ov.rows[0];
          const organicRow = trend.rows.find((r) => r.dimensionValues[0] === "Organic Search");
          return {
            sessions: ovRow ? parseFloat(ovRow.metricValues[0]) : 0,
            organicSessions: organicRow ? parseFloat(organicRow.metricValues[0]) : 0,
            users: ovRow ? parseFloat(ovRow.metricValues[1]) : 0,
            bounceRate: ovRow ? parseFloat(ovRow.metricValues[2]) : 0,
            avgDuration: ovRow ? parseFloat(ovRow.metricValues[3]) : 0,
            topPages: pages.rows.map((r) => ({
              page: r.dimensionValues[0],
              sessions: parseFloat(r.metricValues[0]),
              bounceRate: parseFloat(r.metricValues[1]),
            })),
          };
        } catch { return null; }
      };

      const [gsc, ga4, gscPrev, ga4Prev] = await Promise.all([
        fetchGscPeriod(start, end),
        fetchGa4Period(start, end),
        config.comparePrevious ? fetchGscPeriod(prevStart, prevEnd) : Promise.resolve(null),
        config.comparePrevious ? fetchGa4Period(prevStart, prevEnd) : Promise.resolve(null),
      ]);

      setGscData(gsc);
      setGa4Data(ga4);
      setGscPrevData(gscPrev);
      setGa4PrevData(ga4Prev);
      setDataLoaded(true);
      toast.success("Live data loaded successfully");
    } catch (e) {
      const msg = e instanceof ConvexError
        ? (e.data as { message: string }).message
        : "Failed to fetch live data";
      toast.error(msg);
    } finally {
      setDataLoading(false);
    }
  }

  // ── PDF Smart Report ──────────────────────────────────────────────────────

  function generateSmartPDF() {
    setGenerating("pdf_smart");
    try {
      const doc = new jsPDF();
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();

      // ── Cover Page ──
      doc.setFillColor(...BRAND_COLOR);
      doc.rect(0, 0, pageW, pageH, "F");

      // Accent stripe
      doc.setFillColor(255, 255, 255, 0.08);
      doc.rect(0, pageH * 0.55, pageW, 2, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(30);
      doc.setFont("helvetica", "bold");
      doc.text(config.label, pageW / 2, 90, { align: "center", maxWidth: 170 });

      doc.setFontSize(13);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(180, 230, 220);
      doc.text(`${format(new Date(start), "MMMM d, yyyy")} – ${format(new Date(end), "MMMM d, yyyy")}`, pageW / 2, 108, { align: "center" });

      if (config.comparePrevious) {
        doc.setFontSize(10);
        doc.setTextColor(140, 200, 190);
        doc.text(`Compared to: ${format(new Date(prevStart), "MMM d")} – ${format(new Date(prevEnd), "MMM d, yyyy")}`, pageW / 2, 120, { align: "center" });
      }

      doc.setFontSize(11);
      doc.setTextColor(200, 240, 235);
      doc.text(project.name, pageW / 2, 136, { align: "center" });
      if (project.websiteUrl) {
        doc.setFontSize(9);
        doc.setTextColor(140, 200, 190);
        doc.text(project.websiteUrl, pageW / 2, 146, { align: "center" });
      }

      doc.setFontSize(8);
      doc.setTextColor(100, 160, 150);
      doc.text(`Generated by Maxentrix SEO Platform  •  ${format(new Date(), "MMMM d, yyyy")}`, pageW / 2, pageH - 18, { align: "center" });

      // ── Page 2: Executive Summary ──
      doc.addPage();
      let y = 20;

      const sectionTitle = (title: string, iconLabel?: string) => {
        doc.setFillColor(...BRAND_COLOR);
        doc.rect(0, y - 4, pageW, 14, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`${iconLabel ?? ""}  ${title}`, 14, y + 6);
        doc.setTextColor(0, 0, 0);
        y += 18;
      };

      sectionTitle("Executive Summary", "▶");

      // KPI overview table
      const kpiRows: string[][] = [];
      if (config.sections.keywords) {
        kpiRows.push(
          ["Total Keywords Tracked", String(totalKeywords), ""],
          ["Top 3 Rankings", String(top3), totalKeywords > 0 ? `${Math.round((top3 / totalKeywords) * 100)}% of tracked` : ""],
          ["Top 10 Rankings", String(top10), totalKeywords > 0 ? `${Math.round((top10 / totalKeywords) * 100)}% of tracked` : ""],
          ["Keywords Improved", String(improved), improved > 0 ? "↑ Positive" : "—"],
          ["Keywords Declined", String(declined), declined > 0 ? "↓ Needs attention" : "—"],
        );
      }
      if (config.sections.gsc && gscData) {
        kpiRows.push(
          ["GSC Total Clicks", String(gscData.totalClicks.toLocaleString()),
            gscPrevData ? `vs ${gscPrevData.totalClicks.toLocaleString()} prev (${fmtPct(pctChange(gscData.totalClicks, gscPrevData.totalClicks))})` : ""],
          ["GSC Total Impressions", String(gscData.totalImpressions.toLocaleString()),
            gscPrevData ? `vs ${gscPrevData.totalImpressions.toLocaleString()} prev (${fmtPct(pctChange(gscData.totalImpressions, gscPrevData.totalImpressions))})` : ""],
          ["GSC Average CTR", `${(gscData.avgCtr * 100).toFixed(2)}%`,
            gscPrevData ? `vs ${(gscPrevData.avgCtr * 100).toFixed(2)}% prev` : ""],
          ["GSC Average Position", gscData.avgPosition.toFixed(1),
            gscPrevData ? `vs ${gscPrevData.avgPosition.toFixed(1)} prev` : ""],
        );
      }
      if (config.sections.ga4 && ga4Data) {
        kpiRows.push(
          ["GA4 Total Sessions", String(ga4Data.sessions.toLocaleString()),
            ga4PrevData ? `vs ${ga4PrevData.sessions.toLocaleString()} prev (${fmtPct(pctChange(ga4Data.sessions, ga4PrevData.sessions))})` : ""],
          ["GA4 Organic Sessions", String(ga4Data.organicSessions.toLocaleString()),
            ga4PrevData ? `vs ${ga4PrevData.organicSessions.toLocaleString()} prev (${fmtPct(pctChange(ga4Data.organicSessions, ga4PrevData.organicSessions))})` : ""],
          ["GA4 Users", String(ga4Data.users.toLocaleString()), ""],
          ["GA4 Bounce Rate", `${ga4Data.bounceRate.toFixed(1)}%`, ""],
        );
      }
      if (config.sections.issuesResolved && latestAudit) {
        kpiRows.push(
          ["Site Health Score", latestAudit.overallScore !== undefined ? `${latestAudit.overallScore}/100` : "N/A", ""],
          ["Critical Issues", String(latestAudit.criticalCount), latestAudit.criticalCount === 0 ? "✓ Clean" : "⚠ Review"],
          ["Open Alerts", String(openAlerts), openAlerts === 0 ? "✓ All clear" : "⚠ Action needed"],
        );
      }

      autoTable(doc, {
        startY: y,
        head: [["Metric", "Value", "vs Previous Period"]],
        body: kpiRows,
        theme: "striped",
        headStyles: { fillColor: BRAND_COLOR, fontStyle: "bold", fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        columnStyles: {
          1: { halign: "right", fontStyle: "bold" },
          2: { fontSize: 8, textColor: [100, 100, 100] },
        },
      });

      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;

      // ── GSC Section ──
      if (config.sections.gsc && gscData && gscData.topQueries.length > 0) {
        if (y > 220) { doc.addPage(); y = 20; }
        sectionTitle("Google Search Console Performance", "◆");

        if (gscPrevData) {
          const compRows = [
            ["Clicks", gscData.totalClicks.toLocaleString(), gscPrevData.totalClicks.toLocaleString(), fmtPct(pctChange(gscData.totalClicks, gscPrevData.totalClicks))],
            ["Impressions", gscData.totalImpressions.toLocaleString(), gscPrevData.totalImpressions.toLocaleString(), fmtPct(pctChange(gscData.totalImpressions, gscPrevData.totalImpressions))],
            ["CTR", `${(gscData.avgCtr * 100).toFixed(2)}%`, `${(gscPrevData.avgCtr * 100).toFixed(2)}%`, fmtPct(pctChange(gscData.avgCtr, gscPrevData.avgCtr))],
            ["Avg Position", gscData.avgPosition.toFixed(1), gscPrevData.avgPosition.toFixed(1), fmtPct(pctChange(gscPrevData.avgPosition, gscData.avgPosition))],
          ];
          autoTable(doc, {
            startY: y,
            head: [["Metric", "Current Period", "Previous Period", "Change"]],
            body: compRows,
            theme: "grid",
            headStyles: { fillColor: BRAND_COLOR, fontSize: 9 },
            bodyStyles: { fontSize: 9 },
            columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right", fontStyle: "bold" } },
          });
          y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
        }

        if (y > 200) { doc.addPage(); y = 20; }
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Top Search Queries", 14, y);
        y += 5;

        autoTable(doc, {
          startY: y,
          head: [["Query", "Clicks", "Impressions", "CTR", "Position"]],
          body: gscData.topQueries.slice(0, 25).map((q) => [
            q.query.length > 45 ? q.query.slice(0, 45) + "…" : q.query,
            q.clicks.toLocaleString(),
            q.impressions.toLocaleString(),
            `${(q.ctr * 100).toFixed(2)}%`,
            q.position.toFixed(1),
          ]),
          theme: "striped",
          headStyles: { fillColor: BRAND_COLOR, fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
        });
        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

        if (gscData.topPages.length > 0) {
          if (y > 200) { doc.addPage(); y = 20; }
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.text("Top Performing Pages (GSC)", 14, y);
          y += 5;
          autoTable(doc, {
            startY: y,
            head: [["Page", "Clicks", "Impressions"]],
            body: gscData.topPages.slice(0, 15).map((p) => [
              p.page.length > 60 ? "…" + p.page.slice(-57) : p.page,
              p.clicks.toLocaleString(),
              p.impressions.toLocaleString(),
            ]),
            theme: "striped",
            headStyles: { fillColor: BRAND_COLOR, fontSize: 8 },
            bodyStyles: { fontSize: 8 },
            columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
          });
          y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
        }
      }

      // ── GA4 Section ──
      if (config.sections.ga4 && ga4Data && ga4Data.sessions > 0) {
        if (y > 200) { doc.addPage(); y = 20; }
        sectionTitle("Google Analytics 4 Performance", "◆");

        if (ga4PrevData) {
          const compRows = [
            ["Sessions", ga4Data.sessions.toLocaleString(), ga4PrevData.sessions.toLocaleString(), fmtPct(pctChange(ga4Data.sessions, ga4PrevData.sessions))],
            ["Organic Sessions", ga4Data.organicSessions.toLocaleString(), ga4PrevData.organicSessions.toLocaleString(), fmtPct(pctChange(ga4Data.organicSessions, ga4PrevData.organicSessions))],
            ["Users", ga4Data.users.toLocaleString(), ga4PrevData.users.toLocaleString(), fmtPct(pctChange(ga4Data.users, ga4PrevData.users))],
            ["Bounce Rate", `${ga4Data.bounceRate.toFixed(1)}%`, `${ga4PrevData.bounceRate.toFixed(1)}%`, fmtPct(pctChange(ga4Data.bounceRate, ga4PrevData.bounceRate))],
            ["Avg Session Duration", `${Math.floor(ga4Data.avgDuration / 60)}m${Math.round(ga4Data.avgDuration % 60)}s`, `${Math.floor(ga4PrevData.avgDuration / 60)}m${Math.round(ga4PrevData.avgDuration % 60)}s`, fmtPct(pctChange(ga4Data.avgDuration, ga4PrevData.avgDuration))],
          ];
          autoTable(doc, {
            startY: y,
            head: [["Metric", "Current Period", "Previous Period", "Change"]],
            body: compRows,
            theme: "grid",
            headStyles: { fillColor: BRAND_COLOR, fontSize: 9 },
            bodyStyles: { fontSize: 9 },
            columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right", fontStyle: "bold" } },
          });
          y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
        }

        if (ga4Data.topPages.length > 0) {
          if (y > 200) { doc.addPage(); y = 20; }
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.text("Top Landing Pages (GA4)", 14, y);
          y += 5;
          autoTable(doc, {
            startY: y,
            head: [["Page", "Sessions", "Bounce Rate"]],
            body: ga4Data.topPages.slice(0, 15).map((p) => [
              p.page.length > 60 ? "…" + p.page.slice(-57) : p.page,
              p.sessions.toLocaleString(),
              `${p.bounceRate.toFixed(1)}%`,
            ]),
            theme: "striped",
            headStyles: { fillColor: BRAND_COLOR, fontSize: 8 },
            bodyStyles: { fontSize: 8 },
            columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
          });
          y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
        }
      }

      // ── Keywords Section ──
      if (config.sections.keywords && (keywords?.length ?? 0) > 0) {
        doc.addPage();
        y = 20;
        sectionTitle("Keyword Rankings Overview", "◆");

        // Rank distribution
        autoTable(doc, {
          startY: y,
          head: [["Rank Band", "Count", "% of Tracked"]],
          body: [
            ["Top 3", String(top3), `${totalKeywords > 0 ? Math.round((top3 / totalKeywords) * 100) : 0}%`],
            ["Top 10", String(top10), `${totalKeywords > 0 ? Math.round((top10 / totalKeywords) * 100) : 0}%`],
            ["Top 20", String(keywords?.filter((k) => (k.latestPosition ?? 999) <= 20).length ?? 0), ""],
            ["Top 50", String(keywords?.filter((k) => (k.latestPosition ?? 999) <= 50).length ?? 0), ""],
            ["Top 100", String(keywords?.filter((k) => (k.latestPosition ?? 999) <= 100).length ?? 0), ""],
            ["Not ranked", String(keywords?.filter((k) => k.latestPosition === undefined).length ?? 0), ""],
          ],
          theme: "grid",
          headStyles: { fillColor: BRAND_COLOR, fontSize: 9 },
          bodyStyles: { fontSize: 9 },
          columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
        });
        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Full Keyword Rankings", 14, y);
        y += 5;

        autoTable(doc, {
          startY: y,
          head: [["Keyword", "Current", "Previous", "Change", "Best", "Intent", "Priority"]],
          body: (keywords ?? []).map((k) => {
            const delta = k.previousPosition !== undefined && k.latestPosition !== undefined
              ? k.previousPosition - k.latestPosition : null;
            return [
              k.keyword.length > 35 ? k.keyword.slice(0, 35) + "…" : k.keyword,
              k.latestPosition !== undefined ? `#${k.latestPosition}` : "—",
              k.previousPosition !== undefined ? `#${k.previousPosition}` : "—",
              delta === null ? "—" : delta > 0 ? `↑${delta}` : delta < 0 ? `↓${Math.abs(delta)}` : "→",
              k.bestPosition !== undefined ? `#${k.bestPosition}` : "—",
              k.intent ?? "—",
              k.priority ?? "—",
            ];
          }),
          theme: "striped",
          headStyles: { fillColor: BRAND_COLOR, fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          columnStyles: {
            1: { halign: "center" }, 2: { halign: "center" },
            3: { halign: "center", fontStyle: "bold" }, 4: { halign: "center" },
          },
        });
        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
      }

      // ── On-Page Activities & Changes ──
      if (config.sections.onPage && periodChanges.length > 0) {
        if (y > 220) { doc.addPage(); y = 20; }
        sectionTitle("On-Page Activities & Changes", "◆");

        autoTable(doc, {
          startY: y,
          head: [["Date", "Type", "Activity", "URL", "Impact"]],
          body: periodChanges.map((c) => [
            format(new Date(c.createdAt), "MMM d"),
            c.changeType,
            c.title.slice(0, 38),
            (c.url ?? "—").slice(0, 30),
            c.impactActual ?? c.impactExpected ?? "—",
          ]),
          theme: "striped",
          headStyles: { fillColor: BRAND_COLOR, fontSize: 8 },
          bodyStyles: { fontSize: 8 },
        });
        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
      }

      // ── Issues Resolved / Audit ──
      if (config.sections.issuesResolved && latestAuditIssues) {
        if (y > 200) { doc.addPage(); y = 20; }
        sectionTitle("Site Audit & Issues Summary", "◆");

        autoTable(doc, {
          startY: y,
          head: [["Metric", "Value"]],
          body: [
            ["Audit Score", latestAuditIssues.overallScore !== undefined ? `${latestAuditIssues.overallScore}/100` : "N/A"],
            ["Pages Crawled", String(latestAuditIssues.pagesCrawled)],
            ["Total Issues Found", String(latestAuditIssues.issuesFound)],
            ["Critical Issues", String(latestAuditIssues.criticalCount)],
            ["High Severity", String(latestAuditIssues.highCount)],
            ["Medium Severity", String(latestAuditIssues.mediumCount)],
            ["Low Severity", String(latestAuditIssues.lowCount)],
            ["Open Alerts", String(openAlerts)],
            ["Last Audit", latestAuditIssues.completedAt ? format(new Date(latestAuditIssues.completedAt), "MMMM d, yyyy") : "—"],
          ],
          theme: "striped",
          headStyles: { fillColor: BRAND_COLOR, fontSize: 9 },
          bodyStyles: { fontSize: 9 },
          columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
        });
      }

      // Footer on all pages
      const totalPages = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
      for (let i = 2; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`${config.label}  •  Page ${i} of ${totalPages}`, 14, pageH - 8);
        doc.text(`Generated by Maxentrix SEO Platform`, pageW - 14, pageH - 8, { align: "right" });
      }

      const filename = `${config.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${format(new Date(start), "yyyy-MM-dd")}.pdf`;
      doc.save(filename);
      toast.success("Smart PDF report downloaded");
    } catch (e) {
      toast.error("Failed to generate PDF");
      console.error(e);
    } finally {
      setGenerating(null);
    }
  }

  // ── CSV Exports ───────────────────────────────────────────────────────────

  function downloadCsv(rows: Record<string, unknown>[], filename: string) {
    const csv = Papa.unparse(rows);
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function exportCsvKeywords() {
    setGenerating("csv_keywords");
    downloadCsv(
      (keywords ?? []).map((k) => ({
        Keyword: k.keyword,
        "Current Position": k.latestPosition ?? "",
        "Previous Position": k.previousPosition ?? "",
        "Change": k.latestPosition !== undefined && k.previousPosition !== undefined
          ? k.previousPosition - k.latestPosition : "",
        "Best Position": k.bestPosition ?? "",
        Intent: k.intent ?? "",
        Priority: k.priority ?? "",
        Status: k.status ?? "",
        "Target URL": k.targetUrl ?? "",
        Tags: (k.tags ?? []).join(", "),
        Source: k.source ?? "",
        "Added At": format(new Date(k.addedAt), "yyyy-MM-dd"),
      })),
      `keywords-${project.name.replace(/\s+/g, "-")}-${start}.csv`
    );
    setGenerating(null);
  }

  function exportCsvGsc() {
    if (!gscData) { toast.error("Load live data first"); return; }
    setGenerating("csv_gsc");
    downloadCsv(
      gscData.topQueries.map((q) => ({
        Query: q.query,
        Clicks: q.clicks,
        Impressions: q.impressions,
        CTR: `${(q.ctr * 100).toFixed(2)}%`,
        Position: q.position.toFixed(1),
        "Period Start": start,
        "Period End": end,
        ...(gscPrevData ? {
          "Prev Clicks": gscPrevData.topQueries.find((r) => r.query === q.query)?.clicks ?? "",
          "Prev Position": gscPrevData.topQueries.find((r) => r.query === q.query)?.position.toFixed(1) ?? "",
        } : {}),
      })),
      `gsc-queries-${project.name.replace(/\s+/g, "-")}-${start}.csv`
    );
    setGenerating(null);
  }

  function exportCsvGa4() {
    if (!ga4Data) { toast.error("Load live data first"); return; }
    setGenerating("csv_ga4");
    downloadCsv(
      ga4Data.topPages.map((p) => ({
        Page: p.page,
        Sessions: p.sessions,
        "Bounce Rate": `${p.bounceRate.toFixed(1)}%`,
        "Period Start": start,
        "Period End": end,
      })),
      `ga4-pages-${project.name.replace(/\s+/g, "-")}-${start}.csv`
    );
    setGenerating(null);
  }

  function exportCsvCombined() {
    setGenerating("csv_combined");
    const rows: Record<string, unknown>[] = [];

    // Section: GSC Overview
    if (gscData) {
      rows.push({ Section: "GSC Overview", Metric: "Total Clicks", Value: gscData.totalClicks, "Previous": gscPrevData?.totalClicks ?? "", "Change %": gscPrevData ? fmtPct(pctChange(gscData.totalClicks, gscPrevData.totalClicks)) : "" });
      rows.push({ Section: "GSC Overview", Metric: "Total Impressions", Value: gscData.totalImpressions, "Previous": gscPrevData?.totalImpressions ?? "", "Change %": gscPrevData ? fmtPct(pctChange(gscData.totalImpressions, gscPrevData.totalImpressions)) : "" });
      rows.push({ Section: "GSC Overview", Metric: "Avg CTR", Value: `${(gscData.avgCtr * 100).toFixed(2)}%`, "Previous": gscPrevData ? `${(gscPrevData.avgCtr * 100).toFixed(2)}%` : "", "Change %": "" });
      rows.push({ Section: "GSC Overview", Metric: "Avg Position", Value: gscData.avgPosition.toFixed(1), "Previous": gscPrevData?.avgPosition.toFixed(1) ?? "", "Change %": "" });
      rows.push({ Section: "", Metric: "", Value: "", Previous: "", "Change %": "" });
    }
    // Section: GA4 Overview
    if (ga4Data) {
      rows.push({ Section: "GA4 Overview", Metric: "Sessions", Value: ga4Data.sessions, "Previous": ga4PrevData?.sessions ?? "", "Change %": ga4PrevData ? fmtPct(pctChange(ga4Data.sessions, ga4PrevData.sessions)) : "" });
      rows.push({ Section: "GA4 Overview", Metric: "Organic Sessions", Value: ga4Data.organicSessions, "Previous": ga4PrevData?.organicSessions ?? "", "Change %": ga4PrevData ? fmtPct(pctChange(ga4Data.organicSessions, ga4PrevData.organicSessions)) : "" });
      rows.push({ Section: "GA4 Overview", Metric: "Users", Value: ga4Data.users, "Previous": ga4PrevData?.users ?? "", "Change %": ga4PrevData ? fmtPct(pctChange(ga4Data.users, ga4PrevData.users)) : "" });
      rows.push({ Section: "", Metric: "", Value: "", Previous: "", "Change %": "" });
    }
    // Section: Keywords
    for (const k of keywords ?? []) {
      const delta = k.latestPosition !== undefined && k.previousPosition !== undefined
        ? k.previousPosition - k.latestPosition : null;
      rows.push({
        Section: "Keywords",
        Metric: k.keyword,
        Value: k.latestPosition !== undefined ? `#${k.latestPosition}` : "—",
        Previous: k.previousPosition !== undefined ? `#${k.previousPosition}` : "—",
        "Change %": delta !== null ? (delta > 0 ? `↑${delta}` : delta < 0 ? `↓${Math.abs(delta)}` : "→") : "—",
        Intent: k.intent ?? "",
        Priority: k.priority ?? "",
      });
    }
    if (rows.length > 0) rows.push({ Section: "", Metric: "", Value: "", Previous: "", "Change %": "" });
    // Section: On-Page Changes
    for (const c of periodChanges) {
      rows.push({
        Section: "On-Page Changes",
        Metric: c.title,
        Value: c.changeType,
        Previous: format(new Date(c.createdAt), "yyyy-MM-dd"),
        "Change %": c.impactActual ?? c.impactExpected ?? "",
        URL: c.url ?? "",
      });
    }

    downloadCsv(rows, `seo-combined-report-${project.name.replace(/\s+/g, "-")}-${start}.csv`);
    setGenerating(null);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const isLoading = changes === undefined || alerts === undefined || audits === undefined;
  const gscProp = gscConnection?.selectedProperties?.[project._id];
  const ga4Prop = ga4Connection?.selectedProperties?.[project._id];

  return (
    <div className="space-y-6 max-w-5xl">

      {/* Config Panel */}
      <div className="rounded-xl border bg-card p-5 space-y-5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <SettingsIcon className="h-4 w-4 text-primary" />
          Report Configuration
        </div>

        {/* Label */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Report Label / Title</Label>
            <Input
              value={config.label}
              onChange={(e) => setConfig((c) => ({ ...c, label: e.target.value }))}
              placeholder="e.g. Acme Corp — Monthly SEO Report"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Group Data By</Label>
            <Select value={config.groupBy} onValueChange={(v) => setConfig((c) => ({ ...c, groupBy: v as ReportConfig["groupBy"] }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Period */}
        <div className="space-y-3">
          <Label className="text-xs font-medium flex items-center gap-1.5">
            <CalendarIcon className="h-3.5 w-3.5" /> Report Period
          </Label>
          <div className="flex flex-wrap gap-2">
            {([
              { value: "7d", label: "Last 7 days" },
              { value: "28d", label: "Last 28 days" },
              { value: "last_month", label: "Last Month" },
              { value: "3months", label: "Last 3 Months" },
              { value: "custom", label: "Custom" },
            ] as const).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setConfig((c) => ({ ...c, period: opt.value }))}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium cursor-pointer transition-colors ${
                  config.period === opt.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-transparent text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {config.period === "custom" && (
            <div className="flex items-center gap-3 mt-2">
              <div className="space-y-1">
                <Label className="text-xs">From</Label>
                <Input type="date" value={config.customStart} onChange={(e) => setConfig((c) => ({ ...c, customStart: e.target.value }))} className="w-40 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">To</Label>
                <Input type="date" value={config.customEnd} onChange={(e) => setConfig((c) => ({ ...c, customEnd: e.target.value }))} className="w-40 text-xs" />
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 flex items-center gap-2">
            <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
            <span>
              <strong>Period:</strong> {format(new Date(start), "MMM d, yyyy")} – {format(new Date(end), "MMM d, yyyy")}
              {config.comparePrevious && (
                <span className="ml-2 text-muted-foreground">
                  · <strong>Compare:</strong> {format(new Date(prevStart), "MMM d")} – {format(new Date(prevEnd), "MMM d, yyyy")}
                </span>
              )}
            </span>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={config.comparePrevious}
              onCheckedChange={(v) => setConfig((c) => ({ ...c, comparePrevious: !!v }))}
            />
            <span className="text-sm">Compare with previous equivalent period</span>
          </label>
        </div>

        {/* Sections */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Include Sections</Label>
          <div className="flex flex-wrap gap-4">
            {([
              { key: "gsc" as const, label: "Google Search Console", connected: !!gscProp },
              { key: "ga4" as const, label: "Google Analytics 4", connected: !!ga4Prop },
              { key: "keywords" as const, label: "Keyword Rankings", connected: true },
              { key: "onPage" as const, label: "On-Page Activities", connected: true },
              { key: "issuesResolved" as const, label: "Issues & Audit", connected: true },
            ]).map((s) => (
              <label key={s.key} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={config.sections[s.key]}
                  onCheckedChange={(v) => setSection(s.key, !!v)}
                />
                <span className="text-sm">{s.label}</span>
                {!s.connected && s.key !== "keywords" && s.key !== "onPage" && s.key !== "issuesResolved" && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Not connected</Badge>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Load Data */}
        <div className="flex items-center gap-3 pt-1">
          <Button
            onClick={fetchLiveData}
            disabled={dataLoading}
            variant="secondary"
            size="sm"
          >
            {dataLoading
              ? <><RefreshCwIcon className="h-3.5 w-3.5 mr-1.5 animate-spin" />Loading live data…</>
              : <><RefreshCwIcon className="h-3.5 w-3.5 mr-1.5" />Load Live GSC + GA4 Data</>
            }
          </Button>
          {dataLoaded && (
            <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
              <CheckCircleIcon className="h-3.5 w-3.5" />
              Live data loaded
            </span>
          )}
          {(config.sections.gsc && !gscProp) && (
            <span className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangleIcon className="h-3 w-3" /> GSC property not selected
            </span>
          )}
          {(config.sections.ga4 && !ga4Prop) && (
            <span className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangleIcon className="h-3 w-3" /> GA4 property not selected
            </span>
          )}
        </div>
      </div>

      {/* Live Data Preview */}
      {(dataLoaded || isLoading) && (
        <div className="space-y-3">
          <div className="text-sm font-semibold flex items-center gap-2">
            <SparklesIcon className="h-4 w-4 text-primary" />
            Report Preview
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[1,2,3,4].map((i) => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {config.sections.gsc && gscData && (
                <>
                  <MetricCard label="GSC Clicks" value={gscData.totalClicks.toLocaleString()} change={gscPrevData ? pctChange(gscData.totalClicks, gscPrevData.totalClicks) : null} />
                  <MetricCard label="GSC Impressions" value={gscData.totalImpressions.toLocaleString()} change={gscPrevData ? pctChange(gscData.totalImpressions, gscPrevData.totalImpressions) : null} />
                  <MetricCard label="Avg Position" value={gscData.avgPosition.toFixed(1)} change={gscPrevData ? pctChange(gscPrevData.avgPosition, gscData.avgPosition) : null} />
                  <MetricCard label="Avg CTR" value={`${(gscData.avgCtr * 100).toFixed(2)}%`} change={gscPrevData ? pctChange(gscData.avgCtr, gscPrevData.avgCtr) : null} />
                </>
              )}
              {config.sections.ga4 && ga4Data && (
                <>
                  <MetricCard label="Sessions" value={ga4Data.sessions.toLocaleString()} change={ga4PrevData ? pctChange(ga4Data.sessions, ga4PrevData.sessions) : null} />
                  <MetricCard label="Organic Sessions" value={ga4Data.organicSessions.toLocaleString()} change={ga4PrevData ? pctChange(ga4Data.organicSessions, ga4PrevData.organicSessions) : null} />
                  <MetricCard label="Users" value={ga4Data.users.toLocaleString()} change={ga4PrevData ? pctChange(ga4Data.users, ga4PrevData.users) : null} />
                  <MetricCard label="Bounce Rate" value={`${ga4Data.bounceRate.toFixed(1)}%`} change={null} />
                </>
              )}
              {config.sections.keywords && (
                <>
                  <MetricCard label="Total Keywords" value={String(totalKeywords)} change={null} icon={<TargetIcon className="h-4 w-4 text-primary" />} />
                  <MetricCard label="Top 3" value={String(top3)} change={null} icon={<TrendingUpIcon className="h-4 w-4 text-green-600" />} />
                  <MetricCard label="Top 10" value={String(top10)} change={null} icon={<SearchIcon className="h-4 w-4 text-blue-500" />} />
                  <MetricCard label="Improved" value={String(improved)} change={null} icon={<TrendingUpIcon className="h-4 w-4 text-green-600" />} />
                </>
              )}
              {config.sections.issuesResolved && (
                <>
                  <MetricCard label="Audit Score" value={latestAudit?.overallScore !== undefined ? `${latestAudit.overallScore}/100` : "N/A"} change={null} />
                  <MetricCard label="Critical Issues" value={String(latestAudit?.criticalCount ?? 0)} change={null} icon={<AlertTriangleIcon className="h-4 w-4 text-red-500" />} />
                  <MetricCard label="Open Alerts" value={String(openAlerts)} change={null} />
                  <MetricCard label="On-Page Changes" value={String(periodChanges.length)} change={null} icon={<CheckCircleIcon className="h-4 w-4 text-green-600" />} />
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Export Panel */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="text-sm font-semibold flex items-center gap-2">
          <DownloadIcon className="h-4 w-4 text-primary" />
          Export Report
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* PDF */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <FileIcon className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium">PDF Reports</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Professional branded PDF with cover page, executive summary, GSC/GA4 comparison tables, full keyword rankings, on-page activities, and audit summary.
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1.5">
              <SparklesIcon className="h-3 w-3 text-primary shrink-0" />
              Smart report — includes only sections with available data
            </div>
            <div className="space-y-2">
              <Button
                onClick={() => { setGenerating("pdf_smart"); generateSmartPDF(); }}
                disabled={generating !== null || isLoading}
                className="w-full"
                size="sm"
              >
                <DownloadIcon className="h-3.5 w-3.5 mr-1.5" />
                {generating === "pdf_smart" ? "Generating PDF…" : `Download ${config.period === "last_month" ? "Monthly" : config.period === "7d" ? "Weekly" : "Custom"} Smart Report PDF`}
              </Button>
            </div>
            {!dataLoaded && (config.sections.gsc || config.sections.ga4) && (
              <p className="text-[11px] text-amber-600 flex items-center gap-1">
                <AlertTriangleIcon className="h-3 w-3" />
                Load live data above to include GSC & GA4 in PDF
              </p>
            )}
          </div>

          {/* CSV */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <TableIcon className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">CSV / Spreadsheet Export</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Export raw data for Excel, Google Sheets, or Looker Studio. Choose a combined sheet or individual data sources.
            </p>
            <div className="space-y-2">
              <Button
                onClick={exportCsvCombined}
                disabled={generating !== null || isLoading}
                variant="secondary"
                className="w-full"
                size="sm"
              >
                <DownloadIcon className="h-3.5 w-3.5 mr-1.5" />
                {generating === "csv_combined" ? "Exporting…" : "Combined CSV (GSC + GA4 + Keywords + Changes)"}
              </Button>
              <Button
                onClick={exportCsvKeywords}
                disabled={generating !== null || totalKeywords === 0}
                variant="secondary"
                className="w-full"
                size="sm"
              >
                <DownloadIcon className="h-3.5 w-3.5 mr-1.5" />
                {generating === "csv_keywords" ? "Exporting…" : `Keywords CSV (${totalKeywords} keywords)`}
              </Button>
              <Button
                onClick={exportCsvGsc}
                disabled={generating !== null || !dataLoaded || !gscData}
                variant="secondary"
                className="w-full"
                size="sm"
              >
                <DownloadIcon className="h-3.5 w-3.5 mr-1.5" />
                {generating === "csv_gsc" ? "Exporting…" : "GSC Queries CSV"}
              </Button>
              <Button
                onClick={exportCsvGa4}
                disabled={generating !== null || !dataLoaded || !ga4Data}
                variant="secondary"
                className="w-full"
                size="sm"
              >
                <DownloadIcon className="h-3.5 w-3.5 mr-1.5" />
                {generating === "csv_ga4" ? "Exporting…" : "GA4 Pages CSV"}
              </Button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

// ── Metric Card ──────────────────────────────────────────────────────────────

function MetricCard({ label, value, change, icon }: {
  label: string;
  value: string;
  change: number | null;
  icon?: React.ReactNode;
}) {
  const isUp = (change ?? 0) >= 0;
  return (
    <div className="rounded-xl border bg-card p-4 space-y-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
        {icon}
        <span className="uppercase tracking-wide text-[10px]">{label}</span>
      </div>
      <div className="text-xl font-bold tabular-nums">{value}</div>
      {change !== null && (
        <div className={`flex items-center gap-1 text-xs font-medium ${isUp ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
          {isUp ? <TrendingUpIcon className="h-3 w-3" /> : <TrendingDownIcon className="h-3 w-3" />}
          {fmtPct(change)} vs prev period
        </div>
      )}
    </div>
  );
}
