"use client";

import { useEffect, useState } from "react";
import { MonitorCog, Moon, Sun } from "lucide-react";
import { APPEARANCE_MODE_KEY, THEME_CHANGE_EVENT } from "@/lib/theme";

type AppearanceMode = "light" | "dark" | "system";

const ORDER: AppearanceMode[] = ["system", "light", "dark"];

function resolveMode(mode: AppearanceMode) {
  if (mode !== "system") return mode;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyMode(mode: AppearanceMode) {
  window.localStorage.setItem(APPEARANCE_MODE_KEY, mode);
  document.documentElement.setAttribute("data-mode", resolveMode(mode));
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT));
}

export function ThemeModeToggle() {
  const [mode, setMode] = useState<AppearanceMode>("system");

  useEffect(() => {
    const saved = window.localStorage.getItem(APPEARANCE_MODE_KEY);
    const initial: AppearanceMode = saved === "light" || saved === "dark" ? saved : "system";
    queueMicrotask(() => setMode(initial));

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystem = () => {
      const current = window.localStorage.getItem(APPEARANCE_MODE_KEY) ?? "system";
      if (current === "system") document.documentElement.setAttribute("data-mode", media.matches ? "dark" : "light");
    };
    media.addEventListener("change", syncSystem);
    return () => media.removeEventListener("change", syncSystem);
  }, []);

  const next = () => {
    const index = ORDER.indexOf(mode);
    const nextMode = ORDER[(index + 1) % ORDER.length];
    setMode(nextMode);
    applyMode(nextMode);
  };

  const Icon = mode === "light" ? Sun : mode === "dark" ? Moon : MonitorCog;
  const label = mode === "system" ? "Theme: Auto" : `Theme: ${mode === "light" ? "Light" : "Dark"}`;

  return (
    <button
      type="button"
      onClick={next}
      aria-label={`${label}. Click to switch appearance.`}
      title={`${label} · click to cycle`}
      className="relative grid size-11 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--glass)] text-[var(--text-secondary)] shadow-sm backdrop-blur-md transition hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
    >
      <Icon className="size-[18px]" />
      <span className="absolute bottom-1 right-1 size-1.5 rounded-full bg-[var(--accent)]" aria-hidden="true" />
    </button>
  );
}
