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
    <nav className="pointer-events-none fixed inset-x-0 bottom-[max(8px,var(--safe-bottom))] z-40 px-[max(8px,var(--safe-left))] md:hidden">
      <div className="pointer-events-auto mx-auto flex max-w-lg items-stretch justify-around overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--nav-surface)] px-1 shadow-[0_16px_42px_rgba(0,0,0,.12)] backdrop-blur-xl">
        {BOTTOM_NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-[62px] min-w-0 flex-1 flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl text-[9px] font-semibold transition-[background-color,color,transform] duration-200 active:scale-[.98] min-[360px]:text-[10px]",
                active ? "bg-[rgb(var(--accent-rgb)/0.12)] text-[var(--accent)]" : "text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text)]"
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
              className="flex min-h-[62px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl text-[9px] font-semibold text-[var(--text-muted)] min-[360px]:text-[10px]"
              aria-label="More options"
            >
              <Menu className="size-5" />
              More
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/15 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in" />
            <Dialog.Content className="fixed bottom-0 left-[var(--safe-left)] right-[var(--safe-right)] z-50 max-h-[92dvh] overflow-hidden rounded-t-[28px] border-t border-[var(--border)] bg-[var(--bg-surface)] pb-[calc(var(--safe-bottom)+12px)] shadow-[0_-24px_60px_rgba(0,0,0,.16)] data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom">
              <div className="flex items-center justify-between px-5 py-4">
                <Dialog.Title className="font-display text-lg font-bold">More</Dialog.Title>
                <Dialog.Close className="grid size-8 place-items-center rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[rgb(var(--accent-rgb)/0.12)] hover:text-[var(--accent)]">
                  <X className="size-4" />
                </Dialog.Close>
              </div>
              <div className="mx-5 mb-4 flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 transition-colors focus-within:border-[var(--accent)] focus-within:bg-[var(--bg-surface)]">
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
                    return <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={cn("flex min-h-20 flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border px-1 text-center text-[10px] font-semibold transition-colors min-[360px]:text-[11px]", active ? "border-[rgb(var(--accent-rgb)/0.35)] bg-[rgb(var(--accent-rgb)/0.12)] text-[var(--accent)]" : "border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[rgb(var(--accent-rgb)/0.28)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text)]")}><Icon className="size-5" />{item.label}</Link>;
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
