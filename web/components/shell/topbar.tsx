"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Search, User as UserIcon, LogIn } from "lucide-react";
import Link from "next/link";
import { SearchInput } from "@/components/ui-fx/input";
import { Brand } from "./brand";
import type { Profile } from "@/lib/auth";

export function Topbar({ profile }: { profile: Profile | null }) {
  const router = useRouter();
  const [q, setQ] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (query) router.push(`/search?q=${encodeURIComponent(query)}`);
  }

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--border)] bg-[var(--bg-base)]/80 px-4 py-3 backdrop-blur-xl md:px-6">
      <div className="md:hidden">
        <Brand compact />
      </div>
      <form onSubmit={onSubmit} className="mx-auto w-full max-w-xl">
        <SearchInput
          icon={<Search className="size-4" />}
          placeholder="Search movies, series, anime, manga..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search"
        />
      </form>
      {profile ? (
        <Link
          href="/settings"
          className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--border)] bg-[var(--glass)] text-sm font-bold text-[var(--text)] transition-colors hover:border-[var(--accent)]"
          aria-label="Profile and settings"
          title={profile.username ?? "Profile"}
        >
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" className="size-full object-cover" />
          ) : profile.username ? (
            profile.username.charAt(0).toUpperCase()
          ) : (
            <UserIcon className="size-4" />
          )}
        </Link>
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
