"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import { Search, User as UserIcon, LogIn, Library, Settings, LogOut, ChevronDown } from "lucide-react";
import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { SearchInput } from "@/components/ui-fx/input";
import { Brand } from "./brand";
import type { Profile } from "@/lib/auth";

export function Topbar({ profile }: { profile: Profile | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState("");
  const [scrolled, setScrolled] = useState(false);
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
    if (query) router.push(`/search?q=${encodeURIComponent(query)}`);
  }

  return (
    <header className={`${cinematic ? "fixed left-0 right-0 top-0 md:left-20" : "sticky top-0"} z-30 flex items-center gap-2 px-3 py-2.5 transition-[background-color,border-color,backdrop-filter] duration-300 md:gap-3 md:px-6 md:py-3 ${!cinematic || scrolled ? "border-b border-[var(--border)] bg-[var(--bg-base)]/88 backdrop-blur-xl" : "border-b border-transparent bg-transparent"}`}>
      <div className="shrink-0 md:hidden">
        <Brand compact />
      </div>
      <form onSubmit={onSubmit} className="mx-auto min-w-0 flex-1 max-w-xl overflow-hidden rounded-full">
        <SearchInput
          icon={<Search className="size-4" />}
          placeholder="Search movies, series, anime, manga..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search"
        />
      </form>
      {profile ? (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--glass)] p-1 pr-2 text-sm font-bold text-[var(--text)] transition-colors hover:border-[var(--accent)]"
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
              <ChevronDown className="size-3.5 text-[var(--text-muted)]" />
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
        </DropdownMenu.Root>
      ) : (
        <Link
          href="/login"
          className="flex shrink-0 items-center gap-2 rounded-full bg-[linear-gradient(120deg,var(--accent),var(--accent-2))] px-4 py-2 text-sm font-semibold text-[#0a0a0f]"
        >
          <LogIn className="size-4" />
          <span className="hidden sm:inline">Sign in</span>
        </Link>
      )}
    </header>
  );
}
