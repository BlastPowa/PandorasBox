"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Upload, LogOut, QrCode, ClipboardList, Sparkles, FileCode2, Plus, RotateCcw, Trash2 } from "lucide-react";
import { encodeListToQR, decodeListFromQR, validateDecodedList } from "@core/sync/qrSync";
import type { UnifiedSearchResult } from "@core/utils/search";
import { createDefaultProgress, type ReelItem, type ReelItemStatus } from "@core/storage/schema";
import { useLibrary } from "@/lib/library/use-library";
import { GlassCard } from "@/components/ui-fx/glass-card";
import { Button } from "@/components/ui-fx/button";
import { Input } from "@/components/ui-fx/input";
import { AvatarUpload } from "@/components/settings/avatar-upload";
import { ProfileBannerUpload } from "@/components/settings/profile-banner-upload";
import { ProfileBackgroundUpload, type ProfileBackgroundPosition } from "@/components/settings/profile-background-upload";
import { UsernameEditor } from "@/components/settings/username-editor";
import { ImportReviewWorkspace } from "@/components/settings/import-review-workspace";
import { IntegrationsSection } from "@/components/settings/integrations-section";
import { AppearanceSection } from "@/components/settings/appearance-section";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { InstallPBoxControl } from "@/components/pwa/install-manager";
import { parseMalXml, parseTxtList, type ParsedImportRow } from "@/lib/import/xml-parser";
import { IMPORT_MEDIA_TYPES, type ImportMediaType, type ImportReviewRow } from "@/lib/import/types";
import { normalizeTitle } from "@/lib/import/match";

type ImportDraft = { pasteText: string; scope: ImportMediaType[]; preparedRows: ParsedImportRow[]; reviewRows: ImportReviewRow[] };

function saveImportDraft(draft: ImportDraft) {
  try {
    const compact = { ...draft, reviewRows: draft.reviewRows.map((row) => ({ ...row, candidates: [] })) };
    sessionStorage.setItem("pbox-import-review-v1", JSON.stringify(compact));
  } catch {
    // Private browsing and storage quotas can disable sessionStorage; importing still works in memory.
  }
}

function markDuplicateRows(rows: ParsedImportRow[]): ParsedImportRow[] {
  const seen = new Map<string, string>();
  return rows.map((row) => {
    const key = `${normalizeTitle(row.title)}|${row.year ?? ""}|${row.typeHint ?? ""}`;
    const duplicateOf = seen.get(key) ?? null;
    if (!duplicateOf && row.title.trim()) seen.set(key, row.id);
    return { ...row, duplicateOf };
  });
}

function resultToItem(r: UnifiedSearchResult, status: ReelItemStatus, progress?: number | null): Omit<ReelItem, "addedAt" | "updatedAt"> {
  const prog = createDefaultProgress();
  prog.totalEpisodes = r.totalEpisodes;
  prog.totalChapters = r.totalChapters;
  if (progress != null) {
    if (r.type === "manga" || r.type === "manhwa" || r.type === "comic") prog.currentChapter = progress;
    else prog.currentEpisode = progress;
  }
  return {
    id: r.id,
    source: r.source,
    type: r.type,
    title: r.title,
    posterUrl: r.posterUrl,
    backdropUrl: null,
    synopsis: r.synopsis,
    status,
    progress: prog,
    rating: null,
    genres: [],
    totalEpisodes: r.totalEpisodes,
    totalChapters: r.totalChapters,
    totalSeasons: null,
    year: r.year,
    anilistId: r.anilistId,
    tmdbId: r.tmdbId,
    mangadexId: r.mangadexId,
    malId: r.malId,
    completedAt: null,
    lastWatchedSite: null,
  };
}

