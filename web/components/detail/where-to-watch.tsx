"use client";

import { ExternalLink, Tv, Gift, BookOpen } from "lucide-react";
import type { WatchOption } from "@core/api/watchProviders";

const GROUPS: { key: WatchOption["type"][]; label: string; icon: React.ReactNode; paid: boolean }[] = [
  { key: ["subscription", "rent", "buy"], label: "Streaming Services", icon: <Tv className="size-4" />, paid: true },
  { key: ["free"], label: "Free Options", icon: <Gift className="size-4" />, paid: false },
  { key: ["reading"], label: "Read Online", icon: <BookOpen className="size-4" />, paid: false },
];

export function WhereToWatch({ options }: { options: WatchOption[] }) {
  if (options.length === 0) {
    return (
      <p className="text-sm text-[var(--text-secondary)]">
        No links yet. An admin can add curated where-to-watch links for this title.
      </p>
    );
  }
  return (
    <div className="space-y-5">
      {GROUPS.map((group) => {
        const entries = options.filter((o) => group.key.includes(o.type));
        if (entries.length === 0) return null;
        return (
          <div key={group.label}>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
              {group.icon} {group.label}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {entries.map((o, i) => (
                <a
                  key={`${o.name}-${i}`}
                  href={o.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass glow-ring flex items-center justify-between gap-2 rounded-[var(--radius-md)] px-3.5 py-3 text-sm font-medium"
                >
                  <span className="flex items-center gap-2 truncate">
                    {o.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={o.logoUrl} alt="" className="size-6 shrink-0 rounded-full object-cover" />
                    ) : (
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[var(--glass-strong)] text-[10px] font-bold">
                        {o.name.charAt(0)}
                      </span>
                    )}
                    <span className="truncate">{o.name}</span>
                  </span>
                  <ExternalLink className="size-3.5 shrink-0 opacity-50" />
                </a>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
