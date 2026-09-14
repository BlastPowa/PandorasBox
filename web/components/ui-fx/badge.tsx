import type { ReelItemType, ReelItemStatus } from "@core/storage/schema";
import { getTypeLabel, getStatusLabel } from "@core/utils/formatters";
import { cn } from "@/lib/utils";

const TYPE_STYLES: Record<ReelItemType, string> = {
  movie: "text-[#0e7490] bg-cyan-50/90",
  series: "text-[var(--accent)] bg-blue-50/90",
  anime: "text-[#7c3aed] bg-violet-50/90",
  manga: "text-[#047857] bg-emerald-50/90",
  manhwa: "text-[#b45309] bg-amber-50/90",
  comic: "text-[#be123c] bg-rose-50/90",
};

const STATUS_COLORS: Record<ReelItemStatus, string> = {
  watching: "var(--watching)",
  rewatching: "var(--accent-2)",
  reading: "var(--reading)",
  completed: "var(--completed)",
  on_hold: "var(--onhold)",
  dropped: "var(--dropped)",
  planned: "var(--planned)",
};

export function TypeBadge({ type, className }: { type: ReelItemType; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-current/35 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.08em] shadow-sm backdrop-blur-md",
        TYPE_STYLES[type],
        className
      )}
    >
      {getTypeLabel(type)}
    </span>
  );
}

export function StatusBadge({ status, className }: { status: ReelItemStatus; className?: string }) {
  const color = STATUS_COLORS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        className
      )}
      style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
    >
      <span className="size-1.5 rounded-full" style={{ background: color }} />
      {getStatusLabel(status)}
    </span>
  );
}

export function Pill({
  children,
  active,
  className,
  ...props
}: React.HTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
        active
          ? "bg-[linear-gradient(120deg,var(--accent),var(--accent-2))] text-white"
          : "glass text-[var(--text-secondary)] hover:text-[var(--text)]",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
