import { Skeleton } from "@/components/ui/skeleton.tsx";
import { MousePointerClickIcon, EyeIcon, PercentIcon, TrendingUpIcon } from "lucide-react";

type GscData = {
  totalClicks: number;
  totalImpressions: number;
  avgCtr: number;
  avgPosition: number;
} | null;

type DevicesData = {
  rows: Array<{ keys: string[]; clicks: number; impressions: number }>;
} | null;

export default function GscOverviewCards({
  data,
  devicesData,
  loading,
}: {
  data: GscData;
  devicesData: DevicesData;
  loading: boolean;
}) {
  const cards = [
    {
      label: "Total Clicks",
      value: data ? data.totalClicks.toLocaleString() : "—",
      icon: MousePointerClickIcon,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      label: "Impressions",
      value: data ? data.totalImpressions.toLocaleString() : "—",
      icon: EyeIcon,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-500/10",
    },
    {
      label: "Avg. CTR",
      value: data ? `${(data.avgCtr * 100).toFixed(1)}%` : "—",
      icon: PercentIcon,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-500/10",
    },
    {
      label: "Avg. Position",
      value: data ? data.avgPosition.toFixed(1) : "—",
      icon: TrendingUpIcon,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10",
    },
  ];

  // Device breakdown
  const devices = devicesData?.rows ?? [];
  const totalDeviceClicks = devices.reduce((s, r) => s + r.clicks, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border p-4">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-7 w-24" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${card.bg}`}>
                    <card.icon className={`h-3.5 w-3.5 ${card.color}`} />
                  </div>
                  <span className="text-xs text-muted-foreground">{card.label}</span>
                </div>
                <div className={`text-2xl font-bold tabular-nums ${card.color}`}>
                  {card.value}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Device breakdown */}
      {(devices.length > 0 || loading) && (
        <div className="rounded-xl border p-4">
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-3">
            Clicks by Device
          </div>
          {loading ? (
            <div className="flex gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8 flex-1" />
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-4">
              {devices.map((d) => {
                const pct = totalDeviceClicks > 0 ? (d.clicks / totalDeviceClicks) * 100 : 0;
                return (
                  <div key={d.keys[0]} className="flex-1 min-w-[80px]">
                    <div className="text-sm font-semibold tabular-nums">
                      {d.clicks.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground capitalize">{d.keys[0]}</div>
                    <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{pct.toFixed(0)}%</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
