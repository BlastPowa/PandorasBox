"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { useRef } from "react";
import type { UnifiedSearchResult } from "@core/utils/search";

function itemHref(item: UnifiedSearchResult) {
  return item.type === "comic"
    ? `/comic/${item.id.replace("comicvine-", "")}`
    : `/title/${item.type}/${item.source}/${item.anilistId ?? item.tmdbId ?? item.mangadexId ?? item.id}`;
}

export function LandscapeMediaCard({ item }: { item: UnifiedSearchResult }) {
  const image = item.backdropUrl ?? item.posterUrl;
  return (
    <Link href={itemHref(item)} className="group relative aspect-[16/9] w-[250px] shrink-0 snap-start overflow-hidden rounded-[var(--radius-lg)] border border-[var(--media-border)] bg-[var(--bg-surface)] shadow-xl sm:w-[290px]">
      {image ? <Image src={image} alt={item.title} fill sizes="290px" className={`transition duration-500 group-hover:scale-105 ${item.backdropUrl ? "object-cover" : "object-cover object-top"}`} /> : <div className="grid size-full place-items-center bg-[linear-gradient(145deg,rgb(var(--accent-rgb)/0.28),var(--bg-elevated))] font-display text-4xl font-bold text-[var(--text-muted)]">{item.title.charAt(0)}</div>}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-3">
        <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-white/60"><span>{item.type}</span>{item.score !== null && <span className="inline-flex items-center gap-1 text-[var(--gold)]"><Star className="size-3 fill-current" />{item.score.toFixed(1)}</span>}</div>
        <h3 className="truncate text-sm font-bold text-white">{item.title}</h3>
      </div>
    </Link>
  );
}

export function LandscapeMediaRail({ title, items }: { title: string; items: UnifiedSearchResult[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  if (items.length === 0) return null;
  const nudge = (direction: -1 | 1) => scroller.current?.scrollBy({ left: direction * 640, behavior: "smooth" });
  return (
    <section className="relative space-y-3">
      <div className="flex items-center justify-between px-1"><h2 className="font-display text-lg font-bold">{title}</h2><div className="hidden gap-2 sm:flex"><button onClick={() => nudge(-1)} aria-label={`Scroll ${title} left`} className="glass grid size-8 place-items-center rounded-full"><ChevronLeft className="size-4" /></button><button onClick={() => nudge(1)} aria-label={`Scroll ${title} right`} className="glass grid size-8 place-items-center rounded-full"><ChevronRight className="size-4" /></button></div></div>
      <div ref={scroller} className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{items.map((item) => <LandscapeMediaCard key={`${item.source}-${item.id}`} item={item} />)}</div>
    </section>
  );
}
