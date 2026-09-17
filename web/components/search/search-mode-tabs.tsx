"use client";

import { useState, type ReactNode } from "react";
import { Search as SearchIcon, Sparkles } from "lucide-react";
import { MemorySearchPanel } from "@/components/search/memory-search-panel";

export function SearchModeTabs({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"search" | "describe">("search");

  return (
    <div>
      <div className="mb-5 inline-flex w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-1 sm:w-auto">
        <button
          onClick={() => setMode("search")}
          aria-pressed={mode === "search"}
          className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition sm:flex-none ${mode === "search" ? "bg-[rgb(var(--accent-rgb)/0.14)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"}`}
        >
          <SearchIcon className="size-4 text-[var(--accent)]" /> Search titles
        </button>
        <button
          onClick={() => setMode("describe")}
          aria-pressed={mode === "describe"}
          className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition sm:flex-none ${mode === "describe" ? "bg-[rgb(var(--accent-rgb)/0.14)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"}`}
        >
          <Sparkles className="size-4 text-[var(--accent)]" /> Describe it
        </button>
      </div>
      {mode === "search" ? children : <MemorySearchPanel />}
    </div>
  );
}
