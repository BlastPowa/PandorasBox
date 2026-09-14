"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Search, User as UserIcon, LogIn, Library, Settings, LogOut, ChevronDown, X } from "lucide-react";
import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Dialog from "@radix-ui/react-dialog";
import { SearchInput } from "@/components/ui-fx/input";
import { Brand } from "./brand";
import type { Profile } from "@/lib/auth";
import { NotificationBell } from "@/components/social/notification-bell";
import { BackButton } from "@/components/shell/back-button";

function fallbackForPath(pathname: string) {
  if (pathname.startsWith("/messages/")) return "/messages";
  if (pathname.startsWith("/collections/")) return "/collections";
  if (pathname.startsWith("/browse/")) return "/browse";
  if (pathname.startsWith("/game/")) return "/gamers";
  if (pathname.startsWith("/comic/")) return "/comics";
  if (pathname.startsWith("/profile/")) return "/friends";
  if (pathname.startsWith("/title/")) return "/browse";
  return "/";
}

function pageAlreadyHasBackControl(pathname: string) {
  return ["/title/", "/game/", "/comic/", "/person/", "/profile/", "/browse/", "/collections/", "/c/", "/messages/"].some((prefix) => pathname.startsWith(prefix));
}

export function Topbar({ profile }: { profile: Profile | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const showShellBack = pathname !== "/" && !pageAlreadyHasBackControl(pathname);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    setSearchOpen(false);
    router.push(`/search?q=${encodeURIComponent(query)}`);
  }

  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-[var(--border)] bg-[var(--nav-surface)] pb-2.5 pl-[max(0.75rem,var(--safe-left))] pr-[max(0.75rem,var(--safe-right))] pt-[calc(var(--safe-top)+0.625rem)] backdrop-blur-xl md:gap-3 md:px-6 md:py-3">
      {showShellBack ? (
        <BackButton
          fallbackHref={fallbackForPath(pathname)}
          label="Go back"
          iconOnly
          className="grid size-11 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] shadow-sm transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        />
      ) : (
        <div className="grid size-11 shrink-0 place-items-center md:hidden">
          <Brand compact className="size-11 justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]" />
        </div>
      )}

      <form onSubmit={onSubmit} className="mx-auto min-w-0 flex-1 max-w-2xl max-[359px]:hidden">
        <SearchInput
          icon={<Search className="size-4" />}
          placeholder="Search films, shows, anime, manga, comics and games"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search"
        />
      </form>

      <Dialog.Root open={searchOpen} onOpenChange={setSearchOpen}>
        <Dialog.Trigger asChild>
          <button type="button" className="grid size-11 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] shadow-sm min-[360px]:hidden" aria-label="Open search">
            <Search className="size-5" />
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm" />
          <Dialog.Content className="fixed inset-x-3 top-[calc(var(--safe-top)+0.75rem)] z-50 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-[0_24px_80px_rgb(0_0_0_/_0.18)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Dialog.Title className="text-base font-bold">Search PBox</Dialog.Title>
                <Dialog.Description className="mt-0.5 text-xs text-[var(--text-muted)]">One search across every media type.</Dialog.Description>
              </div>
              <Dialog.Close className="grid size-10 place-items-center rounded-xl bg-[var(--bg-elevated)]" aria-label="Close search"><X className="size-5" /></Dialog.Close>
            </div>
            <form onSubmit={onSubmit} className="mt-4">
              <SearchInput autoFocus icon={<Search className="size-4" />} placeholder="What are you looking for?" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search PBox" />
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {profile ? (
        <>
          <NotificationBell />
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-1 text-sm font-bold text-[var(--text)] shadow-sm transition-colors hover:bg-[var(--bg-elevated)] sm:pr-2" aria-label="Profile menu" title={profile.username ?? "Profile"}>
                <span className="flex size-8 items-center justify-center overflow-hidden rounded-lg bg-[rgb(var(--accent-rgb)/0.12)] text-[var(--accent)]">
                  {profile.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.avatar_url} alt="" className="size-full object-cover" />
                  ) : profile.username ? profile.username.charAt(0).toUpperCase() : <UserIcon className="size-4" />}
                </span>
                <ChevronDown className="hidden size-3.5 text-[var(--text-muted)] sm:block" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content align="end" sideOffset={8} className="z-50 min-w-[200px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-1.5 shadow-[0_18px_50px_rgb(0_0_0_/_0.14)]">
                {profile.username && <DropdownMenu.Item asChild><Link href={`/profile/${profile.username}`} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] outline-none focus:bg-[var(--bg-elevated)] focus:text-[var(--text)]"><UserIcon className="size-4" /> Profile</Link></DropdownMenu.Item>}
                <DropdownMenu.Item asChild><Link href="/library" className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] outline-none focus:bg-[var(--bg-elevated)] focus:text-[var(--text)]"><Library className="size-4" /> Library</Link></DropdownMenu.Item>
                <DropdownMenu.Item asChild><Link href="/settings" className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] outline-none focus:bg-[var(--bg-elevated)] focus:text-[var(--text)]"><Settings className="size-4" /> Settings</Link></DropdownMenu.Item>
                <DropdownMenu.Separator className="my-1 h-px bg-[var(--border)]" />
                <DropdownMenu.Item asChild><form action="/auth/signout" method="post" className="contents"><button type="submit" className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-[var(--dropped)] outline-none focus:bg-[rgb(239_68_68_/_0.08)]"><LogOut className="size-4" /> Sign out</button></form></DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </>
      ) : (
        <Link href="/login" className="flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 sm:px-4">
          <LogIn className="size-4" /><span className="hidden sm:inline">Sign in</span>
        </Link>
      )}
    </header>
  );
}
