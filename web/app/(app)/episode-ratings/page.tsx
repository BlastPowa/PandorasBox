import { Star } from "lucide-react";
import { getPopularAnime, getPopularSeries } from "@/lib/discovery";
import { EpisodeRatingsView } from "@/components/episode-ratings/episode-ratings-view";

export const revalidate = 3600;
export const metadata = { title: "Episode Ratings · Pandora's Box" };

export default async function EpisodeRatingsPage() {
  const [anime, series] = await Promise.all([getPopularAnime(), getPopularSeries()]);
  const explore = [...anime.slice(0, 8), ...series.slice(0, 8)];

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 md:px-8">
      <div className="mb-1 flex items-center gap-2">
        <Star className="size-6 text-[var(--gold)]" />
        <h1 className="font-display text-2xl font-bold">Episode Ratings</h1>
      </div>
      <p className="mb-6 text-sm text-[var(--text-secondary)]">
        Search a show or anime to see real IMDb ratings for every episode, season by season.
      </p>
      <EpisodeRatingsView explore={explore} />
    </div>
  );
}
