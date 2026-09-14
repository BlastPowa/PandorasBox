"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { NAV_ITEMS, NAV_GROUPS } from "@/lib/nav";
import { Brand } from "./brand";
import { cn } from "@/lib/utils";

export function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside className="sticky top-0 z-40 hidden h-dvh w-[232px] shrink-0 flex-col border-r border-[var(--nav-border)] bg-[var(--nav-surface)] px-4 py-5 backdrop-blur-xl md:flex">
      <div className="px-2">
        <Brand />
        <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">Everything you’re watching, reading and playing.</p>
      </div>

      <nav className="mt-7 flex-1 space-y-6 overflow-y-auto pr-1" aria-label="Primary navigation">
        {NAV_GROUPS.map((group) => {
          const groupItems = items.filter((item) => item.group === group.key);
          if (groupItems.length === 0) return null;
          return (
            <section key={group.key}>
              <h2 className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">{group.label}</h2>
              <div className="space-y-1">
                {groupItems.map((item) => {
                  const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
                        active
                          ? "bg-[rgb(var(--accent-rgb)/0.12)] text-[var(--accent)]"
                          : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text)]"
                      )}
                    >
                      <Icon className="size-[18px] shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </nav>

      <Link
        href="/search"
        className="mt-4 rounded-2xl border border-[rgb(var(--accent-rgb)/0.22)] bg-[rgb(var(--accent-rgb)/0.07)] p-3.5 transition hover:border-[rgb(var(--accent-rgb)/0.4)] hover:bg-[rgb(var(--accent-rgb)/0.11)]"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="grid size-8 place-items-center rounded-xl bg-[rgb(var(--accent-rgb)/0.14)] text-[var(--accent)]"><Sparkles className="size-4" /></span>
          <ArrowUpRight className="size-4 text-[var(--text-muted)]" />
        </div>
        <p className="mt-3 text-sm font-bold text-[var(--text)]">Find something new</p>
        <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">Find anything, save it, then check in from one place.</p>
      </Link>
    </aside>
  );
}
