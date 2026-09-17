"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import type { ReelItem, ReelItemStatus, ReelItemType } from "@core/storage/schema";
import { getStatusColor, getStatusLabel } from "@core/utils/formatters";
import {
  Activity,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Film,
  LibraryBig,
  ListTodo,
  Target,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react";
import { useLibrary } from "@/lib/library/use-library";
import { libraryItemHref } from "@/lib/library/item-href";
import { EmptyState } from "@/components/ui-fx/feedback";
import { Button } from "@/components/ui-fx/button";

type MediaGroup = {
  key: ReelItemType[];
  label: string;
  shortLabel: string;
  unit: "episodes" | "chapters" | "movies";
  minutes: number;
};

const GROUPS: MediaGroup[] = [
  { key: ["movie"], label: "Movies", shortLabel: "Movies", unit: "movies", minutes: 100 },
  { key: ["series"], label: "TV & Series", shortLabel: "TV", unit: "episodes", minutes: 30 },
  { key: ["anime"], label: "Anime", shortLabel: "Anime", unit: "episodes", minutes: 24 },
  { key: ["manga", "manhwa", "comic"], label: "Manga & Comics", shortLabel: "Reading", unit: "chapters", minutes: 0 },
];

const STATUS_ORDER: ReelItemStatus[] = ["watching", "rewatching", "reading", "completed", "on_hold", "planned", "dropped"];
const MEDIA_COLOURS = ["var(--accent)", "var(--accent-2)", "var(--gold)", "var(--completed)"];

export function StatsView({ username, avatarUrl }: { username: string | null; avatarUrl?: string | null }) {
  const { items, signedIn, loading } = useLibrary();
  const stats = useMemo(() => buildStats(items), [items]);

  if (!signedIn) {
    return (
      <EmptyState
        icon={<BarChart3 className="size-10" />}
        title="Your stats, all in one place"
        description="Sign in to see your watch time, completion rate, ratings, streaks and library trends across everything you track."
        action={<Button asChild><Link href="/login?next=/stats">Sign in</Link></Button>}
      />
    );
  }

  if (loading) return <div className="skeleton h-[640px] w-full rounded-[var(--radius-xl)]" />;

  return (
    <div className="space-y-5 pb-4 sm:space-y-6">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard icon={<LibraryBig className="size-4" />} label="Tracked" value={String(stats.total)} detail={`${stats.active} active now`} />
        <KpiCard icon={<CheckCircle2 className="size-4" />} label="Completed" value={String(stats.completed)} detail={`${stats.completionRate.toFixed(0)}% completion`} />
        <KpiCard icon={<Star className="size-4" />} label="Average rating" value={stats.meanRating ? stats.meanRating.toFixed(1) : "—"} detail={stats.ratedCount ? `${stats.ratedCount} rated titles` : "No ratings yet"} />
        <KpiCard icon={<Clock3 className="size-4" />} label="Watch time" value={formatWatchTime(stats.watchMinutes)} detail={`${stats.episodesSeen.toLocaleString()} episodes logged`} />
      </section>

      <RankCard
        username={username}
        avatarUrl={avatarUrl ?? null}
        total={stats.total}
        completed={stats.completed}
        progress={stats.completionRate}
      />

      <section className="pb-uiverse-card pb-aura rounded-[24px] p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Actionable insights</p>
            <h2 className="mt-1 font-display text-xl font-extrabold sm:text-2xl">What to pick up next</h2>
          </div>
          <Link href="/library" className="text-xs font-bold text-[var(--accent)] transition hover:opacity-75">Open library →</Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <InsightCard icon={<Target className="size-4" />} label="Near the finish" value={stats.nearlyDone.length} detail={stats.nearlyDone[0] ? `${stats.nearlyDone[0].title} is ${Math.round(stats.nearlyDone[0].progress.percentComplete)}% complete` : "No titles above 75% yet"} />
          <InsightCard icon={<Activity className="size-4" />} label="Current rotation" value={stats.active} detail={stats.nextFocus ? `${stats.nextFocus.title} is your furthest active title` : "Start tracking something in progress"} />
          <InsightCard icon={<ListTodo className="size-4" />} label="Planned backlog" value={stats.planned} detail={stats.planned ? "Titles waiting in your planned list" : "Your planned list is clear"} />
          <InsightCard icon={<Star className="size-4" />} label="Needs a rating" value={stats.unratedCompleted} detail={stats.unratedCompleted ? "Completed titles without a score" : "Every completed title is rated"} />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.08fr_.92fr]">
        <article className="pb-uiverse-card pb-uiverse-card--feature overflow-hidden rounded-[26px] p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Library pulse</p>
              <h2 className="mt-1 font-display text-xl font-extrabold sm:text-2xl">Completion & status</h2>
              <p className="mt-1 max-w-xl text-xs leading-relaxed text-[var(--text-muted)] sm:text-sm">How much of your collection you have finished and what you are currently keeping in rotation.</p>
            </div>
            <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--glass)] px-3 text-xs font-semibold text-[var(--text-secondary)]">
              <Activity className="size-3.5 text-[var(--accent)]" /> {stats.active} active
            </span>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-[210px_1fr] md:items-center">
            <CompletionRing value={stats.completionRate} completed={stats.completed} total={stats.total} />
            <div className="space-y-3">
              {stats.statuses.map((row) => (
                <div key={row.status}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                    <span className="flex min-w-0 items-center gap-2 font-semibold text-[var(--text-secondary)]">
                      <span className="size-2 shrink-0 rounded-full" style={{ background: row.colour }} />
                      <span className="truncate">{getStatusLabel(row.status)}</span>
                    </span>
                    <span className="font-mono text-[var(--text-muted)]">{row.count}</span>
                  </div>
                  <div className="pb-uiverse-progress h-2 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--border)_55%,transparent)]">
                    <div
                      className="h-full rounded-full transition-[width] duration-700 motion-reduce:transition-none"
                      style={{ width: `${row.percent}%`, background: row.colour }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="pb-uiverse-card pb-uiverse-card--feature overflow-hidden rounded-[26px] p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Collection mix</p>
              <h2 className="mt-1 font-display text-xl font-extrabold sm:text-2xl">What you track</h2>
            </div>
            <Film className="size-5 text-[var(--text-muted)]" />
          </div>

          <div className="mt-5 grid gap-5 min-[440px]:grid-cols-[190px_1fr] min-[440px]:items-center">
            <DonutChart rows={stats.mediaGroups} total={stats.total} />
            <div className="space-y-2.5">
              {stats.mediaGroups.map((group, index) => (
                <div key={group.label} className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--glass)] px-3 py-2.5">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: MEDIA_COLOURS[index] }} />
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold text-[var(--text-secondary)]">{group.label}</span>
                  <span className="font-mono text-sm font-bold">{group.count}</span>
                </div>
              ))}
            </div>
          </div>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="pb-uiverse-card pb-uiverse-card--feature rounded-[26px] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Last eight weeks</p>
              <h2 className="mt-1 font-display text-xl font-extrabold">Activity rhythm</h2>
            </div>
            <CalendarDays className="size-5 text-[var(--text-muted)]" />
          </div>
          <div className="mt-5 flex h-48 items-end gap-2 sm:gap-3" role="img" aria-label="Library activity over the last eight weeks">
            {stats.weeklyActivity.map((week) => {
              const height = stats.maxWeeklyActivity > 0 ? Math.max(10, (week.count / stats.maxWeeklyActivity) * 100) : 8;
              return (
                <div key={week.key} className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
                  <span className="font-mono text-[10px] text-[var(--text-muted)] opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">{week.count}</span>
                  <div className="flex h-36 w-full items-end overflow-hidden rounded-t-xl bg-[color-mix(in_srgb,var(--border)_45%,transparent)]">
                    <div
                      className="w-full rounded-t-xl bg-[linear-gradient(180deg,var(--accent),var(--accent-2))] shadow-[0_0_22px_rgb(var(--accent-rgb)/0.18)] transition-[height] duration-700 motion-reduce:transition-none"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span className="truncate text-[9px] font-semibold uppercase tracking-wide text-[var(--text-muted)] sm:text-[10px]">{week.label}</span>
                </div>
              );
            })}
          </div>
        </article>

        <article className="pb-uiverse-card pb-uiverse-card--feature rounded-[26px] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Your scoring habits</p>
              <h2 className="mt-1 font-display text-xl font-extrabold">Ratings spread</h2>
            </div>
            <Star className="size-5 text-[var(--gold)]" />
          </div>
          <div className="mt-5 grid grid-cols-10 items-end gap-1.5 sm:gap-2" role="img" aria-label="Rating distribution from one to ten">
            {stats.ratingDistribution.map((bucket) => {
              const height = stats.maxRatingBucket > 0 ? Math.max(bucket.count ? 12 : 4, (bucket.count / stats.maxRatingBucket) * 100) : 4;
              return (
                <div key={bucket.rating} className="group flex min-w-0 flex-col items-center gap-2">
                  <div className="flex h-36 w-full items-end rounded-xl bg-[color-mix(in_srgb,var(--border)_45%,transparent)] p-1">
                    <div
                      className="w-full rounded-lg bg-[linear-gradient(180deg,var(--gold),var(--accent))] transition-[height] duration-700 motion-reduce:transition-none"
                      style={{ height: `${height}%`, opacity: bucket.count ? 1 : 0.22 }}
                      title={`${bucket.rating}/10 · ${bucket.count} title${bucket.count === 1 ? "" : "s"}`}
                    />
                  </div>
                  <span className="font-mono text-[10px] text-[var(--text-muted)]">{bucket.rating}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <MiniMetric label="Highest" value={stats.highestRating ? `${stats.highestRating.toFixed(1)}/10` : "—"} />
            <MiniMetric label="Rated" value={String(stats.ratedCount)} />
            <MiniMetric label="Mean" value={stats.meanRating ? stats.meanRating.toFixed(2) : "—"} />
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr_.9fr]">
        <article className="pb-uiverse-card pb-uiverse-card--feature rounded-[26px] p-4 sm:p-5 xl:col-span-2">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Time by medium</p>
              <h2 className="mt-1 font-display text-xl font-extrabold">Your media breakdown</h2>
            </div>
            <span className="text-xs text-[var(--text-muted)]">Estimated from tracked progress</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {stats.mediaGroups.map((group, index) => (
              <MediaBreakdownCard key={group.label} group={group} colour={MEDIA_COLOURS[index]} />
            ))}
          </div>
        </article>

        <article className="pb-uiverse-card pb-uiverse-card--feature rounded-[26px] p-4 sm:p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Momentum</p>
          <h2 className="mt-1 font-display text-xl font-extrabold">Milestones</h2>
          <div className="mt-4 space-y-3">
            <Milestone icon={<Sparkles className="size-4" />} label="Recent streak" value={`${stats.recentStreak} day${stats.recentStreak === 1 ? "" : "s"}`} note="Consecutive activity days" />
            <Milestone icon={<Trophy className="size-4" />} label="Most tracked" value={stats.topMedium?.label ?? "—"} note={stats.topMedium ? `${stats.topMedium.count} titles` : "Build your library"} />
            <Milestone icon={<BookOpen className="size-4" />} label="Reading progress" value={stats.chaptersRead.toLocaleString()} note="Chapters / issues logged" />
            <Milestone icon={<Film className="size-4" />} label="Screen progress" value={stats.episodesSeen.toLocaleString()} note="Episodes logged" />
          </div>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_390px]">
        <article className="pb-uiverse-card pb-uiverse-card--feature rounded-[26px] p-4 sm:p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Taste profile</p>
          <h2 className="mt-1 font-display text-xl font-extrabold">Top genres</h2>
          <div className="mt-4 space-y-3">
            {stats.topGenres.length === 0 && <p className="text-sm text-[var(--text-muted)]">Add titles with genre data to build your taste profile.</p>}
            {stats.topGenres.map((genre, index) => (
              <div key={genre.genre} className="grid grid-cols-[minmax(0,120px)_1fr_auto] items-center gap-3 sm:grid-cols-[160px_1fr_auto]">
                <span className="truncate text-xs font-semibold text-[var(--text-secondary)]">{index + 1}. {genre.genre}</span>
                <div className="h-2.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--border)_55%,transparent)]">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--accent-2))] transition-[width] duration-700 motion-reduce:transition-none"
                    style={{ width: `${genre.percent}%` }}
                  />
                </div>
                <span className="w-7 text-right font-mono text-[10px] text-[var(--text-muted)]">{genre.count}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="pb-uiverse-card pb-uiverse-card--feature overflow-hidden rounded-[26px]">
          <div className="border-b border-[var(--border)] px-4 py-4 sm:px-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Latest changes</p>
            <h2 className="mt-1 font-display text-xl font-extrabold">Recent activity</h2>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {stats.recent.length === 0 && <p className="p-5 text-sm text-[var(--text-muted)]">No updates yet.</p>}
            {stats.recent.map((item) => (
              <Link key={item.id} href={libraryItemHref(item)} className="flex min-h-[72px] items-center gap-3 px-4 py-3 transition hover:bg-[var(--glass)] sm:px-5">
                <div className="relative h-12 w-8 shrink-0 overflow-hidden rounded-lg bg-[var(--bg-elevated)]">
                  {item.posterUrl && <Image src={item.posterUrl} alt="" fill sizes="32px" className="object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{item.title}</p>
                  <p className="mt-0.5 text-[10px] font-semibold" style={{ color: getStatusColor(item.status) }}>
                    {getStatusLabel(item.status)}{item.rating ? ` · ${item.rating}/10` : ""}
                  </p>
                </div>
                <time className="shrink-0 font-mono text-[9px] text-[var(--text-muted)] sm:text-[10px]">{formatShortDate(item.updatedAt)}</time>
              </Link>
            ))}
          </div>
        </article>
      </section>
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

function RankCard({ username, avatarUrl, total, completed, progress }: { username: string | null; avatarUrl: string | null; total: number; completed: number; progress: number }) {
  const rankIndex = RANKS.reduce((acc, rank, index) => (total >= rank.min ? index : acc), 0);
  const current = RANKS[rankIndex];
  const next = RANKS[rankIndex + 1] ?? null;
  const rankProgress = next ? Math.min(100, ((total - current.min) / (next.min - current.min)) * 100) : 100;

  return (
    <section className="fx-rank-card pb-uiverse-card pb-aura relative overflow-hidden rounded-[22px] p-3.5 sm:p-4">
      <div className="pointer-events-none absolute -right-12 -top-20 size-44 rounded-full bg-[rgb(var(--accent-rgb)/0.10)] blur-3xl" />
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center">
        {avatarUrl ? (
          <div className="size-14 shrink-0 overflow-hidden rounded-full border border-[var(--border)] shadow-lg sm:size-16">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatarUrl} alt="" className="size-full object-cover" />
          </div>
        ) : (
          <div className="grid size-14 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] font-display text-xl font-bold text-white shadow-lg sm:size-16 sm:text-2xl">
            {(username ?? "U").charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
            <h2 className="truncate font-display text-lg font-extrabold sm:text-xl">{username ?? "Your profile"}</h2>
            <span className="mb-0.5 rounded-full border border-[rgb(var(--accent-rgb)/0.24)] bg-[rgb(var(--accent-rgb)/0.1)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">{current.name}</span>
          </div>
          <p className="mt-1 text-xs text-[var(--text-muted)] sm:text-sm">{total} tracked · {completed} completed · {progress.toFixed(0)}% completion</p>
          <div className="mt-3 max-w-2xl">
            <div className="flex items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              <span>{current.name}</span>
              <span>{next ? `${Math.max(0, next.min - total)} to ${next.name}` : "Top rank"}</span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--border)_55%,transparent)]">
              <div className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--gold))] transition-[width] duration-700 motion-reduce:transition-none" style={{ width: `${rankProgress}%` }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function KpiCard({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return (
    <article className="pb-uiverse-card pb-uiverse-card--stat rounded-[22px] p-3.5 sm:p-4">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        <span className="grid size-8 place-items-center rounded-xl border border-[var(--border)] bg-[var(--glass)] text-[var(--accent)]">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{value}</p>
      <p className="mt-1 truncate text-[10px] text-[var(--text-muted)] sm:text-xs">{detail}</p>
    </article>
  );
}

function InsightCard({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: number; detail: string }) {
  return (
    <article className="rounded-[20px] border border-[var(--border)] bg-[var(--glass)] p-3.5 transition hover:border-[rgb(var(--accent-rgb)/0.28)] sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="grid size-9 place-items-center rounded-xl border border-[rgb(var(--accent-rgb)/0.16)] bg-[rgb(var(--accent-rgb)/0.08)] text-[var(--accent)]">{icon}</span>
        <strong className="font-display text-2xl font-extrabold">{value}</strong>
      </div>
      <p className="mt-3 text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-secondary)]">{label}</p>
      <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-[var(--text-muted)]">{detail}</p>
    </article>
  );
}

function CompletionRing({ value, completed, total }: { value: number; completed: number; total: number }) {
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  const dash = (Math.min(100, Math.max(0, value)) / 100) * circumference;
  return (
    <div className="mx-auto grid w-full max-w-[210px] place-items-center md:mx-0">
      <div className="relative aspect-square w-full">
        <svg viewBox="0 0 160 160" className="size-full -rotate-90" aria-hidden="true">
          <circle cx="80" cy="80" r={radius} fill="none" stroke="color-mix(in srgb, var(--border) 70%, transparent)" strokeWidth="13" />
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="13"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
            className="transition-[stroke-dasharray] duration-700 motion-reduce:transition-none"
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <strong className="block font-display text-3xl font-extrabold">{value.toFixed(0)}%</strong>
            <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">complete</span>
          </div>
        </div>
      </div>
      <p className="mt-1 text-center text-xs text-[var(--text-muted)]">{completed} of {total} titles finished</p>
    </div>
  );
}

function DonutChart({ rows, total }: { rows: ReturnType<typeof buildStats>["mediaGroups"]; total: number }) {
  let cursor = 0;
  const stops: string[] = [];
  rows.forEach((row, index) => {
    const next = total > 0 ? cursor + (row.count / total) * 360 : cursor;
    stops.push(`${MEDIA_COLOURS[index]} ${cursor}deg ${next}deg`);
    cursor = next;
  });

  return (
    <div className="mx-auto grid aspect-square w-full max-w-[190px] place-items-center rounded-full p-5" style={{ background: total ? `conic-gradient(${stops.join(",")})` : "color-mix(in srgb, var(--border) 65%, transparent)" }}>
      <div className="grid size-full place-items-center rounded-full border border-[var(--border)] bg-[var(--bg-surface)] text-center shadow-inner">
        <div>
          <strong className="block font-display text-3xl font-extrabold">{total}</strong>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">titles</span>
        </div>
      </div>
    </div>
  );
}

function MediaBreakdownCard({ group, colour }: { group: ReturnType<typeof buildStats>["mediaGroups"][number]; colour: string }) {
  return (
    <div className="rounded-[20px] border border-[var(--border)] bg-[var(--glass)] p-3.5 sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{group.label}</p>
          <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">{group.completed} completed · {group.count} tracked</p>
        </div>
        <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] font-mono text-sm font-bold" style={{ color: colour }}>{group.count}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-2.5">
          <span className="block text-[9px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Progress</span>
          <strong className="mt-1 block font-mono text-sm">{group.units.toLocaleString()} {group.unitLabel}</strong>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-2.5">
          <span className="block text-[9px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Time</span>
          <strong className="mt-1 block font-mono text-sm">{group.minutes > 0 ? formatWatchTime(group.minutes) : "Reading"}</strong>
        </div>
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return <span className="rounded-full border border-[var(--border)] bg-[var(--glass)] px-3 py-1.5 text-[10px] font-semibold text-[var(--text-muted)]"><strong className="mr-1 text-[var(--text-primary)]">{value}</strong>{label}</span>;
}

function Milestone({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string; note: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--glass)] p-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-[rgb(var(--accent-rgb)/0.16)] bg-[rgb(var(--accent-rgb)/0.08)] text-[var(--accent)]">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
        <p className="truncate text-sm font-bold">{value}</p>
      </div>
      <span className="hidden max-w-24 text-right text-[9px] leading-tight text-[var(--text-muted)] sm:block">{note}</span>
    </div>
  );
}

