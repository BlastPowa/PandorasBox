import { getPopularAnime, getPopularSeries } from "@/lib/discovery";
import { EpisodeRatingsView } from "@/components/episode-ratings/episode-ratings-view";
import { DiscoveryPageHeader } from "@/components/discovery/discovery-page-header";

export const revalidate = 3600;
export const metadata = { title: "Episode Ratings · PBox" };

export default async function EpisodeRatingsPage() {
  const [anime, series] = await Promise.all([getPopularAnime(), getPopularSeries()]);
  const explore = [...anime.slice(0, 8), ...series.slice(0, 8)];

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 md:px-8">
      <div className="space-y-6">
        <DiscoveryPageHeader
          eyebrow="Season guide"
          title="Episode Ratings"
          description="Search a show or anime and compare episode ratings season by season before deciding what to revisit next."
        />
        <EpisodeRatingsView explore={explore} />
      </div>
    </div>
  );
}
