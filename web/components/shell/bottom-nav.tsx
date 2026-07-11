"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Menu, Search, X } from "lucide-react";
import { NAV_ITEMS, NAV_GROUPS, BOTTOM_NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

const PRIMARY_HREFS = new Set(BOTTOM_NAV.map((p) => p.href));

export function BottomNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const moreItems = NAV_ITEMS.filter(
    (i) => !PRIMARY_HREFS.has(i.href) && (!i.adminOnly || isAdmin)
  ).filter((i) => i.label.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <nav className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-[rgb(var(--accent-rgb)/0.22)] bg-[linear-gradient(180deg,rgb(var(--accent-rgb)/0.08),var(--bg-surface)_42%)]/95 shadow-[0_-14px_35px_rgba(0,0,0,0.35)] backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-1">
        {BOTTOM_NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-1 overflow-hidden text-[10px] font-semibold transition-colors",
                active ? "bg-[rgb(var(--accent-rgb)/0.11)] text-[var(--accent)]" : "text-[var(--text-muted)]"
              )}
            >
              <Icon className="size-5" />
              {item.label}
            </Link>
          );
        })}

        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger asChild>
            <button
              className="flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[10px] font-semibold text-[var(--text-muted)]"
              aria-label="More options"
            >
              <Menu className="size-5" />
              More
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in" />
            <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-hidden rounded-t-[var(--radius-xl)] border-t border-[rgb(var(--accent-rgb)/0.35)] bg-[linear-gradient(160deg,rgb(var(--accent-rgb)/0.08),var(--bg-elevated)_28%)] pb-[calc(env(safe-area-inset-bottom)+12px)] shadow-2xl data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom">
              <div className="flex items-center justify-between px-5 py-4">
                <Dialog.Title className="font-display text-lg font-bold">More</Dialog.Title>
                <Dialog.Close className="grid size-8 place-items-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--glass)]">
                  <X className="size-4" />
                </Dialog.Close>
              </div>
              <div className="mx-5 mb-4 flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-base)] px-4">
                <Search className="size-4 text-[var(--text-muted)]" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a page" className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]" />
              </div>
              <div className="max-h-[68dvh] space-y-5 overflow-y-auto overscroll-contain px-5 pb-8">
                {NAV_GROUPS.map((group) => {
                  const groupItems = moreItems.filter((item) => item.group === group.key);
                  if (groupItems.length === 0) return null;
                  return <section key={group.key}><h2 className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">{group.label}</h2><div className="grid grid-cols-3 gap-3">{groupItems.map((item) => {
                    const Icon = item.icon;
                    const active = pathname.startsWith(item.href);
                    return <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={cn("glass flex min-h-20 flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] px-1 text-center text-[10px] font-semibold min-[360px]:text-[11px]", active ? "bg-[rgb(var(--accent-rgb)/0.12)] text-[var(--accent)] ring-1 ring-[var(--accent)]" : "text-[var(--text-secondary)]")}><Icon className="size-5" />{item.label}</Link>;
                  })}</div></section>;
                })}
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </nav>
  );
}
