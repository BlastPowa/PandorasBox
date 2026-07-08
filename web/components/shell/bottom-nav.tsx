"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import { NAV_ITEMS, BOTTOM_NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

const PRIMARY_HREFS = new Set(BOTTOM_NAV.map((p) => p.href));

export function BottomNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const moreItems = NAV_ITEMS.filter(
    (i) => !PRIMARY_HREFS.has(i.href) && (!i.adminOnly || isAdmin)
  );

  return (
    <nav className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--bg-surface)]/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch justify-around">
        {BOTTOM_NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors",
                active ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
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
              className="flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 text-[10px] font-semibold text-[var(--text-muted)]"
              aria-label="More options"
            >
              <Menu className="size-5" />
              More
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in" />
            <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 rounded-t-[var(--radius-xl)] border-t border-[var(--border)] bg-[var(--bg-elevated)] pb-[calc(env(safe-area-inset-bottom)+12px)] shadow-2xl data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom">
              <div className="flex items-center justify-between px-5 py-4">
                <Dialog.Title className="font-display text-lg font-bold">More</Dialog.Title>
                <Dialog.Close className="grid size-8 place-items-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--glass)]">
                  <X className="size-4" />
                </Dialog.Close>
              </div>
              <div className="grid grid-cols-3 gap-3 px-5 pb-4">
                {moreItems.map((item) => {
                  const Icon = item.icon;
                  const active = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "glass flex flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] py-4 text-xs font-semibold",
                        active ? "text-[var(--accent)] ring-1 ring-[var(--accent)]" : "text-[var(--text-secondary)]"
                      )}
                    >
                      <Icon className="size-5" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </nav>
  );
}
