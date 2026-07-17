"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import { Search, User as UserIcon, LogIn, Library, Settings, LogOut, ChevronDown, X } from "lucide-react";
import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Dialog from "@radix-ui/react-dialog";
import { SearchInput } from "@/components/ui-fx/input";
import { Brand } from "./brand";
import type { Profile } from "@/lib/auth";
import { NotificationBell } from "@/components/social/notification-bell";

export function Topbar({ profile }: { profile: Profile | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const cinematic = pathname === "/";

  useEffect(() => {
    if (!cinematic) return;
    const onScroll = () => setScrolled(window.scrollY > 48);
    queueMicrotask(onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [cinematic]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (query) {
      setSearchOpen(false);
      router.push(`/search?q=${encodeURIComponent(query)}`);
    }
  }

  return (
    <header className={`${cinematic ? "fixed left-0 right-0 top-0 md:left-20" : "sticky top-0"} z-30 flex items-center gap-2 pb-2.5 pl-[max(0.75rem,var(--safe-left))] pr-[max(0.75rem,var(--safe-right))] pt-[calc(var(--safe-top)+0.625rem)] transition-[background-color,border-color,backdrop-filter] duration-300 md:gap-3 md:px-6 md:py-3 ${!cinematic || scrolled ? "border-b border-[var(--border)] bg-[var(--bg-base)]/88 backdrop-blur-xl" : "border-b border-transparent bg-transparent"}`}>
      <div className="grid size-11 shrink-0 place-items-center md:hidden">
        <Brand compact className="size-11 justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]" />
      </div>
      <form onSubmit={onSubmit} className="mx-auto min-w-0 flex-1 max-w-xl overflow-hidden rounded-full max-[359px]:hidden">
        <SearchInput
          icon={<Search className="size-4" />}
          placeholder="Search movies, series, anime, manga..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search"
        />
      </form>
      <Dialog.Root open={searchOpen} onOpenChange={setSearchOpen}>
        <Dialog.Trigger asChild>
          <button type="button" className="grid size-11 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--glass)] text-[var(--text-secondary)] min-[360px]:hidden" aria-label="Open search">
            <Search className="size-5" />
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm" />
          <Dialog.Content className="fixed inset-0 z-50 flex flex-col bg-[var(--bg-base)] pb-[max(1rem,var(--safe-bottom))] pl-[max(1rem,var(--safe-left))] pr-[max(1rem,var(--safe-right))] pt-[calc(var(--safe-top)+1rem)]">
            <div className="flex items-center justify-between gap-3">
              <Dialog.Title className="font-display text-xl font-bold">Search PBox</Dialog.Title>
              <Dialog.Close className="grid size-11 place-items-center rounded-full bg-[var(--glass)]" aria-label="Close search"><X className="size-5" /></Dialog.Close>
            </div>
            <Dialog.Description className="mt-1 text-sm text-[var(--text-muted)]">Find movies, series, anime, manga, comics, and games.</Dialog.Description>
            <form onSubmit={onSubmit} className="mt-5 overflow-hidden rounded-full">
              <SearchInput autoFocus icon={<Search className="size-4" />} placeholder="Search PBox" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search PBox" />
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      {profile ? (
        <><NotificationBell /><DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              className="flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--glass)] p-1 text-sm font-bold text-[var(--text)] transition-colors hover:border-[var(--accent)] sm:pr-2"
              aria-label="Profile menu"
              title={profile.username ?? "Profile"}
            >
              <span className="flex size-8 items-center justify-center overflow-hidden rounded-full bg-[var(--bg-surface)]">
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatar_url} alt="" className="size-full object-cover" />
                ) : profile.username ? (
                  profile.username.charAt(0).toUpperCase()
                ) : (
                  <UserIcon className="size-4" />
                )}
              </span>
              <ChevronDown className="hidden size-3.5 text-[var(--text-muted)] sm:block" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={8}
              className="z-50 min-w-[190px] overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-elevated)] p-1 shadow-2xl"
            >
              {profile.username && (
                <DropdownMenu.Item asChild>
                  <Link
                    href={`/profile/${profile.username}`}
                    className="flex cursor-pointer items-center gap-2.5 rounded-[8px] px-3 py-2 text-sm text-[var(--text-secondary)] outline-none transition-colors focus:bg-[var(--glass)] focus:text-[var(--text)]"
                  >
                    <UserIcon className="size-4" /> Profile
                  </Link>
                </DropdownMenu.Item>
              )}
              <DropdownMenu.Item asChild>
                <Link
                  href="/library"
                  className="flex cursor-pointer items-center gap-2.5 rounded-[8px] px-3 py-2 text-sm text-[var(--text-secondary)] outline-none transition-colors focus:bg-[var(--glass)] focus:text-[var(--text)]"
                >
                  <Library className="size-4" /> My Library
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <Link
                  href="/settings"
                  className="flex cursor-pointer items-center gap-2.5 rounded-[8px] px-3 py-2 text-sm text-[var(--text-secondary)] outline-none transition-colors focus:bg-[var(--glass)] focus:text-[var(--text)]"
                >
                  <Settings className="size-4" /> Settings
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="my-1 h-px bg-[var(--border)]" />
              <DropdownMenu.Item asChild>
                <form action="/auth/signout" method="post" className="contents">
                  <button
                    type="submit"
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-[8px] px-3 py-2 text-left text-sm text-[var(--dropped)] outline-none transition-colors focus:bg-[rgba(239,68,68,0.12)]"
                  >
                    <LogOut className="size-4" /> Sign out
                  </button>
                </form>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root></>
      ) : (
        <Link
          href="/login"
          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[linear-gradient(120deg,var(--accent),var(--accent-2))] px-3 text-sm font-semibold text-[#0a0a0f] sm:px-4"
        >
          <LogIn className="size-4" />
          <span className="hidden sm:inline">Sign in</span>
        </Link>
      )}
    </header>
  );
}
