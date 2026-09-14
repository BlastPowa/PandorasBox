import { Suspense } from "react";
import { getGames } from "@/lib/igdb";
import { GamesBrowser } from "@/components/games/games-browser";
import { PosterSkeleton } from "@/components/ui-fx/feedback";

export const revalidate = 3600;

export const metadata = {
  title: "Games",
  description: "Discover games — upcoming, new, and top rated.",
};

async function GamesContent() {
  const popular = await getGames("popular", 36);
  const [mostPlayed, topRated, upcoming, newReleases] = await Promise.all([
    getGames("most_played", 18),
    getGames("top_rated", 18),
    getGames("upcoming", 18),
    getGames("new", 18),
  ]);
  return <GamesBrowser initial={{ popular, mostPlayed, topRated, upcoming, newReleases }} />;
}

export default function GamersPage() {
  return (
    <div className="mx-auto max-w-[1540px] px-4 py-5 md:px-8 md:py-8">
      <Suspense
        fallback={
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {Array.from({ length: 18 }).map((_, i) => (
              <PosterSkeleton key={i} />
            ))}
          </div>
        }
      >
        <GamesContent />
      </Suspense>
    </div>
  );
}
