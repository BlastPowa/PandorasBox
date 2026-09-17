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
    <nav aria-label="Tracking hub" className="grid grid-cols-3 gap-1.5 rounded-[22px] border border-[var(--border)] bg-[var(--glass)] p-1.5 shadow-[0_12px_32px_rgba(15,23,42,.04)] backdrop-blur-xl sm:gap-2 sm:p-2">
      {SECTIONS.map(({ key, href, label, detail, icon: Icon }) => {
        const selected = key === active;
        return (
          <Link
            key={key}
            href={href}
            aria-current={selected ? "page" : undefined}
            className={`group flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-[16px] px-1.5 py-2 text-center transition sm:justify-start sm:px-3.5 sm:py-2.5 ${
              selected
                ? "bg-[rgb(var(--accent-rgb)/0.12)] text-[var(--accent)] ring-1 ring-[rgb(var(--accent-rgb)/0.26)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--glass-strong)] hover:text-[var(--text)]"
            }`}
          >
            <span className={`grid size-8 shrink-0 place-items-center rounded-xl border max-[430px]:hidden ${selected ? "border-[rgb(var(--accent-rgb)/0.2)] bg-[rgb(var(--accent-rgb)/0.1)]" : "border-[var(--border)] bg-[var(--bg-surface)]"}`}>
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
