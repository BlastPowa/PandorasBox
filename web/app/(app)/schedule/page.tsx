import Link from "next/link";
import Image from "next/image";
import { CalendarDays } from "lucide-react";
import { getAiringWeek, type ScheduleEntry } from "@/lib/schedule";
import { GlassCard } from "@/components/ui-fx/glass-card";
import { EmptyState } from "@/components/ui-fx/feedback";

export const revalidate = 1800;

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function SchedulePage() {
  const entries = await getAiringWeek();

  const byDay = new Map<number, ScheduleEntry[]>();
  for (const e of entries) {
    const day = new Date(e.airingAt * 1000).getDay();
    const arr = byDay.get(day) ?? [];
    arr.push(e);
    byDay.set(day, arr);
  }

  const todayIdx = new Date().getDay();
  const orderedDays = Array.from({ length: 7 }, (_, i) => (todayIdx + i) % 7);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8">
      <div className="mb-2 flex items-center gap-2">
        <CalendarDays className="size-6 text-[var(--accent)]" />
        <h1 className="font-display text-2xl font-bold">Airing Schedule</h1>
      </div>
      <p className="mb-5 text-sm text-[var(--text-secondary)]">
        Live next-episode times for the week ahead, from AniList. Movie &amp; TV release dates surface as
        availability badges on each title (powered by TMDB when a key is set).
      </p>

      {entries.length === 0 ? (
        <EmptyState icon={<CalendarDays className="size-10" />} title="Schedule unavailable" description="Could not reach the airing schedule right now. Try again shortly." />
      ) : (
        <div className="space-y-5">
          {orderedDays.map((dayIdx) => {
            const list = (byDay.get(dayIdx) ?? []).sort((a, b) => a.airingAt - b.airingAt);
            if (list.length === 0) return null;
            const isToday = dayIdx === todayIdx;
            return (
              <GlassCard key={dayIdx} macDots title={`${DAYS[dayIdx]}${isToday ? " · Today" : ""}`}>
                <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((e) => (
                    <Link
                      key={`${e.mediaId}-${e.episode}`}
                      href={`/title/anime/anilist/${e.mediaId}`}
                      className="glass glow-ring flex items-center gap-3 rounded-[var(--radius-md)] p-2"
                    >
                      <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-[6px] bg-[var(--bg-elevated)]">
                        {e.coverUrl && <Image src={e.coverUrl} alt="" fill sizes="44px" className="object-cover" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-2 text-sm font-semibold">{e.title}</div>
                        <div className="mt-0.5 text-xs text-[var(--accent)]">Ep {e.episode}</div>
                        <div className="font-mono text-[10px] text-[var(--text-muted)]">
                          {new Date(e.airingAt * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
