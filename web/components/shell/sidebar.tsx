"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronDown } from "lucide-react";
import { NAV_ITEMS, NAV_GROUPS, type NavGroup } from "@/lib/nav";
import { Brand } from "./brand";
import { cn } from "@/lib/utils";

const COLLAPSE_KEY = "pb_sidebar_collapsed";
const GROUPS_KEY = "pb_sidebar_open_groups";

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}

function readOpenGroups(): Set<NavGroup> {
  try {
    const raw = window.localStorage.getItem(GROUPS_KEY);
    if (raw) return new Set(JSON.parse(raw) as NavGroup[]);
  } catch {
    // ignore
  }
  return new Set(NAV_GROUPS.map((g) => g.key));
}

export function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<NavGroup>>(new Set(NAV_GROUPS.map((g) => g.key)));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setCollapsed(readCollapsed());
    setOpenGroups(readOpenGroups());
    setMounted(true);
  }, []);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
    } catch {
      // ignore
    }
  }

  function toggleGroup(key: NavGroup) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try {
        window.localStorage.setItem(GROUPS_KEY, JSON.stringify(Array.from(next)));
      } catch {
        // ignore
      }
      return next;
    });
  }

  const items = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside
      className={cn(
        "hidden md:flex sticky top-0 h-dvh shrink-0 flex-col gap-2 border-r border-[var(--border)] bg-[var(--bg-surface)]/70 backdrop-blur-xl px-3 py-5 transition-[width] duration-200 ease-out",
        collapsed ? "w-[76px]" : "w-[248px]",
        !mounted && "duration-0"
      )}
    >
      <div className="flex items-center justify-between px-2 pb-4">
        <Brand compact={collapsed} />
      </div>

      <nav className="flex flex-1 flex-col gap-3 overflow-y-auto">
        {NAV_GROUPS.map((group) => {
          const groupItems = items.filter((i) => i.group === group.key);
          if (groupItems.length === 0) return null;
          const open = openGroups.has(group.key);
          return (
            <div key={group.key}>
              {!collapsed && (
                <button
                  onClick={() => toggleGroup(group.key)}
                  className="mb-1 flex w-full items-center justify-between px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                >
                  {group.label}
                  <ChevronDown className={cn("size-3 transition-transform duration-150", !open && "-rotate-90")} />
                </button>
              )}
              {(open || collapsed) && (
                <div className="flex flex-col gap-1">
                  {groupItems.map((item) => {
                    const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium transition-all duration-150",
                          collapsed && "justify-center px-0",
                          active
                            ? "bg-[linear-gradient(120deg,rgba(168,85,247,0.18),rgba(236,72,153,0.12))] text-[var(--text)]"
                            : "text-[var(--text-secondary)] hover:bg-[var(--glass)] hover:text-[var(--text)]"
                        )}
                      >
                        {active && (
                          <span
                            className="absolute left-0 top-1/2 h-6 -translate-y-1/2 rounded-r-full bg-[linear-gradient(180deg,var(--accent),var(--accent-2))]"
                            style={{ width: 3 }}
                          />
                        )}
                        <Icon className="size-[18px] shrink-0" />
                        {!collapsed && (
                          <span className="truncate transition-opacity duration-150">{item.label}</span>
                        )}
                        {!collapsed && item.adminOnly && (
                          <span className="ml-auto shrink-0 rounded-full bg-[rgba(245,165,36,0.15)] px-2 py-0.5 text-[9px] font-bold uppercase text-[var(--gold)]">
                            Admin
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <button
        onClick={toggleCollapsed}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="flex items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--glass)] hover:text-[var(--text-secondary)]"
      >
        <ChevronLeft className={cn("size-4 shrink-0 transition-transform duration-200", collapsed && "rotate-180")} />
        {!collapsed && "Collapse"}
      </button>

      {!collapsed && (
        <div className="px-3 py-2 text-[10px] leading-relaxed text-[var(--text-muted)]">
          Data from TMDB, AniList &amp; MangaDex. Links open external sites.
        </div>
      )}
    </aside>
  );
}