function buildStats(items: ReelItem[]) {
  const total = items.length;
  const completed = items.filter((item) => item.status === "completed").length;
  const active = items.filter((item) => ["watching", "rewatching", "reading"].includes(item.status)).length;
  const rated = items.filter((item) => typeof item.rating === "number" && item.rating > 0);
  const meanRating = rated.length ? rated.reduce((sum, item) => sum + (item.rating ?? 0), 0) / rated.length : 0;
  const highestRating = rated.length ? Math.max(...rated.map((item) => item.rating ?? 0)) : 0;

  const mediaGroups = GROUPS.map((group) => {
    const grouped = items.filter((item) => group.key.includes(item.type));
    const units = grouped.reduce((sum, item) => sum + itemUnits(item, group), 0);
    const completedCount = grouped.filter((item) => item.status === "completed").length;
    const minutes = group.unit === "movies"
      ? grouped.reduce((sum, item) => sum + Math.round(group.minutes * itemProgressRatio(item)), 0)
      : group.minutes > 0 ? units * group.minutes : 0;
    return {
      ...group,
      count: grouped.length,
      completed: completedCount,
      units,
      minutes,
      unitLabel: group.unit === "chapters" ? "chapters" : group.unit === "movies" ? "movies" : "episodes",
    };
  });

  const episodesSeen = mediaGroups.filter((group) => group.unit === "episodes").reduce((sum, group) => sum + group.units, 0);
  const chaptersRead = mediaGroups.filter((group) => group.unit === "chapters").reduce((sum, group) => sum + group.units, 0);
  const watchMinutes = mediaGroups.reduce((sum, group) => sum + group.minutes, 0);

  const statusCounts = new Map<ReelItemStatus, number>();
  items.forEach((item) => statusCounts.set(item.status, (statusCounts.get(item.status) ?? 0) + 1));
  const statuses = STATUS_ORDER
    .map((status) => ({ status, count: statusCounts.get(status) ?? 0, percent: total ? ((statusCounts.get(status) ?? 0) / total) * 100 : 0, colour: getStatusColor(status) }))
    .filter((row) => row.count > 0);

  const genreCounts = new Map<string, number>();
  items.forEach((item) => item.genres.forEach((genre) => {
    const clean = genre.trim();
    if (clean) genreCounts.set(clean, (genreCounts.get(clean) ?? 0) + 1);
  }));
  const topGenresRaw = Array.from(genreCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxGenre = topGenresRaw[0]?.[1] ?? 1;
  const topGenres = topGenresRaw.map(([genre, count]) => ({ genre, count, percent: (count / maxGenre) * 100 }));

  const ratingDistribution = Array.from({ length: 10 }, (_, index) => ({
    rating: index + 1,
    count: rated.filter((item) => Math.min(10, Math.max(1, Math.round(item.rating ?? 0))) === index + 1).length,
  }));
  const maxRatingBucket = Math.max(0, ...ratingDistribution.map((bucket) => bucket.count));
  const weeklyActivity = buildWeeklyActivity(items);
  const maxWeeklyActivity = Math.max(0, ...weeklyActivity.map((week) => week.count));
  const recent = items.slice().sort((a, b) => safeDate(b.updatedAt) - safeDate(a.updatedAt)).slice(0, 6);
  const topMedium = mediaGroups.slice().sort((a, b) => b.count - a.count)[0] ?? null;
  const nearlyDone = items
    .filter((item) => item.status !== "completed" && item.progress.percentComplete >= 75 && item.progress.percentComplete < 100)
    .sort((a, b) => b.progress.percentComplete - a.progress.percentComplete);
  const nextFocus = items
    .filter((item) => ["watching", "rewatching", "reading"].includes(item.status) && item.progress.percentComplete < 100)
    .sort((a, b) => b.progress.percentComplete - a.progress.percentComplete)[0] ?? null;
  const planned = items.filter((item) => item.status === "planned").length;
  const unratedCompleted = items.filter((item) => item.status === "completed" && !(typeof item.rating === "number" && item.rating > 0)).length;

  return {
    total,
    completed,
    active,
    completionRate: total ? (completed / total) * 100 : 0,
    ratedCount: rated.length,
    meanRating,
    highestRating,
    watchMinutes,
    episodesSeen,
    chaptersRead,
    statuses,
    mediaGroups,
    topGenres,
    ratingDistribution,
    maxRatingBucket,
    weeklyActivity,
    maxWeeklyActivity,
    recent,
    recentStreak: getRecentActivityStreak(items),
    topMedium,
    nearlyDone,
    nextFocus,
    planned,
    unratedCompleted,
  };
}

function itemUnits(item: ReelItem, group: MediaGroup) {
  if (group.unit === "movies") return item.status === "completed" ? 1 : itemProgressRatio(item);
  if (group.unit === "chapters") {
    if (item.status === "completed") return item.totalChapters ?? item.progress.totalChapters ?? item.progress.currentChapter ?? 0;
    return item.progress.currentChapter ?? 0;
  }
  if (item.status === "completed") return item.totalEpisodes ?? item.progress.totalEpisodes ?? item.progress.currentEpisode ?? 0;
  return item.progress.currentEpisode ?? 0;
}

function itemProgressRatio(item: ReelItem) {
  if (item.status === "completed") return 1;
  const stored = Number.isFinite(item.progress.percentComplete) ? item.progress.percentComplete : 0;
  if (stored > 1) return Math.min(1, stored / 100);
  if (stored > 0) return Math.min(1, stored);
  return item.status === "watching" || item.status === "rewatching" ? 0.25 : 0;
}

function buildWeeklyActivity(items: ReelItem[]) {
  const now = new Date();
  const startOfCurrentWeek = new Date(now);
  const day = (startOfCurrentWeek.getDay() + 6) % 7;
  startOfCurrentWeek.setHours(0, 0, 0, 0);
  startOfCurrentWeek.setDate(startOfCurrentWeek.getDate() - day);

  return Array.from({ length: 8 }, (_, index) => {
    const offset = 7 - index;
    const start = new Date(startOfCurrentWeek);
    start.setDate(start.getDate() - offset * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const count = items.filter((item) => {
      const time = safeDate(item.updatedAt);
      return time >= start.getTime() && time < end.getTime();
    }).length;
    return {
      key: start.toISOString(),
      label: start.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      count,
    };
  });
}

function getRecentActivityStreak(items: ReelItem[]) {
  const uniqueDays = Array.from(new Set(items.map((item) => dayKey(item.updatedAt)).filter(Boolean))).sort().reverse();
  if (!uniqueDays.length) return 0;
  let streak = 1;
  let cursor = new Date(`${uniqueDays[0]}T12:00:00`);
  for (let index = 1; index < uniqueDays.length; index += 1) {
    const expected = new Date(cursor);
    expected.setDate(expected.getDate() - 1);
    if (dayKey(expected.toISOString()) !== uniqueDays[index]) break;
    streak += 1;
    cursor = expected;
  }
  return streak;
}

function dayKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function safeDate(value: string) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function formatWatchTime(minutes: number) {
  if (minutes <= 0) return "0h";
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = minutes / 60;
  if (hours < 72) return `${hours.toFixed(hours >= 10 ? 0 : 1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
