import Link from "next/link";
import { BarChart3, CalendarDays, LibraryBig } from "lucide-react";

type TrackingSection = "library" | "schedule" | "stats";

const SECTIONS = [
  {
    key: "library" as const,
    href: "/library",
    label: "Library",
    detail: "Progress & ratings",
    icon: LibraryBig,
  },
  {
    key: "schedule" as const,
    href: "/schedule",
    label: "Schedule",
    detail: "Upcoming releases",
    icon: CalendarDays,
  },
  {
    key: "stats" as const,
    href: "/stats",
    label: "Stats",
    detail: "Habits & milestones",
    icon: BarChart3,
  },
];

export function TrackingHubNav({ active }: { active: TrackingSection }) {
  return (
    <nav aria-label="Tracking hub" className="grid grid-cols-3 gap-2 rounded-[22px] border border-[var(--border)] bg-[var(--glass)] p-2 backdrop-blur-xl">
      {SECTIONS.map(({ key, href, label, detail, icon: Icon }) => {
        const selected = key === active;
        return (
          <Link
            key={key}
            href={href}
            aria-current={selected ? "page" : undefined}
            className={`group flex min-w-0 items-center justify-center gap-2 rounded-[16px] px-2.5 py-2.5 text-center transition sm:justify-start sm:px-3.5 ${
              selected
                ? "bg-[rgb(var(--accent-rgb)/0.12)] text-[var(--accent)] ring-1 ring-[rgb(var(--accent-rgb)/0.26)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--glass-strong)] hover:text-[var(--text)]"
            }`}
          >
            <span className={`grid size-8 shrink-0 place-items-center rounded-xl border ${selected ? "border-[rgb(var(--accent-rgb)/0.2)] bg-[rgb(var(--accent-rgb)/0.1)]" : "border-[var(--border)] bg-[var(--bg-surface)]"}`}>
              <Icon className="size-4" />
            </span>
            <span className="min-w-0 sm:text-left">
              <strong className="block truncate text-xs font-bold sm:text-sm">{label}</strong>
              <span className="hidden truncate text-[10px] text-[var(--text-muted)] sm:block">{detail}</span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
