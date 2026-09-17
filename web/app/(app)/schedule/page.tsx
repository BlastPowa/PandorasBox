import { CalendarDays } from "lucide-react";
import {
  getAnimeWeek,
  getMovieReleasesWindow,
  getTvWindow,
  getUpcomingAnime,
  getUpcomingMovies,
  getUpcomingTv,
} from "@/lib/schedule";
import { getProfile } from "@/lib/auth";
import { ScheduleBoard } from "@/components/schedule/schedule-board";
import { DiscoveryPageHeader } from "@/components/discovery/discovery-page-header";
import { TrackingHubNav } from "@/components/tracking/tracking-hub-nav";

export const revalidate = 1800;

export default async function SchedulePage() {
  const profile = await getProfile();
  const region = profile?.country ?? "US";
  const [anime, movies, tv, upAnime, upMovies, upTv] = await Promise.all([
    getAnimeWeek(7),
    getMovieReleasesWindow(region, 21),
    getTvWindow(14),
    getUpcomingAnime(),
    getUpcomingMovies(region),
    getUpcomingTv(),
  ]);
  const upcoming = [...upAnime, ...upMovies, ...upTv];

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8">
      <div className="space-y-5">
        <DiscoveryPageHeader eyebrow="Tracking hub · Schedule" title="Release Calendar" description="Upcoming anime episodes, movie releases and TV premieres, with a personal calendar for the titles you track." actions={<div className="hidden size-12 place-items-center rounded-2xl bg-[rgb(var(--accent-rgb)/0.15)] text-[var(--accent)] sm:grid"><CalendarDays className="size-6" /></div>} />
        <TrackingHubNav active="schedule" />
        <ScheduleBoard anime={anime} movies={movies} tv={tv} upcoming={upcoming} />
      </div>
    </div>
  );
}
