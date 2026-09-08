import { useState, useRef, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import {
  ExternalLinkIcon,
  CheckIcon,
  SearchIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  MinusIcon,
  ChevronRightIcon,
  PauseIcon,
  PlayIcon,
  RotateCcwIcon,
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

type Keyword = {
  _id: Id<"keywords">;
  keyword: string;
  serpPosition?: number;
  serpPreviousPosition?: number;
  country?: string;
  city?: string;
  state?: string;
};

type Props = {
  projectId: Id<"projects">;
  projectDomain: string;
  keywords: Keyword[];
};

type Session = "idle" | "active" | "paused";

function buildGoogleUrl(keyword: string, city?: string, country?: string): string {
  const query = [keyword, city].filter(Boolean).join(" ");
  const gl = country ? country.slice(0, 2).toLowerCase() : "us";
  return `https://www.google.com/search?q=${encodeURIComponent(query)}&num=100&hl=en&gl=${gl}&pws=0`;
}

function TrendIcon({ pos, prev }: { pos?: number; prev?: number }) {
  if (!pos || !prev) return <MinusIcon className="h-3.5 w-3.5 text-muted-foreground" />;
  if (pos < prev) return <TrendingUpIcon className="h-3.5 w-3.5 text-green-500" />;
  if (pos > prev) return <TrendingDownIcon className="h-3.5 w-3.5 text-red-500" />;
  return <MinusIcon className="h-3.5 w-3.5 text-muted-foreground" />;
}

// Persist session cursor per project in localStorage
function sessionKey(projectId: string) {
  return `serp-session-${projectId}`;
}
function loadCursor(projectId: string): string | null {
  try { return localStorage.getItem(sessionKey(projectId)); } catch { return null; }
}
function saveCursor(projectId: string, kwId: string | null) {
  try {
    if (kwId) localStorage.setItem(sessionKey(projectId), kwId);
    else localStorage.removeItem(sessionKey(projectId));
  } catch { /* ignore */ }
}

export default function ManualSerpChecker({ projectId, projectDomain, keywords }: Props) {
  const [session, setSession] = useState<Session>("idle");
  const [selectedIdx, setSelectedIdx] = useState(0);
  // Live position overrides — updated immediately on save so list reflects new rank without waiting for query refetch
  const [livePositions, setLivePositions] = useState<Record<string, number | null>>({});
  const [posInput, setPosInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addRankSnapshot = useMutation(api.keywords.mutations.addRankSnapshot);

  const filtered = keywords.filter((k) =>
    k.keyword.toLowerCase().includes(search.toLowerCase())
  );

  const selected = session === "active" ? (filtered[selectedIdx] ?? null) : null;

  // Auto-focus when keyword changes
  useEffect(() => {
    if (session === "active" && selected) {
      setPosInput("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [selected?._id, session]);

  function startSession() {
    // Resume from saved cursor if available
    const saved = loadCursor(projectId);
    let startIdx = 0;
    if (saved) {
      const idx = filtered.findIndex((k) => k._id === saved);
      if (idx !== -1) startIdx = idx;
    }
    setSelectedIdx(startIdx);
    setSession("active");
    const kw = filtered[startIdx];
    if (kw) openGoogle(kw);
  }

  function pauseSession() {
    if (selected) saveCursor(projectId, selected._id);
    setSession("paused");
    toast.info("Session paused — your progress is saved. Resume anytime.");
  }

  function resumeSession() {
    setSession("active");
    const kw = filtered[selectedIdx];
    if (kw) openGoogle(kw);
  }

  function resetSession() {
    saveCursor(projectId, null);
    setChecked(new Set());
    setLivePositions({});
    setSelectedIdx(0);
    setSession("idle");
  }

  function openGoogle(kw: Keyword) {
    window.open(buildGoogleUrl(kw.keyword, kw.city, kw.country), "_blank", "noopener,noreferrer");
  }

  function goTo(idx: number) {
    setSelectedIdx(idx);
    setSession("active");
    const kw = filtered[idx];
    if (kw) openGoogle(kw);
  }

  async function handleSave(notFound = false) {
    if (!selected) return;
    const pos = notFound ? undefined : parseInt(posInput.trim(), 10);
    if (!notFound && (isNaN(pos!) || pos! < 1 || pos! > 100)) {
      toast.error("Enter a position between 1 and 100");
      return;
    }
    setSaving(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      await addRankSnapshot({
        keywordId: selected._id,
        snapshotDate: today,
        position: notFound ? undefined : pos,
        source: "manual",
      });
      // Update live position immediately in the sidebar list
      setLivePositions((prev) => ({ ...prev, [selected._id]: notFound ? null : pos! }));
      setChecked((s) => new Set([...s, selected._id]));

      if (notFound) {
        toast.success(`"${selected.keyword}" marked as not in top 100`);
      } else {
        toast.success(`Saved #${pos!} for "${selected.keyword}"`);
      }

      // Advance to next unchecked keyword
      const nextIdx = findNextUnchecked(selectedIdx + 1);
      if (nextIdx !== -1) {
        setSelectedIdx(nextIdx);
        saveCursor(projectId, filtered[nextIdx]._id);
        openGoogle(filtered[nextIdx]);
      } else {
        // All done
        saveCursor(projectId, null);
        setSession("paused");
        toast.success("All keywords checked! Session complete.", { duration: 5000 });
      }
    } catch (e) {
      if (e instanceof ConvexError) {
        toast.error((e.data as { message: string }).message);
      } else {
        toast.error("Failed to save");
      }
    } finally {
      setSaving(false);
    }
  }

  function findNextUnchecked(from: number): number {
    for (let i = from; i < filtered.length; i++) {
      if (!checked.has(filtered[i]._id)) return i;
    }
    return -1;
  }

  const checkedCount = checked.size;
  const totalCount = filtered.length;
  const progressPct = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;
  const savedCursor = loadCursor(projectId);
  const hasSavedSession = !!savedCursor && filtered.some((k) => k._id === savedCursor);

  // ── Idle / Paused screen ─────────────────────────────────────────────────
  if (session !== "active") {
    return (
      <div className="flex flex-col h-full min-h-0">
        {/* Banner */}
        <TruthBanner />

        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md text-center space-y-6">

            {session === "paused" ? (
              <>
                <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center mx-auto">
                  <PauseIcon className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Session paused</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {checkedCount} of {totalCount} keywords checked. Your position is saved.
                  </p>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{checkedCount} checked</span>
                    <span>{totalCount - checkedCount} remaining</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-right">{progressPct}% complete</p>
                </div>

                <div className="flex flex-col gap-2">
                  <Button className="cursor-pointer w-full" onClick={resumeSession}>
                    <PlayIcon className="h-4 w-4 mr-2" />
                    Continue from where I left off
                  </Button>
                  <Button variant="ghost" size="sm" className="cursor-pointer text-muted-foreground" onClick={resetSession}>
                    <RotateCcwIcon className="h-3.5 w-3.5 mr-1.5" />
                    Start over (reset progress)
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-muted border flex items-center justify-center mx-auto">
                  <SearchIcon className="h-7 w-7 text-muted-foreground" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Manual SERP Rank Check</h2>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    Click a keyword → Google opens pre-searched → find <strong>{projectDomain}</strong> in the results → enter its position → save.
                    <br />You can pause anytime and resume exactly where you stopped.
                  </p>
                </div>

                {hasSavedSession && (
                  <div className="rounded-lg border bg-primary/5 border-primary/20 px-4 py-3 text-sm text-left space-y-1">
                    <p className="font-semibold text-primary">Unfinished session detected</p>
                    <p className="text-xs text-muted-foreground">You have a previous session in progress. Resume to continue from your last keyword.</p>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <Button className="cursor-pointer w-full" onClick={startSession}>
                    <PlayIcon className="h-4 w-4 mr-2" />
                    {hasSavedSession ? "Resume previous session" : `Start checking ${totalCount} keyword${totalCount !== 1 ? "s" : ""}`}
                  </Button>
                  {hasSavedSession && (
                    <Button variant="ghost" size="sm" className="cursor-pointer text-muted-foreground" onClick={resetSession}>
                      <RotateCcwIcon className="h-3.5 w-3.5 mr-1.5" />
                      Start fresh
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Active session ───────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full min-h-0">
      <TruthBanner />

      {/* Session toolbar */}
      <div className="border-b px-4 py-2 flex items-center gap-3 bg-muted/20">
        <div className="flex-1 space-y-1">
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {checkedCount} of {totalCount} checked · keyword {selectedIdx + 1} of {totalCount}
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          className="cursor-pointer shrink-0"
          onClick={pauseSession}
        >
          <PauseIcon className="h-3.5 w-3.5 mr-1.5" />
          Pause &amp; Exit
        </Button>
      </div>

      {/* Main panel */}
      <div className="flex flex-1 min-h-0 divide-x">

        {/* Left: keyword list */}
        <div className="w-72 flex-none flex flex-col min-h-0">
          <div className="p-3 border-b">
            <div className="relative">
              <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="pl-8 h-8 text-sm"
                placeholder="Filter keywords…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.map((kw, idx) => {
              const isActive = idx === selectedIdx;
              const isDone = checked.has(kw._id);
              // Show live-updated position if we just saved it
              const displayPos = kw._id in livePositions
                ? (livePositions[kw._id] ?? undefined)
                : kw.serpPosition;
              return (
                <button
                  key={kw._id}
                  onClick={() => goTo(idx)}
                  className={`w-full text-left px-3 py-2.5 border-b hover:bg-muted/50 transition-colors cursor-pointer flex items-center gap-2 group ${isActive ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${isActive ? "font-semibold text-primary" : isDone ? "line-through text-muted-foreground" : ""}`}>
                      {kw.keyword}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {displayPos !== undefined ? (
                        <span className={`text-xs flex items-center gap-0.5 ${isDone && kw._id in livePositions ? "text-green-600 dark:text-green-400 font-semibold" : "text-muted-foreground"}`}>
                          <TrendIcon pos={displayPos} prev={kw.serpPreviousPosition} />
                          #{displayPos}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                      {kw.city && <span className="text-xs text-muted-foreground truncate">{kw.city}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isDone
                      ? <CheckIcon className="h-3.5 w-3.5 text-green-500" />
                      : <ChevronRightIcon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    }
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: entry panel */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-0">
          {!selected ? (
            <p className="text-sm text-muted-foreground">All keywords checked!</p>
          ) : (
            <div className="w-full max-w-md space-y-6">

              {/* Keyword header */}
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                  Keyword {selectedIdx + 1} of {totalCount}
                </p>
                <h2 className="text-2xl font-bold break-words">{selected.keyword}</h2>
                {selected.serpPosition !== undefined && (
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                    <TrendIcon pos={selected.serpPosition} prev={selected.serpPreviousPosition} />
                    Last recorded: <strong>#{selected.serpPosition}</strong>
                  </p>
                )}
              </div>

              {/* Step 1 */}
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
                  Open Google and find your position
                </p>
                <Button variant="secondary" size="sm" className="cursor-pointer w-full" onClick={() => openGoogle(selected)}>
                  <ExternalLinkIcon className="h-3.5 w-3.5 mr-2" />
                  Search "{selected.keyword}" on Google
                </Button>
                <p className="text-xs text-muted-foreground">
                  Scroll through results and find where <strong>{projectDomain}</strong> appears. Count organic results only (skip ads).
                </p>
              </div>

              {/* Step 2 */}
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
                  Enter the position you found
                </p>
                <div className="flex gap-2 items-center">
                  <span className="text-muted-foreground text-sm font-medium">#</span>
                  <Input
                    ref={inputRef}
                    type="number"
                    min={1}
                    max={100}
                    placeholder="e.g. 7"
                    value={posInput}
                    onChange={(e) => setPosInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSave(false); }}
                    className="w-28 text-2xl font-bold h-12 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="cursor-pointer flex-1" onClick={() => handleSave(false)} disabled={saving || !posInput.trim()}>
                    <CheckIcon className="h-3.5 w-3.5 mr-1.5" />
                    {saving ? "Saving…" : "Save & Next →"}
                  </Button>
                  <Button size="sm" variant="ghost" className="cursor-pointer text-muted-foreground" onClick={() => handleSave(true)} disabled={saving}>
                    Not in top 100
                  </Button>
                </div>
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function TruthBanner() {
  return (
    <div className="relative overflow-hidden border-b bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-amber-950/40 px-6 py-3">
      <div
        className="absolute inset-0 opacity-[0.04] dark:opacity-[0.08]"
        style={{ backgroundImage: "repeating-linear-gradient(45deg, currentColor 0, currentColor 1px, transparent 0, transparent 50%)", backgroundSize: "8px 8px" }}
      />
      <div className="relative flex items-start gap-3 max-w-3xl">
        <div className="shrink-0 mt-0.5 flex items-center justify-center h-7 w-7 rounded-full bg-amber-400/20 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-700">
          <span className="text-sm">⚠</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 leading-snug">
            SERP APIs show <span className="italic">estimated</span> rankings — not what your real customers see.
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5 leading-relaxed">
            Third-party rank trackers pull data from remote servers, bypassing personalisation, local intent, and device context.
            In SEO, your <strong className="font-semibold text-amber-800 dark:text-amber-300">real search visibility shapes your brand's reputation</strong> — and reputation is everything.
            Verifying rankings yourself is the only way to see exactly what a genuine customer finds when they search for you.
          </p>
        </div>
      </div>
    </div>
  );
}
