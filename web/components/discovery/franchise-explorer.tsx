"use client";

import { useState } from "react";
import Link from "next/link";
import { Dices, Film, Layers3, Tv } from "lucide-react";
import type { FranchiseDef } from "@/lib/franchises";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

const VISIBLE = 8;
function shuffled(items: FranchiseDef[]) { return [...items].sort(() => Math.random() - 0.5).slice(0, VISIBLE); }

export function FranchiseExplorer({ franchises }: { franchises: FranchiseDef[] }) {
  const [visible, setVisible] = useState(franchises.slice(0, VISIBLE));
  const [cycle, setCycle] = useState(0);
  const reducedMotion = useReducedMotion();
  function shuffle() { setVisible(shuffled(franchises)); setCycle((value) => value + 1); }
  return <section><div className="mb-3 flex items-center justify-between gap-3 px-1"><h2 className="flex items-center gap-2 font-display text-lg font-bold"><Layers3 className="size-5 text-[var(--gold)]" /> Franchise Collections</h2><button type="button" onClick={shuffle} className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--glass)] px-4 text-xs font-bold text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"><Dices className="size-4" /> Shuffle worlds</button></div><div key={cycle} className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-4 ${reducedMotion ? "" : "pb-random-deck-reveal"}`}>{visible.map((franchise, index) => { const Icon = franchise.category === "TV universe" ? Tv : franchise.category === "Film saga" ? Film : Layers3; return <Link key={franchise.slug} href={`/browse/franchise/${franchise.slug}`} className="group relative min-h-36 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--media-border)] bg-[linear-gradient(135deg,rgb(var(--accent-rgb)/0.16),var(--glass))] p-5 transition hover:-translate-y-1 hover:border-[var(--accent)]"><span className="mb-5 grid size-10 place-items-center rounded-xl bg-[rgb(var(--accent-rgb)/0.15)] text-[var(--accent)]"><Icon className="size-5" /></span><span className="text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">{franchise.category}</span><h3 className="mt-1 font-display text-lg font-bold">{franchise.name}</h3><p className="mt-1 line-clamp-2 text-xs text-[var(--text-muted)]">{franchise.description}</p><span className="absolute right-4 top-4 font-mono text-xs text-white/15">{String(index + 1).padStart(2, "0")}</span></Link>; })}</div></section>;
}
