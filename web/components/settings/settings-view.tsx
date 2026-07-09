"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Upload, LogOut, QrCode, ClipboardList, Sparkles, FileCode2 } from "lucide-react";
import { encodeListToQR, decodeListFromQR, validateDecodedList } from "@core/sync/qrSync";
import type { UnifiedSearchResult } from "@core/utils/search";
import { createDefaultProgress, type ReelItem, type ReelItemStatus } from "@core/storage/schema";
import { useLibrary } from "@/lib/library/use-library";
import { GlassCard } from "@/components/ui-fx/glass-card";
import { Button } from "@/components/ui-fx/button";
import { Input } from "@/components/ui-fx/input";
import { AvatarUpload } from "@/components/settings/avatar-upload";
import { UsernameEditor } from "@/components/settings/username-editor";
import { BulkImportModal } from "@/components/settings/bulk-import-modal";
import { IntegrationsSection } from "@/components/settings/integrations-section";
import { AppearanceSection } from "@/components/settings/appearance-section";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { MatchPickerModal, type AmbiguousEntry, type MatchDecision } from "@/components/settings/match-picker-modal";
import { ImportSummary, type ImportSummaryData } from "@/components/settings/import-summary";
import { parseMalXml, parseTxtList, type ParsedImportRow } from "@/lib/import/xml-parser";
import { searchCandidates, classifyCandidates } from "@/lib/import/match";

