"use client";

import { useState } from "react";
import Image from "next/image";
import * as Dialog from "@radix-ui/react-dialog";
import { Search, SkipForward, Ban, Check } from "lucide-react";
import type { UnifiedSearchResult } from "@core/utils/search";
import { searchCandidates } from "@/lib/import/match";
import { Button } from "@/components/ui-fx/button";
import { Input } from "@/components/ui-fx/input";
import { TypeBadge } from "@/components/ui-fx/badge";

export interface AmbiguousEntry {
  query: string;
  candidates: UnifiedSearchResult[];
}

export type MatchDecision =
  | { action: "choose"; result: UnifiedSearchResult }
  | { action: "skip" }
  | { action: "ignore" };

/** Resolves one ambiguous title at a time (a queue), never auto-guessing. */
export function MatchPickerModal({
  entry,
  onResolve,
}: {
  entry: AmbiguousEntry | null;
  onResolve: (decision: MatchDecision) => void;
}) {
  const [manualQuery, setManualQuery] = useState("");
  const [manualResults, setManualResults] = useState<UnifiedSearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);

  async function manualSearch() {
    if (!manualQuery.trim()) return;
    setSearching(true);
    try {
      setManualResults(await searchCandidates(manualQuery.trim()));
    } finally {
      setSearching(false);
    }
  }

  function reset() {
    setManualQuery("");
    setManualResults(null);
  }

  const list = manualResults ?? entry?.candidates ?? [];

  return (
    <Dialog.Root open={Boolean(entry)} onOpenChange={(o) => !o && onResolve({ action: "skip" })}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] shadow-2xl">
          <div className="border-b border-[var(--border)] p-4">
            <Dialog.Title className="font-display text-lg font-bold">Multiple matches for &ldquo;{entry?.query}&rdquo;</Dialog.Title>
            <Dialog.Description className="text-xs text-[var(--text-muted)]">
              Pick the right one, search manually, skip for later, or ignore this title.
            </Dialog.Description>
          </div>

          <div className="flex items-center gap-2 border-b border-[var(--border)] p-3">
            <Input
              placeholder="Search manually…"
              value={manualQuery}
              onChange={(e) => setManualQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void manualSearch()}
            />
            <Button variant="glass" size="sm" onClick={() => void manualSearch()} loading={searching}>
              <Search className="size-4" />
            </Button>
          </div>

          <div className="max-h-[45vh] space-y-2 overflow-y-auto p-4">
            {list.length === 0 && (
              <p className="py-6 text-center text-sm text-[var(--text-muted)]">No results.</p>
            )}
            {list.map((c) => (
              <button
                key={c.id}
                onClick={() => { onResolve({ action: "choose", result: c }); reset(); }}
                className="glass flex w-full items-center gap-3 rounded-[var(--radius-md)] p-2 text-left hover:border-[var(--accent)]"
              >
                <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-[6px] bg-[var(--bg-surface)]">
                  {c.posterUrl && <Image src={c.posterUrl} alt="" fill sizes="44px" className="object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{c.title}</p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <TypeBadge type={c.type} />
                    {c.year && <span className="text-xs text-[var(--text-muted)]">{c.year}</span>}
                    {(c.totalEpisodes ?? c.totalChapters) != null && (
                      <span className="text-xs text-[var(--text-muted)]">
                        {c.totalEpisodes ?? c.totalChapters} {c.totalEpisodes != null ? "ep" : "ch"}
                      </span>
                    )}
                  </div>
                  {c.synopsis && <p className="mt-1 line-clamp-2 text-xs text-[var(--text-secondary)]">{c.synopsis}</p>}
                </div>
                <Check className="size-4 shrink-0 text-[var(--text-muted)]" />
              </button>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] p-4">
            <Button variant="glass" onClick={() => { onResolve({ action: "ignore" }); reset(); }}>
              <Ban className="size-4" /> Ignore
            </Button>
            <Button variant="glass" onClick={() => { onResolve({ action: "skip" }); reset(); }}>
              <SkipForward className="size-4" /> Skip for now
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
