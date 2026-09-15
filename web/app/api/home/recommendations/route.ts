import { NextResponse, type NextRequest } from "next/server";
import type { ReelItemType } from "@core/storage/schema";
import type { UnifiedSearchResult } from "@core/utils/search";
import { getAniListMedia } from "@core/api/anilist";
import { discoverTitles } from "@/lib/discover";
import { genresFor } from "@/lib/browse-filters";
import { getPopularAnime, getTrendingAnime, getTrendingManga } from "@/lib/discovery";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

type Profile = {
  genres?: Record<string, number>;
  types?: Record<string, number>;
  typeGenres?: Record<string, Record<string, number>>;
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

function rankedGenreWeights(weights: Record<string, number> | undefined, fallback: Record<string, number>) {
  const source = weights && Object.keys(weights).length > 0 ? weights : fallback;
  return Object.entries(source)
    .map(([genre, weight]) => [genre, finiteWeight(weight)] as const)
    .filter(([, weight]) => weight > 0)
    .sort((a, b) => b[1] - a[1]);
}

function scoreCandidate(candidate: Candidate, genreWeights: Record<string, number>, typeWeight: number) {
  const genreScore = [...candidate.genres].reduce((sum, genre) => sum + finiteWeight(genreWeights[genre]), 0);
  const qualityScore = (candidate.item.score ?? 0) * 0.35;
  return genreScore * 1.7 + typeWeight + qualityScore;
}

function genreRecommendations(
  candidates: Candidate[],
  weights: Record<string, number>,
  fallback: Record<string, number>,
  typeWeight: number,
) {
  const preferredGenres = rankedGenreWeights(weights, fallback).slice(0, 3).map(([genre]) => genre);
  return Object.fromEntries(
    preferredGenres.flatMap((genre) => {
      const items = candidates
        .filter((candidate) => candidate.genres.has(genre))
        .map((candidate) => ({ item: candidate.item, score: scoreCandidate(candidate, weights, typeWeight) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 16)
        .map(({ item }) => item);
      return items.length > 0 ? [[genre, items] as const] : [];
    }),
  );
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
  const typeGenres = body.typeGenres ?? {};
  const seen = new Set((body.seenIds ?? []).slice(0, 1000));

  const movieGenres = new Set(genresFor("movie"));
  const tvGenres = new Set(genresFor("tv"));
  const movieGenreWeights = typeGenres.movie ?? genreWeights;
  const seriesGenreWeights = typeGenres.series ?? genreWeights;
  const animeGenreWeights = typeGenres.anime ?? genreWeights;
  const mangaGenreWeights = typeGenres.manga ?? typeGenres.manhwa ?? genreWeights;
  const movieSeeds = rankedGenreWeights(movieGenreWeights, genreWeights).filter(([genre]) => movieGenres.has(genre)).slice(0, 3);
  const tvSeeds = rankedGenreWeights(seriesGenreWeights, genreWeights).filter(([genre]) => tvGenres.has(genre)).slice(0, 3);

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

  const [discovered, trendingAnime, popularAnime, trendingManga] = await Promise.all([
    Promise.allSettled(discoveryRequests),
    getTrendingAnime(14),
    getPopularAnime(14),
    getTrendingManga(18),
  ]);

  const movieCandidates = new Map<string, Candidate>();
  const seriesCandidates = new Map<string, Candidate>();
  for (const result of discovered) {
    if (result.status !== "fulfilled") continue;
    for (const item of result.value.result.results) {
      if (seen.has(item.id)) continue;
      const bucket = item.type === "movie" ? movieCandidates : seriesCandidates;
      const existing = bucket.get(item.id);
      if (existing) existing.genres.add(result.value.genre);
      else bucket.set(item.id, { item, genres: new Set([result.value.genre]) });
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
  const animeCandidates = animeDetails.flatMap((detail) => detail.status === "fulfilled" ? [detail.value] : []);

  const mangaPool = trendingManga.filter((item) => !seen.has(item.id)).slice(0, 18);
  const mangaDetails = await Promise.allSettled(
    mangaPool.map(async (item) => {
      const media = item.anilistId ? await getAniListMedia(item.anilistId) : null;
      return { item, genres: new Set(media?.genres ?? []) } satisfies Candidate;
    })
  );
  const mangaCandidates = mangaDetails.flatMap((detail) => detail.status === "fulfilled" ? [detail.value] : []);

  const rank = (candidates: Candidate[], weights: Record<string, number>, type: ReelItemType) => candidates
    .map((candidate) => ({ item: candidate.item, score: scoreCandidate(candidate, weights, mediaTypeWeight(typeWeights, type)) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 18)
    .map(({ item }) => item);

  const movieList = [...movieCandidates.values()];
  const seriesList = [...seriesCandidates.values()];

  return NextResponse.json({
    groups: {
      movies: rank(movieList, movieGenreWeights, "movie"),
      series: rank(seriesList, seriesGenreWeights, "series"),
      anime: rank(animeCandidates, animeGenreWeights, "anime"),
      manga: rank(mangaCandidates, mangaGenreWeights, "manga"),
    },
    genreGroups: {
      movies: genreRecommendations(movieList, movieGenreWeights, genreWeights, mediaTypeWeight(typeWeights, "movie")),
      series: genreRecommendations(seriesList, seriesGenreWeights, genreWeights, mediaTypeWeight(typeWeights, "series")),
      anime: genreRecommendations(animeCandidates, animeGenreWeights, genreWeights, mediaTypeWeight(typeWeights, "anime")),
      manga: genreRecommendations(mangaCandidates, mangaGenreWeights, genreWeights, mediaTypeWeight(typeWeights, "manga")),
    },
  });
}
