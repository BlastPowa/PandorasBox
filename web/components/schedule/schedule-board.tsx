"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { CalendarDays, Film, Tv, Sparkles, Bookmark, Rocket } from "lucide-react";
import type { ScheduleEntry } from "@/lib/schedule";
import { useLibrary } from "@/lib/library/use-library";
import { EmptyState } from "@/components/ui-fx/feedback";

type Tab = "anime" | "movie" | "series" | "upcoming" | "mylist";

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
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
  const [tab, setTab] = useState<Tab>("anime");

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

  const libraryIds = useMemo(() => new Set(items.map((i) => i.id)), [items]);

  const source: ScheduleEntry[] = useMemo(() => {
    if (tab === "anime") return anime;
    if (tab === "movie") return movies;
    if (tab === "series") return tv;
    if (tab === "upcoming") return upcoming;
    // mylist: everything releasing/upcoming that's in the user's library
    return [...anime, ...movies, ...tv, ...upcoming].filter((e) => libraryIds.has(e.id));
  }, [tab, anime, movies, tv, upcoming, libraryIds]);

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

  const dayEntries = byDay.get(activeDay) ?? [];

  return (
    <div className="space-y-5">
      {/* Type tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === t.key
                ? "bg-[linear-gradient(120deg,var(--accent),var(--accent-2))] text-[#0a0a0f]"
                : "glass text-[var(--text-secondary)] hover:text-[var(--text)]"
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
        <UpcomingView groups={byMonth} />
      ) : (
        <>
          {/* Day picker */}
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {days.map((d, i) => {
              const count = (byDay.get(d.key) ?? []).length;
              const isToday = i === 0;
              return (
                <button
                  key={d.key}
                  onClick={() => setActiveDay(d.key)}
                  className={`flex min-w-[64px] flex-col items-center rounded-[var(--radius-md)] px-3 py-2 text-center transition ${
                    activeDay === d.key
                      ? "bg-[var(--glass-strong)] ring-1 ring-[var(--accent)]"
                      : "glass hover:bg-[var(--glass-strong)]"
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                    {isToday ? "Today" : DAY_NAMES[d.idx]}
                  </span>
                  <span className="font-display text-lg font-bold leading-none">
                    {new Date(d.ts * 1000).getDate()}
                  </span>
                  <span className={`mt-1 text-[10px] ${count > 0 ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}`}>
                    {count > 0 ? `${count}` : "—"}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Day list */}
          <div>
            <h2 className="mb-3 font-display text-lg font-bold">
              {activeDay ? DAY_FULL[new Date(activeDay).getDay()] : ""}
            </h2>
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
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {dayEntries.map((e) => (
                  <Link
                    key={`${e.id}-${e.label}`}
                    href={`/title/${e.detailType}/${e.source}/${e.refId}`}
                    className="glass glow-ring flex items-center gap-3 rounded-[var(--radius-md)] p-2"
                  >
                    <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-[6px] bg-[var(--bg-elevated)]">
                      {e.posterUrl && <Image src={e.posterUrl} alt="" fill sizes="44px" className="object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 text-sm font-semibold">{e.title}</div>
                      <div className="mt-0.5 text-xs text-[var(--accent)]">{e.label}</div>
                      <div className="font-mono text-[10px] text-[var(--text-muted)]">
                        {e.hasTime
                          ? new Date(e.timestamp * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : "All day"}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function UpcomingView({ groups }: { groups: [string, ScheduleEntry[]][] }) {
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
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {entries.map((e) => (
                <Link
                  key={`${e.id}-${e.label}`}
                  href={`/title/${e.detailType}/${e.source}/${e.refId}`}
                  className="group"
                >
                  <div className="relative aspect-[2/3] overflow-hidden rounded-[var(--radius-md)] bg-[var(--bg-elevated)]">
                    {e.posterUrl && (
                      <Image src={e.posterUrl} alt={e.title} fill sizes="160px" className="object-cover transition-transform group-hover:scale-105" />
                    )}
                    <span className="absolute left-1.5 top-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--accent)]">
                      {e.label}
                    </span>
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
