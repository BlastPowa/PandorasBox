"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, ChevronRight, Filter, Loader2, RefreshCw, Search, SkipForward, Trash2, X } from "lucide-react";
import type { ReelItemStatus } from "@core/storage/schema";
import type { UnifiedSearchResult } from "@core/utils/search";
import { Button } from "@/components/ui-fx/button";
import { searchCandidates } from "@/lib/import/match";
import { isReadingType, type ImportMediaType, type ImportResolutionState, type ImportReviewRow } from "@/lib/import/types";
import { cn } from "@/lib/utils";

const STATE_FILTERS: Array<{ value: "all" | ImportResolutionState; label: string }> = [
  { value: "all", label: "All" },
  { value: "ready", label: "Ready" },
  { value: "review", label: "Needs review" },
  { value: "unmatched", label: "Unmatched" },
  { value: "existing", label: "Already in Library" },
  { value: "skipped", label: "Skipped" },
  { value: "failed", label: "Failed" },
];
const TYPES: Array<{ value: ImportMediaType; label: string }> = [
  { value: "movie", label: "Movies" }, { value: "series", label: "TV" }, { value: "anime", label: "Anime" },
  { value: "manga", label: "Manga / Manhwa" }, { value: "comic", label: "Comics" },
];

function statusOptions(type: string | null | undefined): Array<{ value: ReelItemStatus; label: string }> {
  const reading = isReadingType(type);
  return [
    { value: reading ? "reading" : "watching", label: reading ? "Reading" : "Watching" },
    { value: "completed", label: "Completed" }, { value: "on_hold", label: "On Hold" },
    { value: "planned", label: reading ? "Plan to Read" : "Plan to Watch" }, { value: "dropped", label: "Dropped" },
  ];
}

function CandidateCard({ result, onChoose }: { result: UnifiedSearchResult; onChoose: () => void }) {
  return (
    <button type="button" onClick={onChoose} className="flex min-h-24 w-full gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-left hover:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
      <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-lg bg-[var(--glass)]">
        {result.posterUrl ? <Image src={result.posterUrl} alt="" fill sizes="64px" className="object-cover" unoptimized /> : null}
      </div>
      <span className="min-w-0 py-1">
        <span className="block font-semibold text-[var(--text)]">{result.title}</span>
        <span className="mt-1 block text-xs uppercase tracking-wide text-[var(--accent)]">{result.type} · {result.year ?? "Year unknown"} · {result.source}</span>
        <span className="mt-2 line-clamp-2 block text-xs leading-relaxed text-[var(--text-muted)]">{result.synopsis || "No synopsis available."}</span>
        {(result.totalEpisodes || result.totalChapters) && <span className="mt-1 block text-xs text-[var(--text-secondary)]">{result.totalEpisodes ? `${result.totalEpisodes} episodes` : `${result.totalChapters} chapters / issues`}</span>}
      </span>
    </button>
  );
}

