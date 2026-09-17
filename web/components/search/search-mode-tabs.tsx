"use client";

import { useState, type ReactNode } from "react";
import { Search as SearchIcon, Sparkles } from "lucide-react";
import { MemorySearchPanel } from "@/components/search/memory-search-panel";

export function SearchModeTabs({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"search" | "describe">("search");

  return (
    <div>
      <div className="mb-5 grid gap-2 sm:grid-cols-2">
        <button
          onClick={() => setMode("search")}
          className={`rounded-2xl border p-3 text-left transition ${mode === "search" ? "border-[rgb(var(--accent-rgb)/0.45)] bg-[rgb(var(--accent-rgb)/0.12)] shadow-[0_12px_36px_rgb(var(--accent-rgb)/0.08)]" : "border-[var(--border)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)]"}`}
        >
          <span className="flex items-center gap-2 text-sm font-bold"><SearchIcon className="size-4 text-[var(--accent)]" /> Search by title</span>
          <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">Find exact titles and compare media types, scores and release years.</span>
        </button>
        <button
          onClick={() => setMode("describe")}
          className={`rounded-2xl border p-3 text-left transition ${mode === "describe" ? "border-[rgb(var(--accent-rgb)/0.45)] bg-[rgb(var(--accent-rgb)/0.12)] shadow-[0_12px_36px_rgb(var(--accent-rgb)/0.08)]" : "border-[var(--border)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)]"}`}
        >
          <span className="flex items-center gap-2 text-sm font-bold"><Sparkles className="size-4 text-[var(--accent)]" /> Describe it</span>
          <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">Use plot details, a scene or a half-remembered premise when the title is missing.</span>
        </button>
      </div>
      {mode === "search" ? children : <MemorySearchPanel />}
    </div>
  );
}
