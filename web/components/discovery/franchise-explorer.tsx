"use client";

import { useState } from "react";
import Link from "next/link";
import { Dices, Film, Layers3, Sparkles, Tv } from "lucide-react";
import type { FranchiseDef } from "@/lib/franchises";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

const VISIBLE = 8;
function shuffled(items: FranchiseDef[]) { return [...items].sort(() => Math.random() - 0.5).slice(0, VISIBLE); }

export function FranchiseExplorer({ franchises }: { franchises: FranchiseDef[] }) {
  const [visible, setVisible] = useState(franchises.slice(0, VISIBLE));
  const [cycle, setCycle] = useState(0);
  const reducedMotion = useReducedMotion();
  function shuffle() { setVisible(shuffled(franchises)); setCycle((value) => value + 1); }
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <h2 className="flex items-center gap-2 font-display text-base font-bold sm:text-lg"><Layers3 className="size-5 text-[var(--gold)]" /> Franchise Collections</h2>
        <button type="button" onClick={shuffle} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-[rgb(var(--accent-rgb)/0.4)] bg-[rgb(var(--accent-rgb)/0.12)] px-3 text-xs font-bold text-[var(--accent)] sm:px-4"><Dices className="size-4" /> Shuffle</button>
      </div>
      <div key={cycle} className={`-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4 ${reducedMotion ? "" : "pb-random-deck-reveal"}`}>
        {visible.map((franchise, index) => { const Icon = franchise.category === "Anime collection" ? Sparkles : franchise.category === "TV universe" ? Tv : franchise.category === "Film saga" ? Film : Layers3; return (
          <Link key={franchise.slug} href={`/browse/franchise/${franchise.slug}`} className="group relative min-h-44 w-[84vw] shrink-0 snap-center overflow-hidden rounded-[var(--radius-lg)] border border-[var(--media-border)] bg-[linear-gradient(145deg,rgb(var(--accent-rgb)/0.18),var(--bg-surface))] p-5 transition hover:border-[var(--accent)] sm:min-h-36 sm:w-auto">
            <span className="mb-6 grid size-11 place-items-center rounded-xl bg-[rgb(var(--accent-rgb)/0.17)] text-[var(--accent)] sm:mb-5 sm:size-10"><Icon className="size-5" /></span>
            <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">{franchise.category}</span><h3 className="mt-1 font-display text-xl font-bold sm:text-lg">{franchise.name}</h3><p className="mt-2 line-clamp-2 text-sm text-[var(--text-muted)] sm:mt-1 sm:text-xs">{franchise.description}</p><span className="absolute right-4 top-4 font-mono text-xs text-white/15">{String(index + 1).padStart(2, "0")}</span>
          </Link>
        ); })}
      </div>
    </section>
  );
}
