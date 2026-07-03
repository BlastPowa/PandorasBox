"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";
import { Brand } from "./brand";
import { cn } from "@/lib/utils";

export function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex sticky top-0 h-dvh w-[248px] shrink-0 flex-col gap-2 border-r border-[var(--border)] bg-[var(--bg-surface)]/70 backdrop-blur-xl px-3 py-5">
      <div className="px-2 pb-4">
        <Brand />
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium transition-all duration-150",
                active
                  ? "bg-[linear-gradient(120deg,rgba(168,85,247,0.18),rgba(236,72,153,0.12))] text-[var(--text)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--glass)] hover:text-[var(--text)]"
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-6 -translate-y-1/2 rounded-r-full bg-[linear-gradient(180deg,var(--accent),var(--accent-2))]" style={{ width: 3 }} />
              )}
              <Icon className="size-[18px] shrink-0" />
              {item.label}
              {item.adminOnly && (
                <span className="ml-auto rounded-full bg-[rgba(245,165,36,0.15)] px-2 py-0.5 text-[9px] font-bold uppercase text-[var(--gold)]">
                  Admin
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 py-2 text-[10px] leading-relaxed text-[var(--text-muted)]">
        Data from TMDB, AniList &amp; MangaDex. Links open external sites.
      </div>
    </aside>
  );
}
