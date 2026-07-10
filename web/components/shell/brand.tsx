import Link from "next/link";
import { cn } from "@/lib/utils";

export function PBoxMark({ className }: { className?: string }) {
  return (
    <span className={cn("relative grid size-10 shrink-0 place-items-center", className)} aria-hidden="true">
      <svg viewBox="0 0 48 48" className="size-full overflow-visible" fill="none">
        <rect x="3" y="3" width="42" height="42" rx="13" fill="var(--accent)" />
        <path d="M24 3h8c7.2 0 13 5.8 13 13v16c0 7.2-5.8 13-13 13H24V3Z" fill="var(--accent-2)" opacity=".72" />
        <path d="M12 19.5 24 14l12 5.5-12 5.7-12-5.7Z" fill="rgb(255 255 255 / .92)" />
        <path d="M12 23.4 22.4 28v9L12 32.2v-8.8Zm24 0L25.6 28v9L36 32.2v-8.8Z" fill="rgb(10 10 15 / .86)" />
        <path d="M19 18.1v12.8M29 16.9v13.8" stroke="var(--gold)" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function PBoxWordmark({ className }: { className?: string }) {
  return <span className={cn("font-display text-xl font-extrabold tracking-[-0.04em] text-gradient", className)}>PBox</span>;
}

export function Brand({ compact, className, onClick }: { compact?: boolean; className?: string; onClick?: () => void }) {
  return <Link href="/" onClick={onClick} className={cn("group flex items-center gap-2.5", className)} aria-label="PBox home"><PBoxMark />{!compact && <PBoxWordmark />}</Link>;
}
