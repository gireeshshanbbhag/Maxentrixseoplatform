import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { format, parseISO } from "date-fns";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";

type Props = {
  data: Doc<"rankSnapshots">[];
};

export default function RankHistoryChart({ data }: Props) {
  // Sort ascending by date for chart
  const sorted = [...data].sort((a, b) =>
    a.snapshotDate.localeCompare(b.snapshotDate)
  );

  const chartData = sorted.map((s) => ({
    date: s.snapshotDate,
    position: s.position ?? null,
    dateLabel: format(parseISO(s.snapshotDate + "T00:00:00"), "MMM d"),
  }));

  // Invert Y axis so position 1 is at the top
  const positions = chartData
    .map((d) => d.position)
    .filter((p): p is number => p !== null);
  const maxPos = positions.length > 0 ? Math.max(...positions) : 100;
  const minPos = positions.length > 0 ? Math.min(...positions) : 1;

  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            reversed
            domain={[Math.max(1, minPos - 2), maxPos + 2]}
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const d = payload[0].payload as { date: string; position: number | null };
              return (
                <div className="bg-popover border rounded-lg px-3 py-2 text-xs shadow-md">
                  <div className="text-muted-foreground mb-0.5">
                    {format(parseISO(d.date + "T00:00:00"), "MMM d, yyyy")}
                  </div>
                  <div className="font-semibold">
                    Position: {d.position ?? "Not ranked"}
                  </div>
                </div>
              );
            }}
          />
          {[3, 10, 20].map((pos) => (
            <ReferenceLine
              key={pos}
              y={pos}
              stroke="var(--border)"
              strokeDasharray="3 3"
              label={{
                value: `#${pos}`,
                position: "right",
                fontSize: 9,
                fill: "var(--muted-foreground)",
              }}
            />
          ))}
          <Line
            type="monotone"
            dataKey="position"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--primary)" }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
