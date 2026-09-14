"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { User, Palette, Plug, UploadCloud, Database } from "lucide-react";
import { cn } from "@/lib/utils";

export type SettingsTabKey = "account" | "appearance" | "integrations" | "import" | "backup";

const TABS: { key: SettingsTabKey; label: string; description: string; icon: typeof User }[] = [
  { key: "account", label: "Account", description: "Profile & sign-in", icon: User },
  { key: "appearance", label: "Appearance", description: "Theme & display", icon: Palette },
  { key: "integrations", label: "Integrations", description: "Sync services", icon: Plug },
  { key: "import", label: "Import", description: "Bring your lists", icon: UploadCloud },
  { key: "backup", label: "Backup", description: "Export & restore", icon: Database },
];

export function SettingsTabs({ sections }: { sections: Record<SettingsTabKey, ReactNode> }) {
  const [active, setActive] = useState<SettingsTabKey>("account");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const requested = window.location.hash.slice(1) as SettingsTabKey;
      if (TABS.some((tab) => tab.key === requested)) setActive(requested);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function selectTab(key: SettingsTabKey) {
    setActive(key);
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${key}`);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-8">
      <nav className="grid grid-cols-2 gap-2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] p-2 sm:grid-cols-3 lg:sticky lg:top-24 lg:grid-cols-1 lg:self-start">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => selectTab(t.key)}
              aria-pressed={active === t.key}
              className={cn(
                "group flex min-h-14 items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-left transition-all",
                active === t.key
                  ? "bg-[rgb(var(--accent-rgb)/0.14)] text-[var(--text)] ring-1 ring-inset ring-[rgb(var(--accent-rgb)/0.4)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--glass)] hover:text-[var(--text)]"
              )}
            >
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--glass)] transition-colors",
                  active === t.key && "border-[rgb(var(--accent-rgb)/0.35)] bg-[rgb(var(--accent-rgb)/0.16)] text-[var(--accent)]"
                )}
              >
                <Icon className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{t.label}</span>
                <span className="hidden text-[11px] font-normal text-[var(--text-muted)] lg:block">{t.description}</span>
              </span>
            </button>
          );
        })}
      </nav>
      <div className="min-w-0 space-y-5">{sections[active]}</div>
    </div>
  );
}
