import { NextResponse, type NextRequest } from "next/server";
import type { ReelItemType } from "@core/storage/schema";
import type { UnifiedSearchResult } from "@core/utils/search";
import { getAniListMedia } from "@core/api/anilist";
import { discoverTitles } from "@/lib/discover";
import { genresFor } from "@/lib/browse-filters";
import { getPopularAnime, getTrendingAnime } from "@/lib/discovery";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

type Profile = {
  genres?: Record<string, number>;
  types?: Record<string, number>;
  seenIds?: string[];
};

type Candidate = {
  item: UnifiedSearchResult;
  genres: Set<string>;
};

function finiteWeight(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(value, 100)) : 0;
}

function mediaTypeWeight(types: Record<string, number>, type: ReelItemType): number {
  if (type === "anime") return finiteWeight(types.anime) + finiteWeight(types.series) * 0.2;
  return finiteWeight(types[type]);
}

export async function POST(request: NextRequest) {
  const limit = rateLimit(request, "home-recommendations", 20, 60_000);
  if (!limit.ok) return tooManyRequests(limit);

  let body: Profile;
  try {
    body = await request.json() as Profile;
  } catch {
    return NextResponse.json({ items: [] });
  }

  const genreWeights = body.genres ?? {};
  const typeWeights = body.types ?? {};
  const seen = new Set((body.seenIds ?? []).slice(0, 1000));
  const rankedGenres = Object.entries(genreWeights)
    .map(([genre, weight]) => [genre, finiteWeight(weight)] as const)
    .filter(([, weight]) => weight > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const movieGenres = new Set(genresFor("movie"));
  const tvGenres = new Set(genresFor("tv"));
  const movieSeeds = rankedGenres.filter(([genre]) => movieGenres.has(genre)).slice(0, 2);
  const tvSeeds = rankedGenres.filter(([genre]) => tvGenres.has(genre)).slice(0, 2);

  const discoveryRequests = [
    ...movieSeeds.map(async ([genre]) => ({
      genre,
      result: await discoverTitles({ kind: "movie", genre, year: null, sort: "popular", provider: null, page: 1 }),
    })),
    ...tvSeeds.map(async ([genre]) => ({
      genre,
      result: await discoverTitles({ kind: "tv", genre, year: null, sort: "popular", provider: null, page: 1 }),
    })),
  ];

  const [discovered, trendingAnime, popularAnime] = await Promise.all([
    Promise.allSettled(discoveryRequests),
    getTrendingAnime(14),
    getPopularAnime(14),
  ]);

  const candidates = new Map<string, Candidate>();
  for (const result of discovered) {
    if (result.status !== "fulfilled") continue;
    for (const item of result.value.result.results) {
      if (seen.has(item.id)) continue;
      const existing = candidates.get(item.id);
      if (existing) existing.genres.add(result.value.genre);
      else candidates.set(item.id, { item, genres: new Set([result.value.genre]) });
    }
  }

  const animePool = [...trendingAnime, ...popularAnime]
    .filter((item, index, all) => !seen.has(item.id) && all.findIndex((other) => other.id === item.id) === index)
    .slice(0, 18);
  const animeDetails = await Promise.allSettled(
    animePool.map(async (item) => {
      const media = item.anilistId ? await getAniListMedia(item.anilistId) : null;
      return { item, genres: new Set(media?.genres ?? []) } satisfies Candidate;
    })
  );
  for (const detail of animeDetails) {
    if (detail.status === "fulfilled") candidates.set(detail.value.item.id, detail.value);
  }

  const items = [...candidates.values()]
    .map(({ item, genres }) => {
      const genreScore = [...genres].reduce((sum, genre) => sum + finiteWeight(genreWeights[genre]), 0);
      const typeScore = mediaTypeWeight(typeWeights, item.type);
      const qualityScore = (item.score ?? 0) * 0.35;
      return { item, score: genreScore * 1.6 + typeScore + qualityScore };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 18)
    .map(({ item }) => item);

  return NextResponse.json({ items });
}
