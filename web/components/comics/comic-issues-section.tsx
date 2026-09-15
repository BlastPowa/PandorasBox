"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Check, ExternalLink, ListChecks, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { ComicIssue } from "@/lib/comics-shared";
import { useLibrary } from "@/lib/library/use-library";

const PAGE_SIZE = 48;

function issueYear(issue: ComicIssue) {
  return issue.coverDate?.slice(0, 4) ?? "Unknown";
}

export function ComicIssuesSection({ itemId, issues }: { itemId: string; issues: ComicIssue[] }) {
  const [year, setYear] = useState("all");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const { signedIn, getById, updateProgress } = useLibrary();
  const item = getById(itemId);

  const canonical = useMemo(() => issues.slice().sort((a, b) => {
    const byDate = (a.coverDate ?? "9999-12-31").localeCompare(b.coverDate ?? "9999-12-31");
    if (byDate !== 0) return byDate;
    return (Number.parseFloat(a.issueNumber ?? "") || Number.MAX_SAFE_INTEGER) - (Number.parseFloat(b.issueNumber ?? "") || Number.MAX_SAFE_INTEGER);
  }), [issues]);
  const positions = useMemo(() => new Map(canonical.map((issue, index) => [issue.id, index + 1])), [canonical]);
  const years = useMemo(() => Array.from(new Set(canonical.map(issueYear).filter((value) => value !== "Unknown"))).sort((a, b) => b.localeCompare(a)), [canonical]);
  const filtered = useMemo(() => {
    const selected = year === "all" ? canonical : canonical.filter((issue) => issueYear(issue) === year);
    return order === "asc" ? selected : selected.slice().reverse();
  }, [canonical, order, year]);
  const displayed = filtered.slice(0, visible);
  const currentPosition = item?.progress.currentChapter ?? 0;
  const progressPercent = canonical.length > 0 ? Math.min(100, Math.round((currentPosition / canonical.length) * 100)) : 0;
  const nextIssue = currentPosition < canonical.length ? canonical[currentPosition] : null;

  async function markThrough(issue: ComicIssue) {
    if (!item) return;
    const position = positions.get(issue.id);
    if (!position) return;
    try {
      await updateProgress(itemId, {
        currentChapter: position,
        currentIssueId: issue.id,
        currentIssueNumber: issue.issueNumber,
        totalChapters: item.totalChapters ?? canonical.length,
      });
      toast.success(`Read through issue ${issue.issueNumber ? `#${issue.issueNumber}` : position}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update issue progress");
    }
  }

  if (issues.length === 0) return null;

  return (
    <section className="space-y-5 border-t border-[var(--border)] pt-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Complete release list</p>
          <h2 className="font-display text-2xl font-bold">Issues</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{canonical.length} issues ordered by cover date. Printed issue numbers remain separate from tracking position.</p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:flex-wrap lg:overflow-visible lg:pb-0">
          <button type="button" onClick={() => { setOrder("asc"); setYear("all"); setVisible(PAGE_SIZE); }} className="h-10 rounded-full border border-[var(--border)] bg-[var(--glass)] px-4 text-xs font-semibold hover:border-[var(--accent)]">Start issues</button>
          <button type="button" onClick={() => { setOrder("desc"); setYear("all"); setVisible(PAGE_SIZE); }} className="h-10 rounded-full border border-[var(--border)] bg-[var(--glass)] px-4 text-xs font-semibold hover:border-[var(--accent)]">Latest issues</button>
          <select value={year} onChange={(event) => { setYear(event.target.value); setVisible(PAGE_SIZE); }} aria-label="Filter issues by release year" className="h-10 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-4 text-xs font-semibold">
            <option value="all">All release years</option>
            {years.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select value={order} onChange={(event) => { setOrder(event.target.value as "asc" | "desc"); setVisible(PAGE_SIZE); }} aria-label="Order issues by release date" className="h-10 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-4 text-xs font-semibold">
            <option value="asc">Oldest first</option>
            <option value="desc">Newest first</option>
          </select>
        </div>
      </div>

      {item ? (
        <div className="pb-uiverse-card pb-aura grid gap-4 rounded-[22px] p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-5">
          <div className="relative grid size-14 place-items-center rounded-full bg-[conic-gradient(var(--accent)_var(--comic-progress),var(--border)_0)]" style={{ "--comic-progress": `${progressPercent}%` } as React.CSSProperties}>
            <div className="grid size-10 place-items-center rounded-full bg-[var(--bg-surface)] text-xs font-extrabold text-[var(--text)]">{progressPercent}%</div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <ListChecks className="size-4 text-[var(--accent)]" />
              <p className="font-display text-base font-bold text-[var(--text)]">{currentPosition > 0 ? `${currentPosition} of ${canonical.length} issues read` : "Ready when you are"}</p>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
              <div className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--accent-2))] transition-[width] duration-500" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              {currentPosition >= canonical.length
                ? "You have reached the end of this run."
                : nextIssue
                  ? `Next: ${nextIssue.issueNumber ? `Issue #${nextIssue.issueNumber}` : `position ${currentPosition + 1}`}${nextIssue.coverDate ? ` · ${nextIssue.coverDate}` : ""}`
                  : "Pick an issue below to start tracking."}
            </p>
          </div>
          {currentPosition > 0 && (
            <button type="button" onClick={() => { setOrder("asc"); setYear("all"); setVisible(Math.max(PAGE_SIZE, currentPosition + 12)); }} className="pb-uiverse-button pb-uiverse-button--glass inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold text-[var(--text-secondary)]">
              <RotateCcw className="size-3.5" /> Find my place
            </button>
          )}
        </div>
      ) : (
        <p className="pb-uiverse-card rounded-[18px] px-4 py-3.5 text-xs text-[var(--text-muted)]">{signedIn ? "Add this comic to your library to track issues in order." : "Sign in and add this comic to track individual issues."}</p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {displayed.map((issue) => {
          const position = positions.get(issue.id) ?? 0;
          const watched = position <= currentPosition;
          return (
            <article key={issue.id} className={`pb-uiverse-card group overflow-hidden rounded-[18px] border ${watched ? "border-[var(--completed)]/50" : "border-[var(--border)]"}`}>
              <div className="relative aspect-[2/3] overflow-hidden bg-[var(--bg-elevated)]">
                {issue.coverUrl ? <Image src={issue.coverUrl} alt={issue.name ?? `Issue ${issue.issueNumber ?? position}`} fill sizes="(max-width: 640px) 50vw, 220px" className="object-cover transition duration-500 group-hover:scale-[1.06]" /> : <div className="grid size-full place-items-center font-display text-3xl text-[var(--text-muted)]">#{issue.issueNumber ?? position}</div>}
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(5,6,10,.38),transparent_46%)] opacity-70 transition group-hover:opacity-100" />
                <span className="absolute left-2 top-2 rounded-full bg-black/80 px-2 py-1 text-[10px] font-bold text-white">ISSUE {issue.issueNumber ? `#${issue.issueNumber}` : position}</span>
                {watched && <span className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-[var(--completed)] text-[#04180b]"><Check className="size-4" strokeWidth={3} /></span>}
              </div>
              <div className="space-y-2 p-3">
                <div>
                  <h3 className="line-clamp-2 text-sm font-bold">{issue.name || `Issue #${issue.issueNumber ?? position}`}</h3>
                  <p className="mt-1 text-[10px] text-[var(--text-muted)]">{issue.coverDate ?? "Release date unavailable"} · Position {position}</p>
                </div>
                <div className="flex gap-2">
                  {item && <button type="button" onClick={() => void markThrough(issue)} className="pb-uiverse-button pb-uiverse-button--accent flex h-9 flex-1 items-center justify-center rounded-lg px-2 text-[10px] font-bold text-white">{watched && position === currentPosition ? "Current" : "Read through"}</button>}
                  <a href={issue.comicVineUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open issue ${issue.issueNumber ?? position} on Comic Vine`} className="pb-uiverse-button pb-uiverse-button--glass grid size-9 place-items-center rounded-lg text-[var(--text-secondary)]"><ExternalLink className="size-4" /></a>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {visible < filtered.length && <button type="button" onClick={() => setVisible((count) => count + PAGE_SIZE)} className="mx-auto flex h-11 items-center rounded-full border border-[var(--border)] bg-[var(--glass)] px-6 text-sm font-bold hover:border-[var(--accent)]">Show more issues ({filtered.length - visible} remaining)</button>}
    </section>
  );
}
