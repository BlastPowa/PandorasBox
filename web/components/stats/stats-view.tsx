"use client";

import { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import type { ReelItem, ReelItemType } from "@core/storage/schema";
import { getStatusColor, getStatusLabel } from "@core/utils/formatters";
import { useLibrary } from "@/lib/library/use-library";
import { GlassCard } from "@/components/ui-fx/glass-card";
import { EmptyState } from "@/components/ui-fx/feedback";
import { Button } from "@/components/ui-fx/button";
import { BarChart3 } from "lucide-react";

const GROUPS: { key: ReelItemType[]; label: string; unit: "episodes" | "chapters"; minutes: number }[] = [
  { key: ["anime"], label: "Anime", unit: "episodes", minutes: 24 },
  { key: ["series"], label: "TV & Series", unit: "episodes", minutes: 30 },
  { key: ["movie"], label: "Movies", unit: "episodes", minutes: 100 },
  { key: ["manga", "manhwa"], label: "Manga & Manhwa", unit: "chapters", minutes: 0 },
];

export function StatsView({ username }: { username: string | null }) {
  const { items, signedIn, loading } = useLibrary();

  const recent = useMemo(
    () =>
      items
        .slice()
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 6),
    [items]
  );

  const topGenres = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of items) for (const g of i.genres) m.set(g, (m.get(g) ?? 0) + 1);
    return Array.from(m.entries()).map(([genre, count]) => ({ genre, count })).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [items]);

  if (!signedIn) {
    return (
      <EmptyState
        icon={<BarChart3 className="size-10" />}
        title="Your stats, all in one place"
        description="Sign in to see days watched, mean score, episode counts and per-type breakdowns across everything you track."
        action={<Button asChild><Link href="/login?next=/stats">Sign in</Link></Button>}
      />
    );
  }
  if (loading) return <div className="skeleton h-96 w-full rounded-[var(--radius-lg)]" />;

  return (
    <div className="space-y-6">
      <RankCard username={username} total={items.length} completed={items.filter((i) => i.status === "completed").length} />


      <div className="grid gap-4 lg:grid-cols-2">
        {GROUPS.map((g) => (
          <StatBlock key={g.label} items={items.filter((i) => g.key.includes(i.type))} group={g} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <GlassCard macDots title="Top Genres">
          <div className="space-y-2.5 p-4">
            {topGenres.length === 0 && <p className="text-sm text-[var(--text-muted)]">Add titles to see genres.</p>}
            {topGenres.map((g) => {
              const max = topGenres[0].count || 1;
              return (
                <div key={g.genre} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 truncate text-sm">{g.genre}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
                    <div className="h-full rounded-full bg-[linear-gradient(120deg,var(--accent),var(--accent-2))]" style={{ width: `${(g.count / max) * 100}%` }} />
                  </div>
                  <span className="w-6 text-right font-mono text-xs text-[var(--text-muted)]">{g.count}</span>
                </div>
              );
            })}
          </div>
        </GlassCard>

        <GlassCard macDots title="Last Updates">
          <div className="divide-y divide-[var(--border)]">
            {recent.length === 0 && <p className="p-4 text-sm text-[var(--text-muted)]">No updates yet.</p>}
            {recent.map((item) => (
              <Link
                key={item.id}
                href={`/title/${item.type}/${item.source}/${item.anilistId ?? item.tmdbId ?? item.mangadexId}`}
                className="flex items-center gap-3 p-3 transition-colors hover:bg-[var(--glass)]"
              >
                <div className="relative h-12 w-8 shrink-0 overflow-hidden rounded-[4px] bg-[var(--bg-elevated)]">
                  {item.posterUrl && <Image src={item.posterUrl} alt="" fill sizes="32px" className="object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{item.title}</div>
                  <div className="text-xs" style={{ color: getStatusColor(item.status) }}>
                    {getStatusLabel(item.status)}
                    {item.rating ? ` · ${item.rating}/10` : ""}
                  </div>
                </div>
                <span className="shrink-0 font-mono text-[10px] text-[var(--text-muted)]">
                  {new Date(item.updatedAt).toLocaleDateString()}
                </span>
              </Link>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

const RANKS = [
  { min: 0, name: "Newcomer" },
  { min: 5, name: "Collector" },
  { min: 20, name: "Curator" },
  { min: 50, name: "Archivist" },
  { min: 120, name: "Connoisseur" },
  { min: 300, name: "Box Keeper" },
];

function RankCard({ username, total, completed }: { username: string | null; total: number; completed: number }) {
  const idx = RANKS.reduce((acc, r, i) => (total >= r.min ? i : acc), 0);
  const current = RANKS[idx];
  const next = RANKS[idx + 1] ?? null;
  const progress = next ? Math.min(100, ((total - current.min) / (next.min - current.min)) * 100) : 100;

  return (
    <div className="fx-rank-card glass-strong flex flex-col gap-4 rounded-[var(--radius-xl)] p-5 sm:flex-row sm:items-center">
      <div className="grid size-16 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] font-display text-2xl font-bold text-[#0a0a0f]">
        {(username ?? "U").charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <h1 className="truncate font-display text-2xl font-bold">{username ?? "Your profile"}</h1>
        </div>
        <p className="mt-0.5 text-sm">
          <span className="font-semibold text-gradient">{current.name}</span>
          <span className="text-[var(--text-muted)]"> · {total} tracked · {completed} completed</span>
        </p>
        <div className="mt-3">
          <div className="h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
            <div className="h-full rounded-full bg-[linear-gradient(120deg,var(--accent),var(--gold))]" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1 font-mono text-[10px] text-[var(--text-muted)]">
            {next ? `${next.min - total} to ${next.name}` : "Max rank reached"}
          </p>
        </div>
      </div>
    </div>
  );
}

function StatBlock({
  items,
  group,
}: {
  items: ReelItem[];
  group: { label: string; unit: "episodes" | "chapters"; minutes: number };
}) {
  const total = items.length;
  const rated = items.filter((i) => i.rating && i.rating > 0);
  const mean = rated.length > 0 ? rated.reduce((s, i) => s + (i.rating ?? 0), 0) / rated.length : 0;
  const units = items.reduce((s, i) => {
    if (group.unit === "chapters") return s + (i.status === "completed" ? i.totalChapters ?? i.progress.currentChapter ?? 0 : i.progress.currentChapter ?? 0);
    return s + (i.status === "completed" ? i.totalEpisodes ?? i.progress.currentEpisode ?? 0 : i.progress.currentEpisode ?? 0);
  }, 0);
  const days = group.minutes > 0 ? (group.unit === "episodes" ? (units * group.minutes) / 60 / 24 : 0) : 0;
  const byStatus = new Map<string, number>();
  for (const i of items) byStatus.set(i.status, (byStatus.get(i.status) ?? 0) + 1);

  return (
    <GlassCard macDots title={`${group.label} Stats`}>
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="text-[var(--text-secondary)]">
            {group.minutes > 0 ? `Days: ${days.toFixed(1)}` : `Titles: ${total}`}
          </span>
          <span className="text-[var(--text-secondary)]">Mean Score: <span className="font-mono font-semibold text-[var(--gold)]">{mean.toFixed(2)}</span></span>
        </div>
        {/* status bar */}
        <div className="mb-3 flex h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
          {Array.from(byStatus.entries()).map(([status, n]) => (
            <div key={status} style={{ width: `${(n / (total || 1)) * 100}%`, background: getStatusColor(status as ReelItem["status"]) }} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          {(["watching", "reading", "completed", "on_hold", "dropped", "planned"] as ReelItem["status"][]).map((s) => (
            byStatus.get(s) ? (
              <div key={s} className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                  <span className="size-2 rounded-full" style={{ background: getStatusColor(s) }} /> {getStatusLabel(s)}
                </span>
                <span className="font-mono">{byStatus.get(s)}</span>
              </div>
            ) : null
          ))}
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-muted)]">Total</span>
            <span className="font-mono">{total}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-muted)]">{group.unit === "chapters" ? "Chapters" : "Episodes"}</span>
            <span className="font-mono">{units}</span>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
