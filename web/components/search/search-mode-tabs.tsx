"use client";

import { useState, type ReactNode } from "react";
import { Search as SearchIcon, Sparkles } from "lucide-react";
import { MemorySearchPanel } from "@/components/search/memory-search-panel";

export function SearchModeTabs({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"search" | "describe">("search");

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setMode("search")}
          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold ${mode === "search" ? "bg-[var(--accent)] text-[#0a0a0f]" : "glass text-[var(--text-secondary)]"}`}
        >
          <SearchIcon className="size-3.5" /> Search
        </button>
        <button
          onClick={() => setMode("describe")}
          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold ${mode === "describe" ? "bg-[var(--accent)] text-[#0a0a0f]" : "glass text-[var(--text-secondary)]"}`}
        >
          <Sparkles className="size-3.5" /> Describe It
        </button>
      </div>
      {mode === "search" ? children : <MemorySearchPanel />}
    </div>
  );
}
