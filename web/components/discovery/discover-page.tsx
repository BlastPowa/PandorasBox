import { Suspense } from "react";
import { discoverTitles } from "@/lib/discover";
import { genresFor, isSortKey, browseYears, type MediaKind, type SortKey } from "@/lib/browse-filters";
import { getStreamingProvider } from "@/lib/streaming-providers";
import { PosterSkeleton } from "@/components/ui-fx/feedback";
import { DiscoverGrid } from "./discover-grid";

export interface DiscoverSearchParams {
  genre?: string;
  year?: string;
  sort?: string;
  provider?: string;
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
      {Array.from({ length: 18 }).map((_, i) => (
        <PosterSkeleton key={i} />
      ))}
    </div>
  );
}

async function DiscoverContent({ kind, sp }: { kind: MediaKind; sp: DiscoverSearchParams }) {
  // Same allowlist validation as /api/discover — the first page is rendered on
  // the server, so an unvalidated query param would reach TMDB here too.
  const allowedGenres = genresFor(kind);
  const selectedGenres = sp.genre?.split(",").filter((value) => allowedGenres.includes(value)) ?? [];
  const genre = selectedGenres.length > 0 ? selectedGenres.join(",") : null;
  const sort: SortKey = sp.sort && isSortKey(sp.sort) ? sp.sort : "popular";
  const parsedYear = Number.parseInt(sp.year ?? "", 10);
  const year = browseYears().includes(parsedYear) ? parsedYear : null;
  const provider = sp.provider ? getStreamingProvider(sp.provider) : null;

  const initial = await discoverTitles({
    kind,
    genre,
    year,
    sort,
    provider: provider ? String(provider.tmdbId) : null,
    page: 1,
  });

  return <DiscoverGrid kind={kind} initial={initial} />;
}

export function DiscoverPage({
  kind,
  searchParams,
}: {
  kind: MediaKind;
  searchParams: DiscoverSearchParams;
}) {
  const key = `${kind}-${searchParams.genre ?? ""}-${searchParams.year ?? ""}-${searchParams.sort ?? ""}-${searchParams.provider ?? ""}`;
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 md:px-8">
      <Suspense key={key} fallback={<GridSkeleton />}>
        <DiscoverContent kind={kind} sp={searchParams} />
      </Suspense>
    </div>
  );
}
