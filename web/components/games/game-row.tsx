"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { GameCard as GameCardData } from "@/lib/igdb";
import { GameCard } from "./game-card";

export function GameRow({ games }: { games: GameCardData[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  if (games.length === 0) return null;

  function nudge(direction: -1 | 1) {
    const element = scroller.current;
    if (element) element.scrollBy({ left: direction * element.clientWidth * 0.8, behavior: "smooth" });
  }

  return (
    <section className="space-y-3" aria-labelledby="trending-games-title">
      <div className="flex items-baseline justify-between px-1">
        <div>
          <h2 id="trending-games-title" className="font-display text-lg font-bold">Trending Games</h2>
          <p className="text-xs text-[var(--text-muted)]">Popular games from IGDB</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/gamers" className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--accent)]">View All</Link>
          <div className="hidden gap-1 sm:flex">
            <button type="button" onClick={() => nudge(-1)} aria-label="Scroll Trending Games left" className="glass grid size-7 place-items-center rounded-full text-[var(--text-secondary)] transition hover:text-[var(--accent)]"><ChevronLeft className="size-4" /></button>
            <button type="button" onClick={() => nudge(1)} aria-label="Scroll Trending Games right" className="glass grid size-7 place-items-center rounded-full text-[var(--text-secondary)] transition hover:text-[var(--accent)]"><ChevronRight className="size-4" /></button>
          </div>
        </div>
      </div>
      <div ref={scroller} className="-mx-1 overflow-x-auto px-1 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex snap-x snap-mandatory gap-3 scroll-smooth">
          {games.map((game) => <GameCard key={game.id} game={game} className="w-[var(--poster-w-sm)] shrink-0 snap-start sm:w-[var(--poster-w)]" />)}
        </div>
      </div>
    </section>
  );
}
