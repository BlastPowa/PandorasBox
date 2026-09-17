"use client";

import { ExternalLink, Tv, Gift, BookOpen, CreditCard } from "lucide-react";
import type { WatchOption } from "@core/api/watchProviders";

const GROUPS: { key: WatchOption["type"][]; label: string; hint: string; icon: React.ReactNode }[] = [
  { key: ["subscription"], label: "Stream now", hint: "Included with a subscription", icon: <Tv className="size-4" /> },
  { key: ["rent", "buy"], label: "Rent or buy", hint: "One-off purchase options", icon: <CreditCard className="size-4" /> },
  { key: ["free"], label: "Free options", hint: "Free and ad-supported services", icon: <Gift className="size-4" /> },
  { key: ["reading"], label: "Read online", hint: "External reading providers", icon: <BookOpen className="size-4" /> },
];

export function WhereToWatch({ options }: { options: WatchOption[] }) {
  if (options.length === 0) {
    return (
      <p className="text-sm text-[var(--text-secondary)]">
        No links yet. An admin can add curated where-to-watch links for this title.
      </p>
    );
  }
  const unique = options.filter((option, index, all) =>
    all.findIndex((candidate) => candidate.name.toLowerCase() === option.name.toLowerCase() && candidate.type === option.type) === index
  );
  const providerCount = new Set(unique.map((option) => option.name.toLowerCase())).size;
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] bg-[rgb(var(--accent-rgb)/0.08)] px-3 py-2.5">
        <div>
          <p className="text-xs font-bold text-[var(--text)]">Provider availability</p>
          <p className="text-[11px] text-[var(--text-muted)]">{providerCount} {providerCount === 1 ? "service" : "services"} found for your region</p>
        </div>
        <span className="rounded-full bg-[rgb(var(--accent-rgb)/0.14)] px-2.5 py-1 font-mono text-xs font-bold text-[var(--accent)]">{providerCount}</span>
      </div>
      {GROUPS.map((group) => {
        const entries = unique.filter((o) => group.key.includes(o.type));
        if (entries.length === 0) return null;
        return (
          <div key={group.label}>
            <div className="mb-2 flex items-end justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
                  {group.icon} {group.label}
                </div>
                <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">{group.hint}</p>
              </div>
              <span className="text-[10px] font-semibold text-[var(--text-muted)]">{entries.length}</span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {entries.map((o, i) => (
                <a
                  key={`${o.name}-${i}`}
                  href={o.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pb-uiverse-row group flex items-center justify-between gap-2 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium"
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
                    <span className="min-w-0">
                      <span className="block truncate">{o.name}</span>
                      {(o.type === "rent" || o.type === "buy") && <span className="block text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">{o.type}</span>}
                    </span>
                  </span>
                  <ExternalLink className="size-3.5 shrink-0 opacity-45 transition group-hover:opacity-80" />
                </a>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
