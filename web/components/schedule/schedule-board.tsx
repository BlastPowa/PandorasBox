"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { CalendarDays, Film, Tv, Sparkles, Bookmark, Rocket, Layers3, ArrowRight, Clock3 } from "lucide-react";
import type { ScheduleEntry } from "@/lib/schedule";
import { useLibrary } from "@/lib/library/use-library";
import { EmptyState } from "@/components/ui-fx/feedback";

type Tab = "all" | "anime" | "movie" | "series" | "upcoming" | "mylist";

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "all", label: "All", icon: <Layers3 className="size-4" /> },
  { key: "anime", label: "Anime", icon: <Sparkles className="size-4" /> },
  { key: "movie", label: "Movies", icon: <Film className="size-4" /> },
  { key: "series", label: "TV", icon: <Tv className="size-4" /> },
  { key: "upcoming", label: "Upcoming", icon: <Rocket className="size-4" /> },
  { key: "mylist", label: "My List", icon: <Bookmark className="size-4" /> },
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function dayKey(ts: number): string {
  return new Date(ts * 1000).toDateString();
}

function releaseState(entry: ScheduleEntry, now: number) {
  if (/delay/i.test(entry.label)) return { label: "Delayed", tone: "text-[var(--dropped)]" };
  const difference = entry.timestamp * 1000 - now;
  if (!entry.hasTime && dayKey(entry.timestamp) === new Date(now).toDateString()) return { label: "Releases today", tone: "text-[var(--gold)]" };
  if (difference <= 0) return { label: "Released", tone: "text-[var(--completed)]" };
  if (difference <= 2 * 60 * 60 * 1000) return { label: "Airing soon", tone: "text-[var(--accent)]" };
  const days = Math.floor(difference / 86_400_000);
  const hours = Math.floor((difference % 86_400_000) / 3_600_000);
  const minutes = Math.max(1, Math.floor((difference % 3_600_000) / 60_000));
  return { label: days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`, tone: "text-[var(--text-secondary)]" };
}

function ReleaseCountdown({ entry, now }: { entry: ScheduleEntry; now: number }) {
  const state = releaseState(entry, now);
  return <span className={`inline-flex rounded-full border border-current/40 bg-black/55 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide backdrop-blur ${state.tone}`}>{state.label}</span>;
}

export function ScheduleBoard({
  anime,
  movies,
  tv,
  upcoming,
}: {
  anime: ScheduleEntry[];
  movies: ScheduleEntry[];
  tv: ScheduleEntry[];
  upcoming: ScheduleEntry[];
}) {
  const { items, signedIn } = useLibrary();
  const [tab, setTab] = useState<Tab>("all");
  const [now, setNow] = useState(0);

  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const interval = window.setInterval(update, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  // Build the next 7 day buckets starting today
  const days = useMemo(() => {
    const out: { key: string; ts: number; idx: number }[] = [];
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(base.getTime() + i * 86400000);
      out.push({ key: d.toDateString(), ts: Math.floor(d.getTime() / 1000), idx: d.getDay() });
    }
    return out;
  }, []);

  const [activeDay, setActiveDay] = useState<string>(days[0]?.key ?? "");

  const libraryIds = useMemo(() => {
    const ids = new Set<string>();
    for (const item of items) {
      ids.add(item.id);
      if (item.tmdbId !== null) ids.add(`tmdb-${item.tmdbId}`);
      if (item.anilistId !== null) ids.add(`anilist-${item.anilistId}`);
    }
    return ids;
  }, [items]);

  const trackedEntries = useMemo(() => {
    const unique = new Map<string, ScheduleEntry>();
    for (const entry of [...anime, ...movies, ...tv, ...upcoming]) {
      if (!libraryIds.has(entry.id)) continue;
      const key = `${entry.id}-${entry.timestamp}-${entry.label}`;
      if (!unique.has(key)) unique.set(key, entry);
    }
    return Array.from(unique.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [anime, movies, tv, upcoming, libraryIds]);

  const trackedThisWeek = useMemo(() => {
    const end = (days[0]?.ts ?? 0) + (7 * 86400);
    return trackedEntries.filter((entry) => entry.timestamp >= (days[0]?.ts ?? 0) && entry.timestamp < end).length;
  }, [trackedEntries, days]);

  const nextTracked = useMemo(() => {
    const current = now > 0 ? Math.floor(now / 1000) : 0;
    return trackedEntries.find((entry) => entry.timestamp >= current) ?? null;
  }, [trackedEntries, now]);

  const source: ScheduleEntry[] = useMemo(() => {
    if (tab === "all") return [...anime, ...movies, ...tv];
    if (tab === "anime") return anime;
    if (tab === "movie") return movies;
    if (tab === "series") return tv;
    if (tab === "upcoming") return upcoming;
    // mylist: everything releasing/upcoming that's in the user's library
    return [...anime, ...movies, ...tv, ...upcoming].filter((e) => libraryIds.has(e.id));
  }, [tab, anime, movies, tv, upcoming, libraryIds]);

  const weekPreview = useMemo(
    () => [...anime, ...movies, ...tv].filter((entry) => entry.timestamp >= (days[0]?.ts ?? 0)).sort((a, b) => a.timestamp - b.timestamp).slice(0, 7),
    [anime, movies, tv, days],
  );

  const counts = useMemo(() => ({ anime: anime.length, movie: movies.length, series: tv.length }), [anime.length, movies.length, tv.length]);

  // Upcoming view: group by month (far-future, no day picker)
  const byMonth = useMemo(() => {
    const map = new Map<string, ScheduleEntry[]>();
    const list = tab === "upcoming" ? upcoming : source;
    for (const e of list) {
      const d = new Date(e.timestamp * 1000);
      const k = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      const arr = map.get(k) ?? [];
      arr.push(e);
      map.set(k, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.timestamp - b.timestamp);
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [tab, upcoming, source]);

  const byDay = useMemo(() => {
    const map = new Map<string, ScheduleEntry[]>();
    for (const e of source) {
      const k = dayKey(e.timestamp);
      const arr = map.get(k) ?? [];
      arr.push(e);
      map.set(k, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.timestamp - b.timestamp);
    return map;
  }, [source]);

  const dayEntries = useMemo(() => byDay.get(activeDay) ?? [], [activeDay, byDay]);
  const dayGroups = useMemo(() => {
    const groups: { kind: ScheduleEntry["kind"]; label: string; entries: ScheduleEntry[] }[] = [
      { kind: "anime", label: "Anime", entries: [] },
      { kind: "movie", label: "Movies", entries: [] },
      { kind: "series", label: "TV", entries: [] },
    ];
    for (const entry of dayEntries) groups.find((group) => group.kind === entry.kind)?.entries.push(entry);
    return groups.filter((group) => group.entries.length > 0);
  }, [dayEntries]);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[calc(var(--radius-xl)+4px)] border border-[var(--border)] bg-[var(--bg-surface)] shadow-xl">
        <div className="absolute inset-0 grid grid-cols-4 opacity-35 sm:grid-cols-7" aria-hidden="true">
          {weekPreview.map((entry) => (
            <div key={`${entry.id}-backdrop`} className="relative min-h-48">
              {entry.posterUrl && <Image src={entry.posterUrl} alt="" fill sizes="180px" className="object-cover" />}
            </div>
          ))}
        </div>
        <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, var(--bg-base) 0%, color-mix(in srgb, var(--bg-base) 92%, transparent) 38%, color-mix(in srgb, var(--bg-base) 58%, transparent) 100%)" }} />
        <div className="relative z-[1] grid gap-5 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--glass)] px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent)] backdrop-blur-xl"><CalendarDays className="size-3.5" /> This week</span>
            <h2 className="mt-4 font-display text-2xl font-bold sm:text-3xl">Your release week, at a glance</h2>
            <p className="mt-2 max-w-xl text-sm text-[var(--text-secondary)]">Jump between anime, movies and TV without losing the calendar view. Your tracked titles stay collected under My List.</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <ScheduleStat label="Anime" value={counts.anime} icon={<Sparkles className="size-4" />} />
            <ScheduleStat label="Movies" value={counts.movie} icon={<Film className="size-4" />} />
            <ScheduleStat label="TV" value={counts.series} icon={<Tv className="size-4" />} />
          </div>
        </div>
      </section>

      {signedIn && (
        <section className="pb-uiverse-card pb-aura grid gap-3 rounded-[22px] p-3 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-4">
          <div className="flex items-center gap-3">
            <span className="pb-uiverse-icon grid size-10 shrink-0 place-items-center rounded-xl text-[var(--accent)]"><Bookmark className="size-4" /></span>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--text-muted)]">Your calendar</p>
              <p className="text-sm font-bold">{trackedThisWeek} tracked {trackedThisWeek === 1 ? "release" : "releases"} this week</p>
            </div>
          </div>
          <div className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--glass)] px-3 py-2.5">
            {nextTracked ? (
              <div className="flex min-w-0 items-center gap-2">
                <Clock3 className="size-4 shrink-0 text-[var(--accent)]" />
                <p className="min-w-0 truncate text-xs text-[var(--text-secondary)]"><strong className="text-[var(--text)]">Next:</strong> {nextTracked.title} · {nextTracked.label} · {new Date(nextTracked.timestamp * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p>
              </div>
            ) : (
              <p className="text-xs text-[var(--text-muted)]">No tracked releases are scheduled yet.</p>
            )}
          </div>
          <button type="button" onClick={() => setTab("mylist")} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-3 text-xs font-bold text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]">
            Open My List <ArrowRight className="size-3.5" />
          </button>
        </section>
      )}

      <div className="flex flex-wrap gap-2 rounded-2xl border border-[var(--border)] bg-[var(--glass)] p-2 backdrop-blur-xl">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === t.key
                ? "bg-[linear-gradient(120deg,var(--accent),var(--accent-2))] text-white shadow-lg"
                : "text-[var(--text-secondary)] hover:bg-[var(--glass-strong)] hover:text-[var(--text-primary)]"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === "mylist" && !signedIn ? (
        <EmptyState
          icon={<Bookmark className="size-10" />}
          title="Track titles to build your calendar"
          description="Sign in and add shows, anime and movies to your library — their upcoming releases will collect here."
        />
      ) : tab === "upcoming" ? (
        <UpcomingView groups={byMonth} now={now} />
      ) : (
        <>
          <div className="grid grid-cols-4 gap-2 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--glass)] p-2 backdrop-blur-xl sm:grid-cols-7">
            {days.map((d, i) => {
              const count = (byDay.get(d.key) ?? []).length;
              const isToday = i === 0;
              return (
                <button
                  key={d.key}
                  onClick={() => setActiveDay(d.key)}
                  className={`flex min-w-0 flex-col items-center rounded-[var(--radius-md)] px-2 py-2 text-center transition ${
                    activeDay === d.key
                      ? "bg-[rgb(var(--accent-rgb)/0.14)] ring-1 ring-[var(--accent)] shadow-lg"
                      : "hover:bg-[var(--glass-strong)]"
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                    {isToday ? "Today" : DAY_NAMES[d.idx]}
                  </span>
                  <span className="font-display text-lg font-bold leading-none">
                    {new Date(d.ts * 1000).getDate()}
                  </span>
                  <span className="mt-0.5 text-[9px] uppercase text-[var(--text-muted)]">{new Date(d.ts * 1000).toLocaleDateString(undefined, { month: "short" })}</span>
                  <span className={`mt-1 text-[10px] ${count > 0 ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}`}>
                    {count > 0 ? `${count}` : "—"}
                  </span>
                </button>
              );
            })}
          </div>

          <div>
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent)]">Release line-up</p>
                <h2 className="font-display text-2xl font-bold">{activeDay ? DAY_FULL[new Date(activeDay).getDay()] : ""}</h2>
              </div>
              <span className="text-sm text-[var(--text-muted)]">{dayEntries.length} {dayEntries.length === 1 ? "release" : "releases"}</span>
            </div>
            {dayEntries.length === 0 ? (
              <EmptyState
                icon={<CalendarDays className="size-10" />}
                title="Nothing scheduled"
                description={
                  tab === "mylist"
                    ? "None of your tracked titles release on this day."
                    : "No releases found for this day. Try another day or tab."
                }
              />
            ) : (
              <div className="space-y-6">
                {dayGroups.map((group) => (
                  <section key={group.kind}>
                    <div className="mb-2 flex items-center gap-2 text-sm font-bold text-[var(--text-secondary)]">
                      {group.kind === "anime" ? <Sparkles className="size-4 text-[var(--accent)]" /> : group.kind === "movie" ? <Film className="size-4 text-[var(--accent)]" /> : <Tv className="size-4 text-[var(--accent)]" />}
                      {group.label}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {group.entries.map((e) => <ScheduleCard key={`${e.id}-${e.label}`} entry={e} now={now} />)}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ScheduleStat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="min-w-20 rounded-2xl border border-[var(--border)] bg-[var(--glass)] p-3 text-center backdrop-blur-xl">
      <span className="mx-auto grid size-8 place-items-center rounded-full bg-[rgb(var(--accent-rgb)/0.12)] text-[var(--accent)]">{icon}</span>
      <strong className="mt-1 block font-display text-xl">{value}</strong>
      <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">{label}</span>
    </div>
  );
}

function ScheduleCard({ entry, now }: { entry: ScheduleEntry; now: number }) {
  return (
    <Link href={`/title/${entry.detailType}/${entry.source}/${entry.refId}`} className="group relative flex min-h-28 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl">
      <div className="relative w-20 shrink-0 bg-[var(--bg-elevated)] sm:w-24">
        {entry.posterUrl && <Image src={entry.posterUrl} alt="" fill sizes="96px" className="object-cover transition duration-500 group-hover:scale-105" />}
      </div>
      <div className="min-w-0 flex-1 p-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--accent)]">{entry.kind === "series" ? "TV" : entry.kind}</span>
        <div className="mt-1 line-clamp-2 text-sm font-bold">{entry.title}</div>
        <div className="mt-1 text-xs text-[var(--text-secondary)]">{entry.label}</div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {now > 0 && <ReleaseCountdown entry={entry} now={now} />}
          <span className="font-mono text-[10px] text-[var(--text-muted)]">{entry.hasTime ? new Date(entry.timestamp * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "All day"}</span>
        </div>
      </div>
    </Link>
  );
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function UpcomingView({ groups, now }: { groups: [string, ScheduleEntry[]][]; now: number }) {
  if (groups.length === 0) {
    return (
      <EmptyState
        icon={<Rocket className="size-10" />}
        title="Nothing announced yet"
        description="Newly announced anime, upcoming movies and TV premieres will appear here."
      />
    );
  }
  return (
    <div className="space-y-6">
      {groups.map(([key, entries]) => {
        const [year, monthIdx] = key.split("-");
        return (
          <div key={key}>
            <h2 className="mb-3 font-display text-lg font-bold">
              {MONTHS[Number.parseInt(monthIdx, 10)]} {year}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
              {entries.map((e) => (
                <Link
                  key={`${e.id}-${e.label}`}
                  href={`/title/${e.detailType}/${e.source}/${e.refId}`}
                  className="group rounded-2xl border border-transparent p-1 transition hover:border-[var(--border)] hover:bg-[var(--glass)]"
                >
                  <div className="relative aspect-[2/3] overflow-hidden rounded-[var(--radius-md)] bg-[var(--bg-elevated)]">
                    {e.posterUrl && (
                      <Image src={e.posterUrl} alt={e.title} fill sizes="160px" className="object-cover transition-transform group-hover:scale-105" />
                    )}
                    <span className="absolute left-1.5 top-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white backdrop-blur">
                      {e.kind === "series" ? "TV" : e.kind} · {e.label}
                    </span>
                    {now > 0 && <span className="absolute bottom-1.5 left-1.5"><ReleaseCountdown entry={e} now={now} /></span>}
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs font-medium">{e.title}</p>
                  <p className="font-mono text-[10px] text-[var(--text-muted)]">
                    {new Date(e.timestamp * 1000).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
