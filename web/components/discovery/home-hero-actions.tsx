"use client";

import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, Clapperboard, X } from "lucide-react";
import { useState } from "react";
import type { UnifiedSearchResult } from "@core/utils/search";
import { AddToLibrary, type LibrarySeed } from "@/components/library/add-to-library";

export function HomeHeroActions({ item, href }: { item: UnifiedSearchResult; href: string }) {
  const [open, setOpen] = useState(false);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [trailerAvailable, setTrailerAvailable] = useState(true);
  const [loading, setLoading] = useState(false);
  const referenceId = String(item.anilistId ?? item.tmdbId ?? item.mangadexId ?? item.id);
  const seed: LibrarySeed = { id: item.id, source: item.source, type: item.type, title: item.title, posterUrl: item.posterUrl, backdropUrl: item.backdropUrl ?? null, synopsis: item.synopsis, genres: [], year: item.year, totalEpisodes: item.totalEpisodes, totalChapters: item.totalChapters, totalSeasons: null, anilistId: item.anilistId, tmdbId: item.tmdbId, mangadexId: item.mangadexId, malId: item.malId };

  async function openTrailer() {
    setOpen(true);
    if (trailerKey || loading) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/trailer?type=${item.type}&source=${item.source}&id=${encodeURIComponent(referenceId)}`);
      const data = (await response.json()) as { key: string | null };
      setTrailerKey(data.key);
      setTrailerAvailable(Boolean(data.key));
    } catch { setTrailerAvailable(false); }
    finally { setLoading(false); }
  }

  return (
    <div className="mt-1 flex flex-wrap items-center gap-3">
      <Link href={href} className="inline-flex h-12 items-center gap-2 rounded-full bg-[linear-gradient(120deg,var(--accent),var(--accent-2))] px-5 text-xs font-bold uppercase tracking-wide text-[#0a0a0f] transition hover:brightness-110 sm:px-7 sm:text-sm">View details <ArrowRight className="size-4" /></Link>
      <Dialog.Root open={open} onOpenChange={setOpen}><Dialog.Trigger asChild><button onClick={() => void openTrailer()} className="glass inline-flex h-12 items-center gap-2 rounded-full px-5 text-sm font-semibold"><Clapperboard className="size-4 text-[var(--accent)]" /><span className="hidden sm:inline">Trailer</span></button></Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" /><Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-3 shadow-2xl"><div className="mb-2 flex items-center justify-between"><Dialog.Title className="truncate font-display font-bold">{item.title} — Trailer</Dialog.Title><Dialog.Close className="grid size-9 place-items-center rounded-full hover:bg-[var(--glass)]"><X className="size-4" /></Dialog.Close></div><div className="grid aspect-video place-items-center overflow-hidden rounded-[var(--radius-md)] bg-black">{loading ? <span className="text-sm text-white/55">Finding trailer…</span> : trailerKey ? <iframe src={`https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&rel=0`} title={`${item.title} trailer`} allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowFullScreen className="size-full" /> : !trailerAvailable ? <span className="text-sm text-white/55">No trailer is available for this title.</span> : null}</div></Dialog.Content></Dialog.Portal></Dialog.Root>
      <div className="[&_a]:h-12 [&_a]:rounded-full [&_button]:h-12 [&_button]:rounded-full"><AddToLibrary seed={seed} compact /></div>
    </div>
  );
}
