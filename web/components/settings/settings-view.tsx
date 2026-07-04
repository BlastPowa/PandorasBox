"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Upload, LogOut, QrCode, ClipboardList, Sparkles } from "lucide-react";
import { encodeListToQR, decodeListFromQR, validateDecodedList } from "@core/sync/qrSync";
import type { UnifiedSearchResult } from "@core/utils/search";
import { createDefaultProgress, type ReelItem, type ReelItemStatus } from "@core/storage/schema";
import { useLibrary } from "@/lib/library/use-library";
import { GlassCard } from "@/components/ui-fx/glass-card";
import { Button } from "@/components/ui-fx/button";
import { Input } from "@/components/ui-fx/input";
import { AvatarUpload } from "@/components/settings/avatar-upload";
import { BulkImportModal } from "@/components/settings/bulk-import-modal";

function resultToItem(r: UnifiedSearchResult, status: ReelItemStatus): Omit<ReelItem, "addedAt" | "updatedAt"> {
  const progress = createDefaultProgress();
  progress.totalEpisodes = r.totalEpisodes;
  progress.totalChapters = r.totalChapters;
  return {
    id: r.id,
    source: r.source,
    type: r.type,
    title: r.title,
    posterUrl: r.posterUrl,
    backdropUrl: null,
    synopsis: r.synopsis,
    status,
    progress,
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
  const [missedCount, setMissedCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

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

  // Paste-import: one title per line, matched via unified search (works from MAL, Notes, anywhere).
  // Matches are collected first, then the user picks a status for each (or all at once)
  // in a popup before anything is actually added — no need to fix statuses one by one after.
  async function importFromText() {
    const lines = Array.from(
      new Set(
        pasteText
          .split("\n")
          .map((l) => l.replace(/^\s*[-*\d.)\]]+\s*/, "").trim())
          .filter((l) => l.length >= 2)
      )
    ).slice(0, 100);
    if (lines.length === 0) {
      toast.error("Paste at least one title (one per line).");
      return;
    }
    setImporting(true);
    setProgress({ done: 0, total: lines.length });
    const existing = new Set(items.map((i) => i.id));
    const matches: UnifiedSearchResult[] = [];
    let missed = 0;
    for (let i = 0; i < lines.length; i += 1) {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(lines[i])}`);
        const json = (await res.json()) as { results: UnifiedSearchResult[] };
        const best = json.results?.[0];
        if (best && !existing.has(best.id)) {
          matches.push(best);
          existing.add(best.id);
        } else if (!best) {
          missed += 1;
        }
      } catch {
        missed += 1;
      }
      setProgress({ done: i + 1, total: lines.length });
    }
    setImporting(false);
    setProgress(null);
    setMissedCount(missed);
    if (matches.length === 0) {
      toast.error(missed > 0 ? `No matches found for ${missed} title(s).` : "Nothing new to import.");
      return;
    }
    setPendingMatches(matches);
  }

  async function confirmBulkImport(statuses: Map<string, ReelItemStatus>) {
    const toAdd = pendingMatches;
    setPendingMatches([]);
    setPasteText("");
    let added = 0;
    for (const item of toAdd) {
      try {
        await add(resultToItem(item, statuses.get(item.id) ?? "planned"));
        added += 1;
      } catch {
        // skip failures silently, report the count below
      }
    }
    toast.success(`Added ${added} title${added === 1 ? "" : "s"}${missedCount > 0 ? ` · ${missedCount} not found` : ""}`);
  }

  return (
    <div className="space-y-5">
      <GlassCard macDots title="Profile">
        <div className="space-y-4 p-5">
          {signedIn && <AvatarUpload initialUrl={avatarUrl} username={username} />}
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-[var(--text-secondary)]">Username</span>
            <Input defaultValue={username ?? ""} disabled />
          </label>
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

      {/* Onboarding / quick import */}
      <GlassCard macDots title="Bring your list with you">
        <div className="space-y-4 p-5">
          <div className="flex items-start gap-2 rounded-[var(--radius-md)] bg-[rgba(168,85,247,0.1)] p-3 text-xs leading-relaxed text-[var(--text-secondary)]">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" />
            <span>
              New here? Paste a list of titles from MyAnimeList, Letterboxd, iPhone Notes, a spreadsheet — anywhere —
              one per line. We&apos;ll find each one, then let you set the status for every match (or all at once)
              before anything&apos;s added — no need to fix them one by one after. Or use a Pandora&apos;s Box
              JSON/code export below.
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
          <div className="flex items-center gap-3">
            <Button onClick={importFromText} loading={importing} disabled={!signedIn}>
              <ClipboardList className="size-4" /> Import pasted list
            </Button>
            {progress && (
              <span className="font-mono text-xs text-[var(--text-muted)]">
                {progress.done}/{progress.total}…
              </span>
            )}
          </div>
        </div>
      </GlassCard>

      <GlassCard macDots title="Backup &amp; transfer">
        <div className="space-y-4 p-5">
          {!signedIn && <p className="text-sm text-[var(--text-muted)]">Sign in to export or import your library.</p>}
          <div className="flex flex-wrap gap-2">
            <Button variant="glass" onClick={exportJson} disabled={!signedIn}><Download className="size-4" /> Export JSON</Button>
            <Button variant="glass" onClick={() => fileRef.current?.click()} disabled={!signedIn}><Upload className="size-4" /> Import JSON</Button>
            <Button variant="glass" onClick={showQr} disabled={!signedIn}><QrCode className="size-4" /> Share code</Button>
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
          <p><span className="font-semibold text-[var(--text)]">Pandora&apos;s Box</span> — universal entertainment tracker.</p>
          <p className="text-xs text-[var(--text-muted)]">
            Data &amp; artwork from TMDB, AniList and MangaDex. This app links out to external sites; it does not host content.
          </p>
        </div>
      </GlassCard>

      <BulkImportModal
        items={pendingMatches}
        open={pendingMatches.length > 0}
        onCancel={() => setPendingMatches([])}
        onConfirm={(statuses) => void confirmBulkImport(statuses)}
      />
    </div>
  );
}