export function ImportReviewWorkspace({
  rows,
  matching,
  progress,
  onRowsChange,
  onRetry,
  onImport,
  onCancelMatching,
  onClose,
}: {
  rows: ImportReviewRow[];
  matching: boolean;
  progress: { done: number; total: number } | null;
  onRowsChange: (rows: ImportReviewRow[]) => void;
  onRetry: (ids: string[]) => void;
  onImport: (ids: string[]) => void;
  onCancelMatching: () => void;
  onClose: () => void;
}) {
  const [stateFilter, setStateFilter] = useState<"all" | ImportResolutionState>("all");
  const [draftState, setDraftState] = useState<"all" | ImportResolutionState>("all");
  const [typeFilter, setTypeFilter] = useState<ImportMediaType | "all">("all");
  const [draftType, setDraftType] = useState<ImportMediaType | "all">("all");
  const [yearFilter, setYearFilter] = useState("");
  const [draftYear, setDraftYear] = useState("");
  const [confidenceFilter, setConfidenceFilter] = useState<"all" | "high" | "low">("all");
  const [draftConfidence, setDraftConfidence] = useState<"all" | "high" | "low">("all");
  const [statusFilter, setStatusFilter] = useState<ReelItemStatus | "all">("all");
  const [draftStatus, setDraftStatus] = useState<ReelItemStatus | "all">("all");
  const [bulkStatus, setBulkStatus] = useState<"planned" | "progress" | "completed" | "on_hold" | "dropped">("planned");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("");
  const [candidateTypes, setCandidateTypes] = useState<ImportMediaType[]>(["movie"]);
  const [candidates, setCandidates] = useState<UnifiedSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const editing = rows.find((row) => row.id === editingId) ?? null;
  const filtered = useMemo(() => rows.filter((row) =>
    (stateFilter === "all" || row.resolutionState === stateFilter) &&
    (typeFilter === "all" || row.selected?.type === typeFilter || row.typeHint === typeFilter || (typeFilter === "manga" && row.selected?.type === "manhwa")) &&
    (!yearFilter || String(row.selected?.year ?? row.year ?? "") === yearFilter) &&
    (confidenceFilter === "all" || (confidenceFilter === "high" ? row.confidence >= 75 : row.confidence < 75)) &&
    (statusFilter === "all" || row.importStatus === statusFilter)
  ), [rows, stateFilter, typeFilter, yearFilter, confidenceFilter, statusFilter]);
  const readyIds = rows.filter((row) => row.included && row.selected && row.resolutionState === "ready").map((row) => row.id);

  function openEditor(row: ImportReviewRow) {
    setQuery(row.title);
    setYear(row.year ? String(row.year) : "");
    const hinted = row.selected?.type === "manhwa" ? "manga" : row.selected?.type;
    setCandidateTypes(hinted && TYPES.some((type) => type.value === hinted) ? [hinted as ImportMediaType] : [row.typeHint ?? "movie"]);
    setCandidates(row.candidates);
    setEditingId(row.id);
  }

  function patchRow(id: string, patch: Partial<ImportReviewRow>) {
    onRowsChange(rows.map((row) => row.id === id ? { ...row, ...patch } : row));
  }

  async function runCandidateSearch() {
    if (query.trim().length < 2) return;
    setSearching(true);
    const found = await searchCandidates(query.trim(), { types: candidateTypes, year: Number(year) || null });
    setCandidates(found);
    setSearching(false);
  }

  function chooseCandidate(result: UnifiedSearchResult) {
    if (!editing) return;
    const chosenStatus = isReadingType(result.type) && editing.importStatus === "watching"
      ? "reading"
      : !isReadingType(result.type) && editing.importStatus === "reading"
        ? "watching"
        : editing.importStatus;
    patchRow(editing.id, {
      title: query.trim() || editing.title,
      year: Number(year) || editing.year,
      selected: result,
      candidates,
      confidence: 100,
      resolutionState: "ready",
      importStatus: chosenStatus,
      included: true,
      error: null,
    });
    const next = rows.find((row) => row.id !== editing.id && (row.resolutionState === "review" || row.resolutionState === "unmatched" || row.resolutionState === "failed"));
    if (next) openEditor(next);
    else setEditingId(null);
  }

  function openNext() {
    const next = rows.find((row) => row.resolutionState === "review" || row.resolutionState === "unmatched" || row.resolutionState === "failed");
    if (next) openEditor(next);
  }

  function applyBulkStatus() {
    onRowsChange(rows.map((row) => {
      if (!row.included) return row;
      const reading = isReadingType(row.selected?.type ?? row.typeHint);
      const status: ReelItemStatus = bulkStatus === "progress" ? (reading ? "reading" : "watching") : bulkStatus;
      return { ...row, importStatus: status };
    }));
  }

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[99] bg-black/75 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-0 z-[100] flex outline-none md:items-center md:justify-center md:p-5">
      <section className="flex h-full min-w-0 w-full flex-col overflow-hidden bg-[var(--bg-base)] md:h-[min(90vh,900px)] md:max-w-6xl md:rounded-2xl md:border md:border-[var(--border-strong)]">
        <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--bg-base)] px-4 pb-3 pt-[max(1rem,var(--safe-top))] md:px-6">
          <div className="flex items-start justify-between gap-3">
            <div><Dialog.Title className="text-xl font-bold text-[var(--text)]">Review {rows.length} titles</Dialog.Title><Dialog.Description className="text-sm text-[var(--text-muted)]">Ready matches are selected. Nothing unresolved will be discarded.</Dialog.Description></div>
            <button type="button" onClick={onClose} aria-label="Close review" className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-[var(--glass)]"><X className="size-5" /></button>
          </div>
          {matching && progress && <div className="mt-3 flex items-center gap-2 text-sm text-[var(--text-secondary)]"><Loader2 className="size-4 animate-spin" /> Matching {progress.done} of {progress.total}<button type="button" onClick={onCancelMatching} className="ml-2 min-h-11 rounded-lg px-3 font-semibold text-red-300 hover:bg-red-400/10">Cancel</button></div>}
          <div className="relative mt-4">
            <div className="flex snap-x gap-2 overflow-x-auto pb-1 pr-8 [scrollbar-width:none]">
              {STATE_FILTERS.map((filter) => <button key={filter.value} type="button" onClick={() => setStateFilter(filter.value)} className={cn("min-h-11 shrink-0 snap-start rounded-full border px-4 text-sm", stateFilter === filter.value ? "border-[var(--accent)] bg-[rgb(var(--accent-rgb)/0.18)] text-[var(--text)]" : "border-[var(--border)] text-[var(--text-secondary)]")}>{filter.label} <span className="ml-1 text-xs">{filter.value === "all" ? rows.length : rows.filter((row) => row.resolutionState === filter.value).length}</span></button>)}
            </div>
            <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[var(--bg-base)]" />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button variant="glass" size="sm" onClick={() => { setDraftState(stateFilter); setDraftType(typeFilter); setDraftYear(yearFilter); setDraftConfidence(confidenceFilter); setDraftStatus(statusFilter); setFiltersOpen(true); }}><Filter className="size-4" /> Filters</Button>
            <Button variant="glass" size="sm" onClick={openNext} disabled={!rows.some((row) => ["review", "unmatched", "failed"].includes(row.resolutionState))}><SkipForward className="size-4" /> Resolve next</Button>
            <Button variant="glass" size="sm" onClick={() => onRetry(rows.filter((row) => row.resolutionState === "unmatched" || row.resolutionState === "failed").map((row) => row.id))} disabled={matching}><RefreshCw className="size-4" /> Retry unmatched</Button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 md:px-6">
          <div className="space-y-3">
            {filtered.map((row) => (
              <article key={row.id} className={cn("rounded-2xl border p-3 md:p-4", row.resolutionState === "review" || row.resolutionState === "failed" ? "border-amber-400/40 bg-amber-400/5" : "border-[var(--border)] bg-[var(--bg-surface)]")}>
                <div className="flex min-w-0 gap-3">
                  <input aria-label={`Include ${row.title}`} type="checkbox" checked={row.included} onChange={(event) => patchRow(row.id, { included: event.target.checked })} className="mt-3 size-5 shrink-0 accent-[var(--accent)]" />
                  <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-lg bg-[var(--glass)]">{row.selected?.posterUrl ? <Image src={row.selected.posterUrl} alt="" fill sizes="64px" className="object-cover" unoptimized /> : null}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-[var(--text-muted)]" title={row.originalText}>Input: {row.originalText}</p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">Cleaned: {row.title}{row.year ? ` (${row.year})` : ""}</p>
                    <h3 className="mt-1 font-semibold text-[var(--text)]">{row.selected?.title ?? "No match selected"}</h3>
                    <p className="mt-1 text-xs uppercase tracking-wide text-[var(--accent)]">{row.selected ? `${row.selected.type} · ${row.selected.year ?? "Year unknown"} · ${row.confidence}% match` : `${row.year ?? "Year unknown"} · ${row.resolutionState}`}</p>
                    {row.duplicateOf && <p className="mt-1 text-xs text-amber-300">Duplicate input — kept for review.</p>}
                    {row.error && <p className="mt-1 text-xs text-red-300">{row.error}</p>}
                    <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap">
                      <select aria-label={`Status for ${row.title}`} value={row.importStatus} onChange={(event) => patchRow(row.id, { importStatus: event.target.value as ReelItemStatus })} className="min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-3 text-sm sm:w-auto">
                        {statusOptions(row.selected?.type ?? row.typeHint).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                      <Button variant="outline" size="sm" onClick={() => openEditor(row)}>Change match <ChevronRight className="size-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => patchRow(row.id, { resolutionState: row.resolutionState === "skipped" ? (row.selected ? "ready" : "review") : "skipped", included: row.resolutionState === "skipped" })}>Skip</Button>
                      <Button variant="ghost" size="sm" aria-label={`Remove ${row.title}`} onClick={() => onRowsChange(rows.filter((entry) => entry.id !== row.id))}><Trash2 className="size-4" /> Remove</Button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
            {filtered.length === 0 && <p className="py-12 text-center text-sm text-[var(--text-muted)]">No titles match this filter.</p>}
          </div>
        </div>

        <footer className="sticky bottom-0 z-20 border-t border-[var(--border)] bg-[var(--bg-base)] px-4 pb-[max(1rem,var(--safe-bottom))] pt-3 md:px-6">
          <div className="mb-3 flex items-center gap-2 overflow-x-auto [scrollbar-width:none]"><label className="shrink-0 text-xs text-[var(--text-muted)]">Set selected to</label><select value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value as typeof bulkStatus)} className="min-h-11 shrink-0 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-3 text-sm"><option value="planned">Planned</option><option value="progress">In progress</option><option value="completed">Completed</option><option value="on_hold">On Hold</option><option value="dropped">Dropped</option></select><Button size="sm" variant="glass" onClick={applyBulkStatus}>Apply</Button></div>
          <div className="flex items-center justify-between gap-3"><span className="text-sm text-[var(--text-muted)]">{readyIds.length} ready</span><Button onClick={() => onImport(readyIds)} disabled={!readyIds.length || matching}><Check className="size-4" /> Import ready titles</Button></div>
        </footer>
      </section>

      {filtersOpen && <div className="fixed inset-0 z-[110] flex items-end bg-black/60 md:items-center md:justify-center" onMouseDown={(event) => { if (event.currentTarget === event.target) setFiltersOpen(false); }}><section role="dialog" aria-modal="true" aria-label="Import filters" className="max-h-[100dvh] w-full overflow-y-auto rounded-t-2xl border border-[var(--border)] bg-[var(--bg-base)] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:max-w-md md:rounded-2xl">
        <div className="flex items-center justify-between"><h3 className="text-lg font-bold">Filters</h3><button type="button" className="size-11" onClick={() => setFiltersOpen(false)} aria-label="Close filters"><X /></button></div>
        <label className="mt-4 block text-sm font-semibold">Result state<select value={draftState} onChange={(event) => setDraftState(event.target.value as typeof draftState)} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-3">{STATE_FILTERS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label className="mt-4 block text-sm font-semibold">Media type<select value={draftType} onChange={(event) => setDraftType(event.target.value as typeof draftType)} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-3"><option value="all">All media</option>{TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label className="mt-4 block text-sm font-semibold">Release year<input inputMode="numeric" value={draftYear} onChange={(event) => setDraftYear(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="Any year" className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-3" /></label>
        <label className="mt-4 block text-sm font-semibold">Confidence<select value={draftConfidence} onChange={(event) => setDraftConfidence(event.target.value as typeof draftConfidence)} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-3"><option value="all">Any confidence</option><option value="high">High (75%+)</option><option value="low">Needs review (under 75%)</option></select></label>
        <label className="mt-4 block text-sm font-semibold">Status<select value={draftStatus} onChange={(event) => setDraftStatus(event.target.value as typeof draftStatus)} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-3"><option value="all">Any status</option><option value="planned">Planned</option><option value="watching">Watching</option><option value="reading">Reading</option><option value="completed">Completed</option><option value="on_hold">On Hold</option><option value="dropped">Dropped</option></select></label>
        <div className="mt-6 grid grid-cols-2 gap-2"><Button variant="glass" onClick={() => { setDraftState("all"); setDraftType("all"); setDraftYear(""); setDraftConfidence("all"); setDraftStatus("all"); }}>Clear all</Button><Button onClick={() => { setStateFilter(draftState); setTypeFilter(draftType); setYearFilter(draftYear); setConfidenceFilter(draftConfidence); setStatusFilter(draftStatus); setFiltersOpen(false); }}>Apply filters</Button></div>
      </section></div>}

      {editing && <div className="fixed inset-0 z-[120] flex bg-black/70 md:items-center md:justify-center md:p-5"><section role="dialog" aria-modal="true" aria-label="Change title match" className="flex h-full w-full flex-col overflow-hidden bg-[var(--bg-base)] md:h-[min(86vh,820px)] md:max-w-3xl md:rounded-2xl md:border md:border-[var(--border)]">
        <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--bg-base)] p-4 pt-[max(1rem,env(safe-area-inset-top))] md:p-5"><div className="flex items-center justify-between"><h3 className="text-lg font-bold">Change match</h3><button type="button" className="grid size-11 place-items-center" onClick={() => setEditingId(null)} aria-label="Close candidate search"><X /></button></div>
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_7rem_auto]"><label className="relative"><span className="sr-only">Title</span><Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-[var(--text-muted)]" /><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void runCandidateSearch(); }} className="min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] pl-10 pr-3" /></label><input aria-label="Release year" inputMode="numeric" value={year} onChange={(event) => setYear(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="Year" className="min-h-11 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-3" /><Button onClick={() => void runCandidateSearch()} loading={searching}>Search</Button></div>
          <div className="mt-3 flex snap-x gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">{TYPES.map((type) => <button key={type.value} type="button" onClick={() => setCandidateTypes((current) => current.includes(type.value) ? (current.length === 1 ? current : current.filter((value) => value !== type.value)) : [...current, type.value])} className={cn("min-h-11 shrink-0 rounded-full border px-4 text-sm", candidateTypes.includes(type.value) ? "border-[var(--accent)] bg-[rgb(var(--accent-rgb)/0.18)]" : "border-[var(--border)]")}>{type.label}</button>)}</div>
        </header>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 md:p-5">{searching ? <div className="grid min-h-48 place-items-center"><Loader2 className="size-7 animate-spin" /></div> : candidates.map((candidate) => <CandidateCard key={`${candidate.source}-${candidate.type}-${candidate.id}`} result={candidate} onChoose={() => chooseCandidate(candidate)} />)}{!searching && candidates.length === 0 && <p className="py-16 text-center text-sm text-[var(--text-muted)]">No matches yet. Edit the title, year, or media filters and search again.</p>}</div>
      </section></div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
