import type { ReelItemType, ReelItemStatus } from "@core/storage/schema";
import { getTypeLabel, getStatusLabel } from "@core/utils/formatters";
import { cn } from "@/lib/utils";

const TYPE_STYLES: Record<ReelItemType, string> = {
  movie: "text-[#67e8f9] shadow-[inset_0_0_10px_rgba(34,211,238,0.18)]",
  series: "text-[var(--accent)] shadow-[inset_0_0_10px_rgb(var(--accent-rgb)/0.2)]",
  anime: "text-[var(--accent-2)] shadow-[inset_0_0_10px_rgb(var(--accent-2-rgb)/0.2)]",
  manga: "text-[#6ee7b7] shadow-[inset_0_0_10px_rgba(52,211,153,0.18)]",
  manhwa: "text-[var(--gold)] shadow-[inset_0_0_10px_rgb(var(--gold-rgb)/0.2)]",
  comic: "text-[#fca5a5] shadow-[inset_0_0_10px_rgba(239,68,68,0.18)]",
};

const STATUS_COLORS: Record<ReelItemStatus, string> = {
  watching: "var(--watching)",
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
        "inline-flex items-center rounded-full border border-current/45 bg-[rgba(5,7,12,0.88)] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.08em] shadow-[0_2px_10px_rgba(0,0,0,0.65)] backdrop-blur-md",
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
          ? "bg-[linear-gradient(120deg,var(--accent),var(--accent-2))] text-[#0a0a0f]"
          : "glass text-[var(--text-secondary)] hover:text-[var(--text)]",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
