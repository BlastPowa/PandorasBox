"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { THEMES, THEME_CHANGE_EVENT, THEME_STORAGE_KEY } from "@/lib/theme";
import { GlassCard } from "@/components/ui-fx/glass-card";
import { Switch } from "@/components/ui-fx/switch";

const DENSITY_KEY = "pb_compact_rows";
const REDUCE_MOTION_KEY = "pb_reduce_motion";
const LIBRARY_VIEW_KEY = "pb_library_view";

function readBool(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeBool(key: string, value: boolean) {
  try {
    window.localStorage.setItem(key, value ? "1" : "0");
  } catch {
    // ignore
  }
}

export function AppearanceSection() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "default";
    try { return window.localStorage.getItem(THEME_STORAGE_KEY) ?? "default"; } catch { return "default"; }
  });
  const [compact, setCompact] = useState(() => readBool(DENSITY_KEY));
  const [reduceMotion, setReduceMotion] = useState(() => readBool(REDUCE_MOTION_KEY));
  const [libraryListView, setLibraryListView] = useState(() => typeof window !== "undefined" && window.localStorage.getItem(LIBRARY_VIEW_KEY) === "list");

  function applyTheme(id: string) {
    setTheme(id);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, id);
    } catch {
      // ignore
    }
    if (id === "default") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", id);
    }
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }

  function toggleCompact(v: boolean) {
    setCompact(v);
    writeBool(DENSITY_KEY, v);
    document.documentElement.classList.toggle("pb-compact", v);
  }

  function toggleReduceMotion(v: boolean) {
    setReduceMotion(v);
    writeBool(REDUCE_MOTION_KEY, v);
    document.documentElement.classList.toggle("pb-reduce-motion", v);
  }

  function toggleLibraryView(v: boolean) {
    setLibraryListView(v);
    try {
      window.localStorage.setItem(LIBRARY_VIEW_KEY, v ? "list" : "grid");
    } catch {
      // ignore
    }
  }

  return (
    <GlassCard macDots title="Appearance">
      <div className="space-y-6 p-5">
        <div>
          <p className="mb-1 text-sm font-semibold text-[var(--text-secondary)]">Theme</p>
          <p className="mb-3 text-xs text-[var(--text-muted)]">Pick an accent palette for the whole app.</p>
          <div className="flex flex-wrap gap-2">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => applyTheme(t.id)}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  theme === t.id
                    ? "border-[var(--accent)] bg-[var(--glass-strong)] text-[var(--text)]"
                    : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                }`}
              >
                <span className="size-3.5 rounded-full" style={{ backgroundColor: t.dot }} />
                {t.name}
                {theme === t.id && <Check className="size-3.5" />}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Compact poster rows</p>
            <p className="text-xs text-[var(--text-muted)]">Smaller cards, more titles per row.</p>
          </div>
          <Switch checked={compact} onCheckedChange={toggleCompact} />
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Reduce motion</p>
            <p className="text-xs text-[var(--text-muted)]">Turn off scroll/fade animations across the site.</p>
          </div>
          <Switch checked={reduceMotion} onCheckedChange={toggleReduceMotion} />
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Default library view</p>
            <p className="text-xs text-[var(--text-muted)]">Grid or list when you open My Library.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <span className={!libraryListView ? "font-semibold text-[var(--text)]" : ""}>Grid</span>
            <Switch checked={libraryListView} onCheckedChange={toggleLibraryView} />
            <span className={libraryListView ? "font-semibold text-[var(--text)]" : ""}>List</span>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
