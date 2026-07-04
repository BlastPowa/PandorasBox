import { CalendarDays } from "lucide-react";
import { getAnimeWeek, getMovieReleasesWindow, getTvWindow } from "@/lib/schedule";
import { getProfile } from "@/lib/auth";
import { ScheduleBoard } from "@/components/schedule/schedule-board";

export const revalidate = 1800;

export default async function SchedulePage() {
  const profile = await getProfile();
  const region = profile?.country ?? "US";
  const [anime, movies, tv] = await Promise.all([
    getAnimeWeek(7),
    getMovieReleasesWindow(region, 21),
    getTvWindow(14),
  ]);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8">
      <div className="mb-2 flex items-center gap-2">
        <CalendarDays className="size-6 text-[var(--accent)]" />
        <h1 className="font-display text-2xl font-bold">Release Calendar</h1>
      </div>
      <p className="mb-5 text-sm text-[var(--text-secondary)]">
        Upcoming anime episodes, movie releases and TV premieres — switch tabs, pick a day, or check
        <span className="text-[var(--text)]"> My List</span> for just the titles you track.
      </p>
      <ScheduleBoard anime={anime} movies={movies} tv={tv} />
    </div>
  );
}
