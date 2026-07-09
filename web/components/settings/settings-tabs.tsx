"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { User, Palette, Plug, UploadCloud, Database } from "lucide-react";
import { cn } from "@/lib/utils";

export type SettingsTabKey = "account" | "appearance" | "integrations" | "import" | "backup";

const TABS: { key: SettingsTabKey; label: string; icon: typeof User }[] = [
  { key: "account", label: "Account", icon: User },
  { key: "appearance", label: "Appearance", icon: Palette },
  { key: "integrations", label: "Integrations", icon: Plug },
  { key: "import", label: "Import", icon: UploadCloud },
  { key: "backup", label: "Backup", icon: Database },
];

export function SettingsTabs({ sections }: { sections: Record<SettingsTabKey, ReactNode> }) {
  const [active, setActive] = useState<SettingsTabKey>("account");

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
      <nav className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:w-52 sm:shrink-0 sm:flex-col sm:overflow-visible sm:px-0 sm:pb-0">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              aria-pressed={active === t.key}
              className={cn(
                "flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-[var(--radius-md)] px-3.5 py-2.5 text-sm font-semibold transition-colors sm:w-full",
                active === t.key
                  ? "bg-[linear-gradient(120deg,var(--accent),var(--accent-2))] text-[#0a0a0f]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--glass)] hover:text-[var(--text)]"
              )}
            >
              <Icon className="size-4 shrink-0" />
              {t.label}
            </button>
          );
        })}
      </nav>
      <div className="min-w-0 flex-1 space-y-5">{sections[active]}</div>
    </div>
  );
}
