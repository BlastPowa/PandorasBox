"use client";

import { useEffect, useState } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { APPEARANCE_MODE_KEY, THEMES, THEME_CHANGE_EVENT, THEME_STORAGE_KEY } from "@/lib/theme";
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
  const [appearanceMode, setAppearanceMode] = useState<"light" | "dark" | "system">(() => {
    if (typeof window === "undefined") return "system";
    try {
      const saved = window.localStorage.getItem(APPEARANCE_MODE_KEY);
      return saved === "light" || saved === "dark" ? saved : "system";
    } catch {
      return "system";
    }
  });
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "default";
    try { return window.localStorage.getItem(THEME_STORAGE_KEY) ?? "default"; } catch { return "default"; }
  });
  const [compact, setCompact] = useState(() => readBool(DENSITY_KEY));
  const [reduceMotion, setReduceMotion] = useState(() => readBool(REDUCE_MOTION_KEY));
  const [libraryListView, setLibraryListView] = useState(() => typeof window !== "undefined" && window.localStorage.getItem(LIBRARY_VIEW_KEY) === "list");

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystemMode = () => {
      if (appearanceMode === "system") {
        document.documentElement.setAttribute("data-mode", media.matches ? "dark" : "light");
      }
    };
    syncSystemMode();
    media.addEventListener("change", syncSystemMode);
    return () => media.removeEventListener("change", syncSystemMode);
  }, [appearanceMode]);

  function applyAppearanceMode(mode: "light" | "dark" | "system") {
    setAppearanceMode(mode);
    try {
      window.localStorage.setItem(APPEARANCE_MODE_KEY, mode);
    } catch {
      // ignore
    }
    const resolved = mode === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : mode;
    document.documentElement.setAttribute("data-mode", resolved);
  }

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
          <p className="mb-1 text-sm font-semibold text-[var(--text-secondary)]">Light or dark</p>
          <p className="mb-3 text-xs text-[var(--text-muted)]">Use the look that feels best, or follow your device.</p>
          <div className="grid grid-cols-3 gap-2">
            {([
              { id: "light", label: "Light", icon: Sun },
              { id: "dark", label: "Dark", icon: Moon },
              { id: "system", label: "Auto", icon: Monitor },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => applyAppearanceMode(id)}
                className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border text-sm font-semibold transition ${appearanceMode === id ? "border-[var(--accent)] bg-[rgb(var(--accent-rgb)/0.10)] text-[var(--text)]" : "border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"}`}
              >
                <Icon className="size-5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1 text-sm font-semibold text-[var(--text-secondary)]">Accent colour</p>
          <p className="mb-3 text-xs text-[var(--text-muted)]">Make Pandora’s Box feel more like yours.</p>
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