export function SettingsView({
  username,
  country,
  avatarUrl,
  bannerUrl,
  profileBackgroundUrl,
  profileBackgroundPosition,
}: {
  username: string | null;
  country: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  profileBackgroundUrl: string | null;
  profileBackgroundPosition: ProfileBackgroundPosition;
}) {
  const { items, signedIn, add } = useLibrary();
  const [qr, setQr] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [preparedRows, setPreparedRows] = useState<ParsedImportRow[]>([]);
  const [reviewRows, setReviewRows] = useState<ImportReviewRow[]>([]);
  const [scope, setScope] = useState<ImportMediaType[]>(["movie"]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [savedDraft, setSavedDraft] = useState<ImportDraft | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = sessionStorage.getItem("pbox-import-review-v1");
      return stored ? JSON.parse(stored) as ImportDraft : null;
    } catch {
      sessionStorage.removeItem("pbox-import-review-v1");
      return null;
    }
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const xmlRef = useRef<HTMLInputElement>(null);
  const matchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!preparedRows.length && !reviewRows.length) return;
    const timer = window.setTimeout(() => saveImportDraft({ pasteText, scope, preparedRows, reviewRows }), 200);
    return () => window.clearTimeout(timer);
  }, [pasteText, scope, preparedRows, reviewRows]);

  function exportJson() {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pandoras-box-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${items.length} titles`);
  }

  function showQr() {
    try {
      setQr(encodeListToQR(items));
    } catch {
      toast.error("Could not generate export code");
    }
  }

  async function importFrom(text: string, kind: "json" | "code") {
    try {
      const parsed = kind === "json" ? (JSON.parse(text) as unknown) : decodeListFromQR(text);
      if (!validateDecodedList(parsed)) {
        toast.error("That file isn't a valid PBox export.");
        return;
      }
      const existing = new Set(items.map((i) => i.id));
      let n = 0;
      for (const item of parsed) {
        if (existing.has(item.id)) continue;
        const { addedAt: _a, updatedAt: _u, ...rest } = item;
        void _a;
        void _u;
        await add(rest);
        n += 1;
      }
      toast.success(`Imported ${n} new titles`);
    } catch {
      toast.error("Import failed");
    }
  }

  async function runImport(rows: ParsedImportRow[], requestedTypes = scope) {
    rows = markDuplicateRows(rows);
    setPreparedRows(rows);
    if (rows.length === 0) {
      toast.error("Nothing to import.");
      return;
    }
    if (rows.some((row) => row.title.trim().length < 2)) {
      setParseError("Every row needs a title with at least two characters.");
      return;
    }
    if (rows.some((row) => row.year !== null && (row.year < 1888 || row.year > 2099))) {
      setParseError("Release years must be between 1888 and 2099, or left blank.");
      return;
    }
    setParseError(null);
    if (rows.length > 500) {
      setParseError(`This list contains ${rows.length} entries. PBox supports up to 500 at once; your text has not been cleared.`);
      return;
    }
    setImporting(true);
    matchAbortRef.current?.abort();
    const controller = new AbortController();
    matchAbortRef.current = controller;
    setProgress({ done: 0, total: rows.length });
    const initial: ImportReviewRow[] = rows.map((row) => ({
      ...row, candidates: [], selected: null, confidence: 0, resolutionState: "matching",
      importStatus: row.status ?? "planned", included: !row.duplicateOf, error: null,
    }));
    setReviewRows(initial);
    const working = [...initial];
    const existing = new Set(items.map((item) => item.id));

    for (let start = 0; start < rows.length; start += 20) {
      const batch = rows.slice(start, start + 20);
      try {
        const response = await fetch("/api/import/match", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: batch.map(({ id, title, year }) => ({ id, title, year })), types: requestedTypes }),
          signal: controller.signal,
        });
        const payload = (await response.json().catch(() => null)) as { error?: string; matches?: Array<{ id: string; candidates: UnifiedSearchResult[]; selectedId: string | null; confidence: number; state: "ready" | "review" | "unmatched" | "failed"; error: string | null }> } | null;
        if (!response.ok || !payload?.matches) throw new Error(payload?.error ?? "Matching failed");
        for (const match of payload.matches) {
          const index = working.findIndex((row) => row.id === match.id);
          if (index < 0) continue;
          const selected = match.candidates.find((candidate) => candidate.id === match.selectedId) ?? match.candidates[0] ?? null;
          working[index] = {
            ...working[index]!, candidates: match.candidates, selected, confidence: match.confidence,
            resolutionState: selected && existing.has(selected.id) ? "existing" : match.state,
            importStatus: working[index]!.status ?? "planned",
            included: match.state === "ready" && !(selected && existing.has(selected.id)) && !working[index]!.duplicateOf,
            error: match.error,
          };
        }
      } catch (error) {
        const cancelled = controller.signal.aborted;
        const message = cancelled ? "Matching cancelled. Retry when ready." : error instanceof Error ? error.message : "Matching failed. Retry these titles.";
        for (const row of batch) {
          const index = working.findIndex((entry) => entry.id === row.id);
          if (index >= 0) working[index] = { ...working[index]!, resolutionState: "failed", error: message, included: false };
        }
      }
      setProgress({ done: Math.min(start + batch.length, rows.length), total: rows.length });
      setReviewRows([...working]);
      if (controller.signal.aborted) break;
    }
    if (controller.signal.aborted) {
      const cancelled = working.map((row) => row.resolutionState === "matching" ? { ...row, resolutionState: "failed" as const, included: false, error: "Matching cancelled. Retry when ready." } : row);
      setReviewRows(cancelled);
    }
    setImporting(false);
    setProgress(null);
    if (matchAbortRef.current === controller) matchAbortRef.current = null;
  }

  async function retryReviewMatches(ids: string[]) {
    const retryRows = reviewRows.filter((row) => ids.includes(row.id));
    if (!retryRows.length) return;
    setImporting(true);
    matchAbortRef.current?.abort();
    const controller = new AbortController();
    matchAbortRef.current = controller;
    setProgress({ done: 0, total: retryRows.length });
    const existing = new Set(items.map((item) => item.id));
    let updated = [...reviewRows];
    for (let start = 0; start < retryRows.length; start += 20) {
      const batch = retryRows.slice(start, start + 20);
      try {
        const response = await fetch("/api/import/match", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: batch.map(({ id, title, year }) => ({ id, title, year })), types: scope }),
          signal: controller.signal,
        });
        const payload = (await response.json().catch(() => null)) as { error?: string; matches?: Array<{ id: string; candidates: UnifiedSearchResult[]; selectedId: string | null; confidence: number; state: "ready" | "review" | "unmatched" | "failed"; error: string | null }> } | null;
        if (!response.ok || !payload?.matches) throw new Error(payload?.error ?? "Matching failed");
        updated = updated.map((row) => {
          const match = payload.matches!.find((entry) => entry.id === row.id);
          if (!match) return row;
          const selected = match.candidates.find((candidate) => candidate.id === match.selectedId) ?? match.candidates[0] ?? null;
          const isExisting = selected ? existing.has(selected.id) : false;
          return { ...row, candidates: match.candidates, selected, confidence: match.confidence, resolutionState: isExisting ? "existing" : match.state, included: match.state === "ready" && !isExisting && !row.duplicateOf, error: match.error };
        });
      } catch (error) {
        const message = controller.signal.aborted ? "Matching cancelled. Retry when ready." : error instanceof Error ? error.message : "Matching failed. Retry these titles.";
        updated = updated.map((row) => batch.some((entry) => entry.id === row.id) ? { ...row, resolutionState: "failed", included: false, error: message } : row);
      }
      setReviewRows([...updated]);
      setProgress({ done: Math.min(start + batch.length, retryRows.length), total: retryRows.length });
      if (controller.signal.aborted) break;
    }
    setImporting(false);
    setProgress(null);
    if (matchAbortRef.current === controller) matchAbortRef.current = null;
  }

  function prepareText() {
    const rows = parseTxtList(pasteText, scope.length === 1 ? scope[0]! : null);
    if (!rows.length) { setParseError("Add at least one title before preparing the list."); return; }
    if (rows.length > 500) { setParseError(`This list contains ${rows.length} entries. The maximum is 500; your original text is still here.`); return; }
    setParseError(null);
    setPreparedRows(rows);
  }

  async function importFromXml(file: File) {
    const text = await file.text();
    const rows = parseMalXml(text);
    if (!rows) {
      toast.error("That doesn't look like a MyAnimeList XML export.");
      return;
    }
    setPreparedRows(rows);
    const inferred = Array.from(new Set(rows.map((row) => row.typeHint).filter(Boolean))) as ImportMediaType[];
    setScope(inferred.length ? inferred : ["anime", "manga"]);
    await runImport(rows, inferred.length ? inferred : ["anime", "manga"]);
  }

  async function confirmReviewImport(ids: string[]) {
    const requested = new Set(ids);
    const latestExisting = new Set(items.map((item) => item.id));
    let added = 0;
    const nextRows = [...reviewRows];
    for (let index = 0; index < nextRows.length; index += 1) {
      const row = nextRows[index]!;
      if (!requested.has(row.id) || !row.selected) continue;
      if (latestExisting.has(row.selected.id)) {
        nextRows[index] = { ...row, resolutionState: "existing", included: false, error: "Already in your Library." };
        continue;
      }
      try {
        await add(resultToItem(row.selected, row.importStatus, row.progress));
        latestExisting.add(row.selected.id);
        added += 1;
      } catch {
        nextRows[index] = { ...row, resolutionState: "failed", included: false, error: "Could not add this title. Retry when ready." };
      }
    }
    const remaining = nextRows.filter((row) => !requested.has(row.id) || row.resolutionState === "failed" || row.resolutionState === "existing");
    setReviewRows(remaining);
    if (!remaining.length) {
      setPreparedRows([]); setPasteText(""); sessionStorage.removeItem("pbox-import-review-v1");
    }
    if (added) toast.success(`Added ${added} title${added === 1 ? "" : "s"}`);
  }

  return (
    <div className="space-y-5">
      <SettingsTabs
        sections={{
          account: (
            <GlassCard macDots title="Profile">
              <div className="space-y-4 p-5">
                {signedIn && <AvatarUpload initialUrl={avatarUrl} username={username} />}
                {signedIn && <ProfileBannerUpload initialUrl={bannerUrl} />}
                {signedIn && <ProfileBackgroundUpload initialUrl={profileBackgroundUrl} initialPosition={profileBackgroundPosition} />}
                {signedIn ? (
                  <UsernameEditor initialUsername={username} />
                ) : (
                  <label className="block text-sm">
                    <span className="mb-1 block font-semibold text-[var(--text-secondary)]">Username</span>
                    <Input defaultValue={username ?? ""} disabled />
                  </label>
                )}
                <p className="text-xs text-[var(--text-muted)]">
                  Country ({country}) affects where-to-watch results. Manage sign-in providers with your account.
                </p>
                <InstallPBoxControl />
                {signedIn && (
                  <form action="/auth/signout" method="post">
                    <Button variant="danger" type="submit" className="w-full sm:w-auto">
                      <LogOut className="size-4" /> Sign out
                    </Button>
                  </form>
                )}
              </div>
            </GlassCard>
          ),
          appearance: <AppearanceSection />,
          integrations: <IntegrationsSection signedIn={signedIn} />,
          import: (
            <>
              <GlassCard macDots title="Bring your list with you">
                <div className="space-y-4 p-5">
                  <div className="flex items-start gap-2 rounded-[var(--radius-md)] bg-[rgb(var(--accent-rgb)/0.1)] p-3 text-xs leading-relaxed text-[var(--text-secondary)]">
                    <Sparkles className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" />
                    <span>
                      Paste up to 500 titles from Notes, Letterboxd, or a spreadsheet. Numbered lists can use one title
                      per line or multiple titles on one line. PBox cleans the list locally, then lets you edit every
                      row and review ambiguous, unmatched, duplicate, skipped, or failed results before importing.
                    </span>
                  </div>
                  {savedDraft && !reviewRows.length && !preparedRows.length && (
                    <div className="flex flex-col gap-3 rounded-xl border border-[var(--accent)] bg-[rgb(var(--accent-rgb)/0.08)] p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div><p className="font-semibold">Resume your unfinished import?</p><p className="text-xs text-[var(--text-muted)]">Reviewed and unresolved rows are saved for this browser tab.</p></div>
                      <div className="flex gap-2"><Button size="sm" onClick={() => { setPasteText(savedDraft.pasteText); setScope(savedDraft.scope); setPreparedRows(savedDraft.preparedRows); setReviewRows(savedDraft.reviewRows); setSavedDraft(null); }}>Resume</Button><Button size="sm" variant="ghost" onClick={() => { sessionStorage.removeItem("pbox-import-review-v1"); setSavedDraft(null); }}>Discard</Button></div>
                    </div>
                  )}
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Match as</p>
                    <div className="flex snap-x gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
                      {[...IMPORT_MEDIA_TYPES, "all" as const].map((type) => {
                        const active = type === "all" ? scope.length === IMPORT_MEDIA_TYPES.length : scope.length === 1 && scope[0] === type;
                        const labels: Record<string, string> = { movie: "Movies", series: "TV", anime: "Anime", manga: "Manga / Manhwa", comic: "Comics", all: "Auto / All" };
                        return <button key={type} type="button" onClick={() => { setPreparedRows([]); setScope(type === "all" ? [...IMPORT_MEDIA_TYPES] : [type]); }} className={`min-h-11 shrink-0 snap-start rounded-full border px-4 text-sm ${active ? "border-[var(--accent)] bg-[rgb(var(--accent-rgb)/0.16)] text-[var(--text)]" : "border-[var(--border)] text-[var(--text-secondary)]"}`}>{labels[type]}</button>;
                      })}
                    </div>
                  </div>
                  <textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder={"1. Grown Ups (2010)\n2. Death on the Nile (2022)\n3. Divergent (2014)\n4. Morbius (2022)"}
                    rows={6}
                    disabled={!signedIn || importing}
                    className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-sm outline-none focus:border-[var(--accent)] disabled:opacity-60"
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <Button onClick={prepareText} loading={importing} disabled={!signedIn || !pasteText.trim()}>
                      <ClipboardList className="size-4" /> Prepare pasted list
                    </Button>
                    <Button variant="glass" onClick={() => xmlRef.current?.click()} disabled={!signedIn || importing}>
                      <FileCode2 className="size-4" /> Import MAL XML export
                    </Button>
                    <input
                      ref={xmlRef}
                      type="file"
                      accept=".xml,text/xml,application/xml"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) await importFromXml(file);
                        e.target.value = "";
                      }}
                    />
                    {progress && (
                      <span className="font-mono text-xs text-[var(--text-muted)]">
                        {progress.done}/{progress.total}…
                      </span>
                    )}
                  </div>
                </div>
              </GlassCard>

              {parseError && <p role="alert" className="rounded-xl border border-red-400/35 bg-red-400/10 p-3 text-sm text-red-200">{parseError}</p>}
              {preparedRows.length > 0 && reviewRows.length === 0 && (
                <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)]">
                  <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div><h3 className="font-bold">Cleaned preview · {preparedRows.length} titles</h3><p className="text-xs text-[var(--text-muted)]">Correct titles and years before matching. Duplicate rows stay visible.</p></div>
                    <div className="flex gap-2"><Button size="sm" variant="glass" onClick={() => setPreparedRows(parseTxtList(pasteText, scope.length === 1 ? scope[0]! : null))}><RotateCcw className="size-4" /> Reset</Button><Button size="sm" onClick={() => void runImport(preparedRows)} loading={importing}>Find matches</Button></div>
                  </div>
                  <div className="max-h-[32rem] space-y-2 overflow-y-auto p-3">
                    {preparedRows.map((row, index) => (
                      <div key={row.id} className="grid grid-cols-[2rem_minmax(0,1fr)_5.5rem_2.75rem] items-start gap-2 rounded-xl border border-[var(--border)] p-2">
                        <span className="pt-3 text-center font-mono text-xs text-[var(--text-muted)]">{index + 1}</span>
                        <label className="min-w-0"><span className="sr-only">Title {index + 1}</span><input value={row.title} onChange={(event) => setPreparedRows((current) => markDuplicateRows(current.map((entry) => entry.id === row.id ? { ...entry, title: event.target.value } : entry)))} className="min-h-11 min-w-0 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-base)] px-3 text-sm" />{row.duplicateOf && <span className="mt-1 block text-[11px] text-amber-300">Duplicate row</span>}</label>
                        <label className="min-w-0"><span className="sr-only">Year {index + 1}</span><input inputMode="numeric" value={row.year ?? ""} placeholder="Year" onChange={(event) => setPreparedRows((current) => markDuplicateRows(current.map((entry) => entry.id === row.id ? { ...entry, year: Number(event.target.value) || null } : entry)))} className="min-h-11 min-w-0 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-base)] px-2 text-sm" /></label>
                        <button type="button" className="grid size-11 place-items-center rounded-lg hover:bg-[var(--glass)]" aria-label={`Remove ${row.title}`} onClick={() => setPreparedRows((current) => current.filter((entry) => entry.id !== row.id))}><Trash2 className="size-4" /></button>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between border-t border-[var(--border)] p-3"><Button size="sm" variant="ghost" onClick={() => setPreparedRows((current) => [...current, { id: `manual-${Date.now()}`, originalText: "New title", title: "", year: null, typeHint: scope.length === 1 ? scope[0]! : null, status: null, progress: null, duplicateOf: null }])}><Plus className="size-4" /> Add row</Button><span className="self-center text-xs text-[var(--text-muted)]">{preparedRows.filter((row) => row.duplicateOf).length} duplicates flagged</span></div>
                </section>
              )}
            </>
          ),
          backup: (
            <>
              <GlassCard macDots title="Backup &amp; transfer">
                <div className="space-y-4 p-5">
                  {!signedIn && (
                    <p className="text-sm text-[var(--text-muted)]">Sign in to export or import your library.</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button variant="glass" onClick={exportJson} disabled={!signedIn}>
                      <Download className="size-4" /> Export JSON
                    </Button>
                    <Button variant="glass" onClick={() => fileRef.current?.click()} disabled={!signedIn}>
                      <Upload className="size-4" /> Import JSON
                    </Button>
                    <Button variant="glass" onClick={showQr} disabled={!signedIn}>
                      <QrCode className="size-4" /> Share code
                    </Button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="application/json"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) await importFrom(await file.text(), "json");
                        e.target.value = "";
                      }}
                    />
                  </div>
                  {qr && (
                    <div className="space-y-2">
                      <p className="text-xs text-[var(--text-muted)]">
                        Copy this portable code to move your library to another device or share it:
                      </p>
                      <textarea
                        readOnly
                        value={qr}
                        onFocus={(e) => e.target.select()}
                        className="h-24 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] p-3 font-mono text-[10px] text-[var(--text-secondary)]"
                      />
                      <Input
                        placeholder="Paste a code here to import..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void importFrom((e.target as HTMLInputElement).value, "code");
                        }}
                      />
                    </div>
                  )}
                </div>
              </GlassCard>

              <GlassCard macDots title="About">
                <div className="space-y-1 p-5 text-sm text-[var(--text-secondary)]">
                  <p>
                    <span className="font-semibold text-[var(--text)]">PBox</span> — universal
                    entertainment tracker.
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Data &amp; artwork from TMDB, AniList and MangaDex. This app links out to external sites; it does
                    not host content.
                  </p>
                </div>
              </GlassCard>
            </>
          ),
        }}
      />

      {reviewRows.length > 0 && (
        <ImportReviewWorkspace
          rows={reviewRows}
          matching={importing}
          progress={progress}
          onRowsChange={setReviewRows}
          onRetry={(ids) => void retryReviewMatches(ids)}
          onImport={(ids) => void confirmReviewImport(ids)}
          onCancelMatching={() => matchAbortRef.current?.abort()}
          onClose={() => {
            setSavedDraft({ pasteText, scope, preparedRows, reviewRows });
            saveImportDraft({ pasteText, scope, preparedRows, reviewRows });
            setReviewRows([]);
          }}
        />
      )}
    </div>
  );
}