function resultToItem(r: UnifiedSearchResult, status: ReelItemStatus, progress?: number | null): Omit<ReelItem, "addedAt" | "updatedAt"> {
  const prog = createDefaultProgress();
  prog.totalEpisodes = r.totalEpisodes;
  prog.totalChapters = r.totalChapters;
  if (progress != null) {
    if (r.type === "manga" || r.type === "manhwa") prog.currentChapter = progress;
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
}: {
  username: string | null;
  country: string;
  avatarUrl: string | null;
}) {
  const { items, signedIn, add } = useLibrary();
  const [qr, setQr] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [pendingMatches, setPendingMatches] = useState<UnifiedSearchResult[]>([]);
  const [statusHints, setStatusHints] = useState<Map<string, ReelItemStatus>>(new Map());
  const [progressHints, setProgressHints] = useState<Map<string, number>>(new Map());
  const [ambiguousQueue, setAmbiguousQueue] = useState<AmbiguousEntry[]>([]);
  const [summary, setSummary] = useState<ImportSummaryData | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const xmlRef = useRef<HTMLInputElement>(null);

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
        toast.error("That file isn't a valid Pandora's Box export.");
        return;
      }
      const existing = new Set(items.map((i) => i.id));
      let n = 0;
      for (const item of parsed) {
        if (existing.has(item.id)) continue;
        const { addedAt: _a, updatedAt: _u, ...rest } = item;
        await add(rest);
        n += 1;
      }
      toast.success(`Imported ${n} new titles`);
    } catch {
      toast.error("Import failed");
    }
  }

  /** Shared engine for both pasted-text and MAL-XML imports. */
  async function runImport(rows: ParsedImportRow[]) {
    if (rows.length === 0) {
      toast.error("Nothing to import.");
      return;
    }
    setImporting(true);
    setProgress({ done: 0, total: rows.length });
    setSummary(null);

    const existing = new Set(items.map((i) => i.id));
    const matches: UnifiedSearchResult[] = [];
    const newStatusHints = new Map<string, ReelItemStatus>();
    const newProgressHints = new Map<string, number>();
    const ambiguous: AmbiguousEntry[] = [];
    const unmatched: string[] = [];
    const duplicates: string[] = [];

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const candidates = await searchCandidates(row.title);
      const outcome = classifyCandidates(row.title, candidates);
      if (outcome.kind === "unmatched") {
        unmatched.push(row.title);
      } else if (outcome.kind === "ambiguous") {
        ambiguous.push({ query: row.title, candidates: outcome.candidates });
      } else {
        const r = outcome.result;
        if (existing.has(r.id)) {
          duplicates.push(row.title);
        } else if (!matches.some((m) => m.id === r.id)) {
          matches.push(r);
          existing.add(r.id);
          if (row.status) newStatusHints.set(r.id, row.status);
          if (row.progress != null) newProgressHints.set(r.id, row.progress);
        }
      }
      setProgress({ done: i + 1, total: rows.length });
    }

    setImporting(false);
    setProgress(null);
    setStatusHints(newStatusHints);
    setProgressHints(newProgressHints);
    setSummary({ imported: [], skipped: [], unmatched, duplicates });

    if (ambiguous.length > 0) {
      setAmbiguousQueue(ambiguous);
    } else if (matches.length > 0) {
      setPendingMatches(matches);
    } else if (unmatched.length === 0 && duplicates.length === 0) {
      toast.info("Nothing new found.");
    }
  }

  async function importFromText() {
    await runImport(parseTxtList(pasteText));
  }

  async function importFromXml(file: File) {
    const text = await file.text();
    const rows = parseMalXml(text);
    if (!rows) {
      toast.error("That doesn't look like a MyAnimeList XML export.");
      return;
    }
    await runImport(rows);
  }

  function resolveAmbiguous(decision: MatchDecision) {
    const current = ambiguousQueue[0];
    if (!current) return;

    if (decision.action === "choose") {
      const r = decision.result;
      const existingIds = new Set(items.map((i) => i.id));
      if (existingIds.has(r.id)) {
        setSummary((s) => s && { ...s, duplicates: [...s.duplicates, current.query] });
      } else {
        setPendingMatches((pm) => (pm.some((m) => m.id === r.id) ? pm : [...pm, r]));
      }
    } else if (decision.action === "skip") {
      setSummary((s) => s && { ...s, skipped: [...s.skipped, current.query] });
    }
    // "ignore" drops silently, not counted anywhere

    setAmbiguousQueue((prev) => prev.slice(1));
  }

  async function confirmBulkImport(statuses: Map<string, ReelItemStatus>) {
    const toAdd = pendingMatches;
    setPendingMatches([]);
    setPasteText("");
    let added = 0;
    const importedResults: UnifiedSearchResult[] = [];
    for (const item of toAdd) {
      try {
        const status = statuses.get(item.id) ?? statusHints.get(item.id) ?? "planned";
        await add(resultToItem(item, status, progressHints.get(item.id)));
        added += 1;
        importedResults.push(item);
      } catch {
        // skip failures silently, reflected in the final counts below
      }
    }
    setSummary((s) => (s ? { ...s, imported: [...s.imported, ...importedResults] } : s));
    toast.success(`Added ${added} title${added === 1 ? "" : "s"}`);
  }

  function retryMatch(query: string, result: UnifiedSearchResult) {
    setSummary((s) => {
      if (!s) return s;
      return {
        ...s,
        unmatched: s.unmatched.filter((t) => t !== query),
        skipped: s.skipped.filter((t) => t !== query),
      };
    });
    setPendingMatches((pm) => (pm.some((m) => m.id === result.id) ? pm : [...pm, result]));
  }

  return (
    <div className="space-y-5">
      <SettingsTabs
        sections={{
          account: (
            <GlassCard macDots title="Profile">
              <div className="space-y-4 p-5">
                {signedIn && <AvatarUpload initialUrl={avatarUrl} username={username} />}
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
                      New here? Paste a list of titles from MyAnimeList, Letterboxd, iPhone Notes, a spreadsheet —
                      anywhere — one per line, or upload a MyAnimeList XML export to bring statuses and progress with
                      you. We&apos;ll find each title, flag anything ambiguous so you pick the right one, and show
                      you exactly what was imported, skipped, unmatched, or already in your library.
                    </span>
                  </div>
                  <textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder={"One Piece\nBreaking Bad\nDune: Part Two\nSolo Leveling"}
                    rows={6}
                    disabled={!signedIn || importing}
                    className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-sm outline-none focus:border-[var(--accent)] disabled:opacity-60"
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <Button onClick={importFromText} loading={importing} disabled={!signedIn}>
                      <ClipboardList className="size-4" /> Import pasted list
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

              {summary && <ImportSummary data={summary} onRetryMatch={retryMatch} />}
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
                    <span className="font-semibold text-[var(--text)]">Pandora&apos;s Box</span> — universal
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

      <MatchPickerModal entry={ambiguousQueue[0] ?? null} onResolve={resolveAmbiguous} />

      <BulkImportModal
        items={pendingMatches}
        open={pendingMatches.length > 0 && ambiguousQueue.length === 0}
        initialStatuses={statusHints}
        onCancel={() => setPendingMatches([])}
        onConfirm={(statuses) => void confirmBulkImport(statuses)}
      />
    </div>
  );
}
