import { NextResponse, type NextRequest } from "next/server";
import { getSeriesDetails, getSeasonDetails, getBackdropUrl } from "@core/api/tmdb";
import { getAniListMedia } from "@core/api/anilist";
import { getJikanEpisodeDetail } from "@core/api/jikan";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

type NextUpRequestItem = {
  id: string;
  source: string;
  type: "series" | "anime";
  title: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  tmdbId: number | null;
  anilistId: number | null;
  malId: number | null;
  currentSeason: number | null;
  currentEpisode: number | null;
};

function hasAired(airDate: string | null | undefined): boolean {
  if (!airDate) return false;
  const at = Date.parse(`${airDate}T23:59:59Z`);
  return Number.isFinite(at) && at <= Date.now();
}

async function resolveSeries(item: NextUpRequestItem, tmdbKey: string) {
  if (!item.tmdbId || !tmdbKey) return null;
  const series = await getSeriesDetails(item.tmdbId, tmdbKey);
  const startSeason = Math.max(1, item.currentSeason ?? 1);
  const maxSeason = Math.max(startSeason, series.number_of_seasons || startSeason);

  for (let seasonNumber = startSeason; seasonNumber <= maxSeason; seasonNumber += 1) {
    const season = await getSeasonDetails(item.tmdbId, seasonNumber, tmdbKey);
    const watchedThrough = seasonNumber === startSeason ? Math.max(0, item.currentEpisode ?? 0) : 0;
    const episode = season.episodes.find((entry) => entry.episode_number > watchedThrough && hasAired(entry.air_date));
    if (!episode) continue;
    return {
      id: item.id,
      href: `/title/series/tmdb/${item.tmdbId}`,
      title: item.title,
      posterUrl: item.posterUrl,
      imageUrl: episode.still_path ? `https://image.tmdb.org/t/p/w780${episode.still_path}` : item.backdropUrl ?? (series.backdrop_path ? getBackdropUrl(series.backdrop_path) : null),
      season: seasonNumber,
      episode: episode.episode_number,
      episodeTitle: episode.name || null,
      airDate: episode.air_date || null,
      runtime: episode.runtime,
    };
  }
  return null;
}

async function resolveAnime(item: NextUpRequestItem) {
  if (!item.anilistId) return null;
  const media = await getAniListMedia(item.anilistId);
  const nextEpisode = Math.max(0, item.currentEpisode ?? 0) + 1;
  const availableThrough = media.status === "FINISHED"
    ? media.episodes ?? 0
    : media.nextAiringEpisode?.episode
      ? media.nextAiringEpisode.episode - 1
      : 0;
  if (nextEpisode > availableThrough) return null;

  const malId = item.malId ?? media.idMal;
  const detail = malId ? await getJikanEpisodeDetail(malId, nextEpisode) : null;
  return {
    id: item.id,
    href: `/title/anime/anilist/${item.anilistId}`,
    title: item.title,
    posterUrl: item.posterUrl,
    imageUrl: item.backdropUrl ?? media.bannerImage ?? null,
    season: null,
    episode: nextEpisode,
    episodeTitle: detail?.title ?? null,
    airDate: detail?.aired ?? null,
    runtime: null,
  };
}

export async function POST(request: NextRequest) {
  const limit = rateLimit(request, "home-next-up", 30, 60_000);
  if (!limit.ok) return tooManyRequests(limit);

  let body: { items?: NextUpRequestItem[] };
  try {
    body = await request.json() as { items?: NextUpRequestItem[] };
  } catch {
    return NextResponse.json({ items: [] });
  }

  const tmdbKey = process.env.TMDB_API_KEY ?? "";
  const sourceItems = (body.items ?? []).slice(0, 12);
  const resolved = await Promise.allSettled(
    sourceItems.map((item) => item.type === "series" ? resolveSeries(item, tmdbKey) : resolveAnime(item))
  );
  const items = resolved.flatMap((result) => result.status === "fulfilled" && result.value ? [result.value] : []);
  return NextResponse.json({ items });
}
