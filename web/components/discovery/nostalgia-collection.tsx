"use client";

import { useMemo, useState } from "react";
import type { UnifiedSearchResult } from "@core/utils/search";
import { PosterGrid } from "./poster-row";
import { cn } from "@/lib/utils";

export function NostalgiaCollection({ groups }: { groups: { label: string; items: UnifiedSearchResult[] }[] }) {
  const [active, setActive] = useState("All");
  const all = useMemo(() => { const seen = new Set<string>(); return groups.flatMap((group) => group.items).filter((item) => !seen.has(item.id) && seen.add(item.id)); }, [groups]);
  const items = active === "All" ? all : groups.find((group) => group.label === active)?.items ?? [];
  return <div className="space-y-5"><div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{["All", ...groups.map((group) => group.label)].map((label) => <button key={label} type="button" onClick={() => setActive(label)} aria-pressed={active === label} className={cn("h-10 shrink-0 rounded-full border px-4 text-xs font-bold transition", active === label ? "border-[var(--accent)] bg-[var(--accent)] text-[#08090d]" : "border-[var(--border)] bg-[var(--glass)] text-[var(--text-secondary)] hover:text-[var(--text)]")}>{label}</button>)}</div><PosterGrid items={items} randomize /></div>;
}
