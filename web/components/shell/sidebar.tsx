"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tooltip from "@radix-ui/react-tooltip";
import { Menu, Settings, X } from "lucide-react";
import { NAV_ITEMS, NAV_GROUPS } from "@/lib/nav";
import { Brand, PBoxMark, PBoxWordmark } from "./brand";
import { cn } from "@/lib/utils";

const RAIL_HREFS = ["/", "/browse", "/search", "/library", "/randomize", "/schedule"];

export function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const items = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);
  const railItems = RAIL_HREFS.map((href) => items.find((item) => item.href === href)).filter(Boolean);

  return (
    <Tooltip.Provider delayDuration={250}>
      <aside className="sticky top-0 z-40 hidden h-dvh w-20 shrink-0 flex-col items-center border-r border-[var(--nav-border)] bg-[var(--nav-surface)] py-4 backdrop-blur-xl md:flex">
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger asChild>
            <button className="group relative mb-5 grid size-12 place-items-center rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]" aria-label="Open PBox navigation">
              <PBoxMark className="transition-transform duration-200 group-hover:scale-105" />
              <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full border border-[var(--border)] bg-[var(--bg-elevated)]"><Menu className="size-3" /></span>
            </button>
          </Dialog.Trigger>

          <nav className="flex flex-1 flex-col items-center gap-2" aria-label="Primary navigation">
            {railItems.map((item) => {
              if (!item) return null;
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Tooltip.Root key={item.href}>
                  <Tooltip.Trigger asChild>
                    <Link href={item.href} aria-current={active ? "page" : undefined} aria-label={item.label} className={cn("relative grid size-12 place-items-center rounded-2xl text-[var(--text-muted)] transition-[color,background-color,transform] duration-150 hover:-translate-y-0.5 hover:bg-[var(--glass)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]", active && "bg-[rgb(var(--accent-rgb)/0.18)] text-[var(--accent)]")}>
                      {active && <span className="absolute -left-4 h-7 w-1 rounded-r-full bg-[var(--accent)]" />}
                      <Icon className="size-5" />
                    </Link>
                  </Tooltip.Trigger>
                  <Tooltip.Portal><Tooltip.Content side="right" sideOffset={10} className="z-[70] rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-xs font-semibold shadow-xl">{item.label}<Tooltip.Arrow className="fill-[var(--bg-elevated)]" /></Tooltip.Content></Tooltip.Portal>
                </Tooltip.Root>
              );
            })}
          </nav>

          <Tooltip.Root><Tooltip.Trigger asChild><Link href="/settings" aria-label="Settings" className="mb-2 grid size-12 place-items-center rounded-2xl text-[var(--text-muted)] transition hover:bg-[var(--glass)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"><Settings className="size-5" /></Link></Tooltip.Trigger><Tooltip.Portal><Tooltip.Content side="right" sideOffset={10} className="z-[70] rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-xs font-semibold shadow-xl">Settings</Tooltip.Content></Tooltip.Portal></Tooltip.Root>

          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in data-[state=closed]:fade-out" />
            <Dialog.Content className="fixed inset-y-0 left-0 z-[60] w-[min(88vw,360px)] overflow-y-auto border-r border-[var(--nav-border)] bg-[var(--bg-surface)] p-5 shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left">
              <div className="mb-7 flex items-center justify-between"><Dialog.Title className="flex items-center gap-3"><Brand /><span className="sr-only">Navigation</span></Dialog.Title><Dialog.Close className="grid size-10 place-items-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--glass)]" aria-label="Close navigation"><X className="size-5" /></Dialog.Close></div>
              <div className="space-y-6">
                {NAV_GROUPS.map((group) => (
                  <section key={group.key} aria-labelledby={`nav-${group.key}`}>
                    <h2 id={`nav-${group.key}`} className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">{group.label}</h2>
                    <div className="grid grid-cols-2 gap-2">
                      {items.filter((item) => item.group === group.key).map((item) => { const Icon = item.icon; const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href); return <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={cn("flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--glass)] hover:text-[var(--text)]", active && "bg-[rgb(var(--accent-rgb)/0.14)] text-[var(--accent)]")}><Icon className="size-[18px] shrink-0" /><span className="truncate">{item.label}</span></Link>; })}
                    </div>
                  </section>
                ))}
              </div>
              <div className="mt-8 flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--glass)] p-3"><PBoxMark className="size-9" /><div><PBoxWordmark className="text-base" /><p className="text-[10px] text-[var(--text-muted)]">Track everything you love.</p></div></div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </aside>
    </Tooltip.Provider>
  );
}
