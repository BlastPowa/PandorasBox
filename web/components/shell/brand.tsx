import Link from "next/link";
import { cn } from "@/lib/utils";

export function Brand({ compact, className }: { compact?: boolean; className?: string }) {
  return (
    <Link href="/" className={cn("group flex items-center gap-2.5", className)} aria-label="Pandora's Box home">
      <span className="relative grid size-9 place-items-center rounded-[10px] bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] shadow-[0_6px_20px_rgb(var(--accent-rgb)/0.35)]">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
          <path d="M4 9h16v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9Z" fill="rgba(10,10,15,0.85)" />
          <path d="M3 6.5 12 3l9 3.5V9H3V6.5Z" fill="rgba(10,10,15,0.85)" />
          <circle cx="12" cy="13.5" r="2" fill="var(--gold)" />
        </svg>
      </span>
      {!compact && (
        <span className="font-display text-lg font-extrabold tracking-tight text-gradient">
          Pandora&apos;s Box
        </span>
      )}
    </Link>
  );
}
