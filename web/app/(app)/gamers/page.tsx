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
  const initial = await getGames("popular");
  return <GamesBrowser initial={initial} />;
}

export default function GamersPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 md:px-8">
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
