"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FaqEntry {
  question: string;
  answer: React.ReactNode;
  category?: "Getting started" | "Library" | "Discovery" | "Social" | "Accounts";
}

export function FaqAccordion({ entries }: { entries: FaqEntry[] }) {
  const [open, setOpen] = useState<number | null>(0);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(entries.map((entry) => entry.category).filter(Boolean))) as string[]],
    [entries],
  );
  const visibleEntries = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return entries.filter((entry) => {
      if (category !== "All" && entry.category !== category) return false;
      if (!needle) return true;
      return entry.question.toLowerCase().includes(needle);
    });
  }, [category, entries, query]);

  return (
    <div className="space-y-4">
      <div className="pb-uiverse-card pb-uiverse-card--compact rounded-[22px] p-3 sm:p-4">
        <label className="flex h-11 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-3">
          <Search className="size-4 shrink-0 text-[var(--text-muted)]" />
          <span className="sr-only">Search help</span>
          <input
            value={query}
            onChange={(event) => { setQuery(event.target.value); setOpen(null); }}
            placeholder="Search help topics…"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]"
          />
        </label>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => { setCategory(item); setOpen(null); }}
              className={cn(
                "min-h-9 shrink-0 rounded-full border px-3.5 text-xs font-bold transition",
                category === item
                  ? "border-transparent bg-[var(--accent)] text-white"
                  : "border-[var(--border)] bg-[var(--glass)] text-[var(--text-secondary)] hover:border-[rgb(var(--accent-rgb)/0.35)] hover:text-[var(--text)]",
              )}
            >
              {item}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-[var(--text-muted)]">{visibleEntries.length} {visibleEntries.length === 1 ? "answer" : "answers"} available</p>
      </div>

      {visibleEntries.length === 0 ? (
        <div className="pb-uiverse-card rounded-[var(--radius-md)] px-4 py-10 text-center">
          <Search className="mx-auto size-7 text-[var(--text-muted)]" />
          <p className="mt-3 text-sm font-bold">No help topics match that search</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Try a broader word or switch categories.</p>
        </div>
      ) : visibleEntries.map((entry, i) => {
        const isOpen = open === i;
        return (
          <div key={entry.question} className="pb-uiverse-card overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)]">
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
              aria-expanded={isOpen}
            >
              <span>
                {entry.category && <span className="mb-1 block text-[9px] font-extrabold uppercase tracking-[0.14em] text-[var(--accent)]">{entry.category}</span>}
                <span className="text-sm font-semibold">{entry.question}</span>
              </span>
              <ChevronDown
                className={cn("size-4 shrink-0 text-[var(--text-muted)] transition-transform", isOpen && "rotate-180 text-[var(--accent)]")}
              />
            </button>
            <div
              className={cn(
                "grid transition-[grid-template-rows] duration-200 ease-out",
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              )}
            >
              <div className="overflow-hidden">
                <div className="px-4 pb-4 text-sm leading-relaxed text-[var(--text-secondary)]">{entry.answer}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
