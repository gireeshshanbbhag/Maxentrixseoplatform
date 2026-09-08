import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  ChevronLeftIcon, ChevronRightIcon, CalendarIcon, PlusIcon,
} from "lucide-react";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  format, isSameMonth, isSameDay, addMonths, subMonths, parseISO, isValid,
} from "date-fns";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";

const STATUS_COLORS: Record<string, string> = {
  idea: "bg-muted text-muted-foreground",
  brief: "bg-blue-500/70 text-white",
  draft: "bg-amber-500/70 text-white",
  review: "bg-purple-500/70 text-white",
  published: "bg-green-600/80 text-white",
  monitor: "bg-primary/80 text-white",
  refresh: "bg-orange-500/70 text-white",
};

type ViewMode = "month" | "list";

export default function ContentCalendar({
  project,
  onEdit,
}: {
  project: Doc<"projects">;
  onEdit: (id: Id<"contentPieces">) => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");

  const pieces = useQuery(api.content.queries.getCalendar, { projectId: project._id });

  if (pieces === undefined) {
    return <div className="p-6"><Skeleton className="h-96 w-full" /></div>;
  }

  // Map pieces to dates
  const piecesWithDates = pieces.filter((p) => {
    const date = p.scheduledAt ?? p.publishedAt;
    return date && isValid(parseISO(date));
  });

  function getPiecesForDay(day: Date) {
    return piecesWithDates.filter((p) => {
      const date = parseISO(p.scheduledAt ?? p.publishedAt ?? "");
      return isSameDay(date, day);
    });
  }

  // Month grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  // Upcoming list
  const upcoming = [...piecesWithDates]
    .sort((a, b) => {
      const da = parseISO(a.scheduledAt ?? a.publishedAt ?? "").getTime();
      const db = parseISO(b.scheduledAt ?? b.publishedAt ?? "").getTime();
      return da - db;
    })
    .filter((p) => {
      const date = parseISO(p.scheduledAt ?? p.publishedAt ?? "");
      return date >= startOfMonth(currentMonth);
    })
    .slice(0, 30);

  const unscheduled = pieces.filter((p) => !p.scheduledAt && !p.publishedAt);

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <div className="text-sm font-semibold min-w-[140px] text-center">
              {format(currentMonth, "MMMM yyyy")}
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date())}>Today</Button>
        </div>
        <div className="flex gap-1 rounded-lg border p-1 bg-muted">
          {(["month", "list"] as ViewMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer capitalize ${viewMode === m ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {viewMode === "month" && (
        <div className="rounded-xl border overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b bg-muted/30">
            {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => (
              <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
            ))}
          </div>
          {/* Day grid */}
          <div className="grid grid-cols-7">
            {days.map((day, idx) => {
              const dayPieces = getPiecesForDay(day);
              const isToday = isSameDay(day, new Date());
              const isCurrentMonth = isSameMonth(day, currentMonth);
              return (
                <div
                  key={idx}
                  className={`min-h-[80px] border-b border-r p-1.5 ${!isCurrentMonth ? "bg-muted/10" : ""} ${isToday ? "bg-primary/5" : ""}`}
                >
                  <div className={`text-xs font-medium mb-1 ${isToday ? "text-primary font-bold" : !isCurrentMonth ? "text-muted-foreground/50" : "text-muted-foreground"}`}>
                    {format(day, "d")}
                  </div>
                  <div className="space-y-0.5">
                    {dayPieces.slice(0, 3).map((p) => (
                      <button
                        key={p._id}
                        onClick={() => onEdit(p._id)}
                        className={`w-full text-left text-[10px] px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80 transition-opacity ${STATUS_COLORS[p.status] ?? "bg-muted"}`}
                        title={p.title}
                      >
                        {p.title}
                      </button>
                    ))}
                    {dayPieces.length > 3 && (
                      <div className="text-[10px] text-muted-foreground px-1">+{dayPieces.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {viewMode === "list" && (
        <div className="space-y-4">
          {upcoming.length === 0 ? (
            <div className="rounded-xl border py-10 text-center text-sm text-muted-foreground">
              No scheduled content for this period
            </div>
          ) : (
            <div className="rounded-xl border divide-y overflow-hidden">
              {upcoming.map((p) => {
                const date = parseISO(p.scheduledAt ?? p.publishedAt ?? "");
                return (
                  <div
                    key={p._id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-accent/20 cursor-pointer transition-colors"
                    onClick={() => onEdit(p._id)}
                  >
                    <div className="text-center min-w-[48px]">
                      <div className="text-xs text-muted-foreground">{format(date, "MMM")}</div>
                      <div className="text-lg font-bold leading-none">{format(date, "d")}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{p.title}</div>
                      {p.targetKeyword && <div className="text-xs text-muted-foreground">🎯 {p.targetKeyword}</div>}
                    </div>
                    <Badge
                      variant="secondary"
                      className={`text-xs capitalize shrink-0 ${STATUS_COLORS[p.status] ?? ""}`}
                    >
                      {p.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}

          {unscheduled.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Unscheduled ({unscheduled.length})
              </div>
              <div className="rounded-xl border divide-y overflow-hidden">
                {unscheduled.slice(0, 10).map((p) => (
                  <div
                    key={p._id}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/20 cursor-pointer transition-colors"
                    onClick={() => onEdit(p._id)}
                  >
                    <CalendarIcon className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{p.title}</div>
                    </div>
                    <Badge variant="secondary" className={`text-xs capitalize shrink-0 ${STATUS_COLORS[p.status] ?? ""}`}>
                      {p.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {Object.entries(STATUS_COLORS).map(([status, cls]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className={`h-2.5 w-2.5 rounded-sm ${cls.split(" ")[0]}`} />
            <span className="capitalize">{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
