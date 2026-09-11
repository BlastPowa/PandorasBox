import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReelItem, ReelItemStatus } from "@core/storage/schema";
import { createDefaultProgress } from "@core/storage/schema";
import {
  getBackdropUrl,
  getMovieDetails,
  getPosterUrl,
  getSeasonDetails,
  getSeriesDetails,
  searchMovies,
  searchSeries,
} from "@core/api/tmdb";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import type { PushPayload } from "@/lib/integrations/sync";

interface ScrobbleBody {
  tmdbId?: number;
  mediaType?: "movie" | "series";
  season?: number | null;
  episode?: number | null;
  currentTime?: number;
  duration?: number | null;
  percent?: number | null;
  event?: string;
  completed?: boolean;
  title?: string | null;
  site?: string | null;
  source?: string | null;
}

function finiteNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clampPercent(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function mediaTypeForItem(item: ReelItem): "movie" | "series" | null {
  if (item.type === "movie") return "movie";
  if (item.type === "series" || item.type === "anime") return "series";
  return null;
}

function normalizeTitle(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/^(?:watch|stream)\s+/, "")
    .replace(/^(?:netflix|(?:amazon\s+)?prime\s+video)\s*[:|\-]\s*/, "")
    .replace(/\s*[-|–—]\s*(?:cinemaos|netflix|(?:amazon\s+)?prime\s+video|disney\+|crunchyroll|hulu|(?:hbo\s+)?max).*$/, "")
    .replace(/\s+s(?:eason\s*)?\d+\s*[: .\-]?\s*e(?:pisode\s*)?\d+.*$/, "")
    .replace(/\s+season\s+\d+\s*[,·: -]+\s*episode\s+\d+.*$/, "")
    .replace(/\s+\d+\s*x\s*\d+.*$/, "")
    .replace(/\s*\(\d{4}\)\s*$/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function sanitizeSite(value: string | null | undefined): string {
  const clean = (value ?? "cinejoy").toLowerCase().replace(/[^a-z0-9.-]+/g, "-").replace(/^-+|-+$/g, "");
  return clean.slice(0, 80) || "cinejoy";
}

function findLibraryTitleMatch(items: ReelItem[], title: string, hint: "movie" | "series" | null): number {
  const normalized = normalizeTitle(title);
  if (!normalized) return -1;
  const matches = items
    .map((item, index) => ({ item, index, mediaType: mediaTypeForItem(item) }))
    .filter(({ item, mediaType }) => mediaType && (!hint || mediaType === hint) && normalizeTitle(item.title) === normalized);
  return matches.length === 1 ? matches[0]!.index : -1;
}

async function resolveTmdbTitle(
  title: string,
  hint: "movie" | "series" | null,
  season: number | null,
  episode: number | null,
): Promise<{ tmdbId: number; mediaType: "movie" | "series" } | null> {
  const apiKey = process.env.TMDB_API_KEY ?? "";
  const normalized = normalizeTitle(title);
  if (!apiKey || !normalized) return null;
  const effectiveHint = hint ?? (season != null || episode != null ? "series" : null);

  if (effectiveHint === "movie") {
    const results = await searchMovies(title, apiKey).catch(() => []);
    const exact = results.find((item) => normalizeTitle(item.title) === normalized);
    return exact ? { tmdbId: exact.id, mediaType: "movie" } : null;
  }
  if (effectiveHint === "series") {
    const results = await searchSeries(title, apiKey).catch(() => []);
    const exact = results.find((item) => normalizeTitle(item.name) === normalized);
    return exact ? { tmdbId: exact.id, mediaType: "series" } : null;
  }

  const [movies, series] = await Promise.all([
    searchMovies(title, apiKey).catch(() => []),
    searchSeries(title, apiKey).catch(() => []),
  ]);
  const movie = movies.find((item) => normalizeTitle(item.title) === normalized);
  const show = series.find((item) => normalizeTitle(item.name) === normalized);
  if (movie && !show) return { tmdbId: movie.id, mediaType: "movie" };
  if (show && !movie) return { tmdbId: show.id, mediaType: "series" };
  return null;
}

function isAheadOrEqual(season: number, episode: number, item: ReelItem): boolean {
  const oldSeason = item.progress.currentSeason ?? 0;
  const oldEpisode = item.progress.currentEpisode ?? 0;
  return season > oldSeason || (season === oldSeason && episode >= oldEpisode);
}

async function createTmdbItem(
  tmdbId: number,
  mediaType: "movie" | "series",
  fallbackTitle: string | null,
  site: string,
): Promise<ReelItem> {
  const now = new Date().toISOString();
  const apiKey = process.env.TMDB_API_KEY ?? "";
  const progress = createDefaultProgress();
  let title = fallbackTitle?.trim() || `${mediaType === "movie" ? "Movie" : "Series"} ${tmdbId}`;
  let posterUrl: string | null = null;
  let backdropUrl: string | null = null;
  let synopsis: string | null = null;
  let year: number | null = null;
  let totalEpisodes: number | null = null;
  let totalSeasons: number | null = null;

  if (apiKey) {
    try {
      if (mediaType === "movie") {
        const movie = await getMovieDetails(tmdbId, apiKey);
        title = movie.title;
        posterUrl = movie.poster_path ? getPosterUrl(movie.poster_path) : null;
        backdropUrl = movie.backdrop_path ? getBackdropUrl(movie.backdrop_path) : null;
        synopsis = movie.overview || null;
        year = movie.release_date ? Number.parseInt(movie.release_date.slice(0, 4), 10) || null : null;
      } else {
        const series = await getSeriesDetails(tmdbId, apiKey);
        title = series.name;
        posterUrl = series.poster_path ? getPosterUrl(series.poster_path) : null;
        backdropUrl = series.backdrop_path ? getBackdropUrl(series.backdrop_path) : null;
        synopsis = series.overview || null;
        year = series.first_air_date ? Number.parseInt(series.first_air_date.slice(0, 4), 10) || null : null;
        totalEpisodes = series.number_of_episodes || null;
        totalSeasons = series.number_of_seasons || null;
        progress.totalEpisodes = totalEpisodes;
        progress.totalSeasons = totalSeasons;
      }
    } catch {
      // Keep tracking with a minimal TMDB item if metadata is temporarily unavailable.
    }
  }

  return {
    id: `tmdb-${tmdbId}`,
    source: "tmdb",
    type: mediaType,
    title,
    posterUrl,
    backdropUrl,
    synopsis,
    status: "watching",
    progress,
    rating: null,
    genres: [],
    totalEpisodes,
    totalChapters: null,
    totalSeasons,
    year,
    anilistId: null,
    tmdbId,
    mangadexId: null,
    malId: null,
    addedAt: now,
    updatedAt: now,
    completedAt: null,
    lastWatchedSite: site,
  };
}

async function queueIntegrationPush(
  supabase: SupabaseClient,
  userId: string,
  item: ReelItem,
  episodeCompleted: boolean,
): Promise<number> {
  const { data: integrations } = await supabase
    .from("integrations")
    .select("provider")
    .eq("user_id", userId)
    .eq("auto_sync", true);
  if (!integrations?.length) return 0;

  const payload: PushPayload = {
    status: item.status,
    progress: item.type === "movie"
      ? (item.status === "completed" ? 1 : 0)
      : (episodeCompleted ? item.progress.currentEpisode ?? 0 : 0),
    rating: item.rating,
    malId: item.malId,
    anilistId: item.anilistId,
    tmdbId: item.tmdbId,
    mediaType: item.type,
    season: item.progress.currentSeason,
  };

  let queued = 0;
  for (const { provider } of integrations) {
    if (provider === "mal" && item.malId == null) continue;
    if (provider === "anilist" && item.anilistId == null) continue;
    if (provider === "trakt" && item.tmdbId == null) continue;
    const mediaKey = provider === "trakt" && item.type === "series" && episodeCompleted
      ? `${item.id}:s${item.progress.currentSeason ?? 0}e${item.progress.currentEpisode ?? 0}`
      : item.id;
    await supabase.from("sync_queue").delete()
      .eq("user_id", userId).eq("provider", provider).eq("media_key", mediaKey).eq("status", "pending");
    const { error } = await supabase.from("sync_queue").insert({
      user_id: userId,
      provider,
      direction: "push",
      media_key: mediaKey,
      payload,
    });
    if (!error) queued += 1;
  }
  return queued;
}

export async function POST(request: NextRequest) {
  const limit = rateLimit(request, "watch-scrobble", 180, 60_000);
  if (!limit.ok) return tooManyRequests(limit);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as ScrobbleBody | null;
  const currentTime = Math.max(0, finiteNumber(body?.currentTime, 0));
  const duration = Math.max(0, finiteNumber(body?.duration, 0));
  const suppliedPercent = typeof body?.percent === "number" && Number.isFinite(body.percent) ? body.percent : null;
  const percent = clampPercent(suppliedPercent ?? (duration > 0 ? currentTime / duration : 0));
  const finished = body?.completed === true || body?.event === "ended" || percent >= 0.9;
  const season = body?.season == null ? null : Math.max(0, Math.trunc(finiteNumber(body.season, 0)));
  const episode = body?.episode == null ? null : Math.max(0, Math.trunc(finiteNumber(body.episode, 0)));
  const title = body?.title?.trim() ?? "";
  const site = sanitizeSite(body?.site ?? body?.source);
  const now = new Date().toISOString();

  const { data: libraryRow, error: readError } = await supabase
    .from("library")
    .select("data")
    .eq("user_id", user.id)
    .maybeSingle<{ data: ReelItem[] }>();
  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });

  const items = Array.isArray(libraryRow?.data) ? [...libraryRow.data] : [];
  let tmdbId = Math.trunc(finiteNumber(body?.tmdbId, 0));
  let mediaType: "movie" | "series" | null = body?.mediaType === "movie" || body?.mediaType === "series"
    ? body.mediaType
    : (season != null || episode != null ? "series" : null);

  let index = -1;
  if (tmdbId > 0 && mediaType) {
    index = items.findIndex((item) => {
      if (item.tmdbId !== tmdbId) return false;
      if (mediaType === "movie") return item.type === "movie";
      return item.type === "series" || item.type === "anime";
    });
  }

  if (index < 0 && title) {
    const titleIndex = findLibraryTitleMatch(items, title, mediaType);
    if (titleIndex >= 0) {
      index = titleIndex;
      const matched = items[titleIndex]!;
      tmdbId = matched.tmdbId ?? 0;
      mediaType = mediaTypeForItem(matched);
    }
  }

  if (index < 0 && (tmdbId <= 0 || !mediaType)) {
    if (!title) {
      return NextResponse.json({ error: "A TMDB ID or identifiable media title is required" }, { status: 400 });
    }
    const resolved = await resolveTmdbTitle(title, mediaType, season, episode);
    if (!resolved) {
      return NextResponse.json({
        error: "Media title could not be matched confidently",
        unmatched: true,
      }, { status: 422 });
    }
    tmdbId = resolved.tmdbId;
    mediaType = resolved.mediaType;
    index = items.findIndex((item) => {
      if (item.tmdbId !== tmdbId) return false;
      if (mediaType === "movie") return item.type === "movie";
      return item.type === "series" || item.type === "anime";
    });
  }

  if (!mediaType) {
    return NextResponse.json({ error: "Media type could not be identified" }, { status: 422 });
  }
  if (mediaType === "series" && (season == null || episode == null || episode <= 0)) {
    return NextResponse.json({
      error: "Season and episode could not be identified confidently",
      unmatched: true,
    }, { status: 422 });
  }

  const wasMissing = index < 0;
  if (wasMissing) {
    if (tmdbId <= 0) {
      return NextResponse.json({ error: "A new library item needs a valid TMDB match" }, { status: 422 });
    }
    items.push(await createTmdbItem(tmdbId, mediaType, title || null, site));
    index = items.length - 1;
  }

  const existing = items[index];
  if (!existing) return NextResponse.json({ error: "Could not create library item" }, { status: 500 });
  const oldStatus = existing.status;
  const oldSeason = existing.progress.currentSeason;
  const oldEpisode = existing.progress.currentEpisode;
  const oldEpisodeTimestamp = existing.progress.episodeTimestamp;
  const oldLastCompletedSeason = existing.progress.lastCompletedSeason;
  const oldLastCompletedEpisode = existing.progress.lastCompletedEpisode;
  const progress = { ...existing.progress };
  let status: ReelItemStatus = existing.status;
  let completedAt = existing.completedAt;
  let advanced = false;
  let episodeCompleted = false;

  if (mediaType === "movie") {
    progress.movieTimestamp = finished ? null : Math.round(currentTime);
    progress.percentComplete = finished ? 100 : Math.max(progress.percentComplete, Math.round(percent * 100));
    if (finished) {
      if (status !== "completed") advanced = true;
      status = "completed";
      completedAt = completedAt ?? now;
    } else if (status !== "completed" && currentTime > 0) {
      status = "watching";
    }
  } else if (season != null && episode != null && episode > 0) {
    const canAdvance = isAheadOrEqual(season, episode, existing);
    const episodePercent = Math.round(percent * 100);
    if (finished && canAdvance) {
      advanced = season > (oldSeason ?? 0) || episode > (oldEpisode ?? 0);
      const alreadyRecorded = oldLastCompletedSeason === season && oldLastCompletedEpisode === episode;
      const sameEpisode = season === oldSeason && episode === oldEpisode;
      episodeCompleted = !alreadyRecorded && (advanced || (sameEpisode && oldEpisodeTimestamp != null) || wasMissing);
      progress.currentSeason = season;
      progress.currentEpisode = episode;
      progress.episodeTimestamp = null;
      progress.currentEpisodePercent = 100;
      if (!alreadyRecorded) {
        progress.lastCompletedSeason = season;
        progress.lastCompletedEpisode = episode;
        progress.lastCompletedAt = now;
      }
      if (progress.totalSeasons === 1 && progress.totalEpisodes && progress.totalEpisodes > 0) {
        progress.percentComplete = Math.max(progress.percentComplete, Math.min(99, Math.round((episode / progress.totalEpisodes) * 100)));
      }

      if (tmdbId > 0 && existing.totalSeasons && season >= existing.totalSeasons && process.env.TMDB_API_KEY) {
        try {
          const seasonDetail = await getSeasonDetails(tmdbId, season, process.env.TMDB_API_KEY);
          if (episode >= seasonDetail.episode_count) {
            status = "completed";
            progress.percentComplete = 100;
            completedAt = completedAt ?? now;
          } else if (status !== "completed") status = "watching";
        } catch {
          if (status !== "completed") status = "watching";
        }
      } else if (status !== "completed") status = "watching";
    } else if (!finished && status !== "completed") {
      status = "watching";
      if (canAdvance) {
        progress.currentSeason = season;
        progress.currentEpisode = episode;
        progress.episodeTimestamp = Math.round(currentTime);
        progress.currentEpisodePercent = episodePercent;
      }
    }
  }

  const updated: ReelItem = {
    ...existing,
    status,
    progress,
    completedAt,
    lastWatchedSite: site,
    updatedAt: now,
  };
  items[index] = updated;

  const { error: writeError } = await supabase.from("library").upsert(
    { user_id: user.id, data: items, updated_at: now },
    { onConflict: "user_id" },
  );
  if (writeError) return NextResponse.json({ error: writeError.message }, { status: 500 });

  const stateChanged = wasMissing || advanced || episodeCompleted || oldStatus !== updated.status;
  const queued = stateChanged ? await queueIntegrationPush(supabase, user.id, updated, episodeCompleted) : 0;
  return NextResponse.json({
    ok: true,
    itemId: updated.id,
    status: updated.status,
    season: updated.progress.currentSeason,
    episode: updated.progress.currentEpisode,
    percentComplete: updated.progress.percentComplete,
    currentEpisodePercent: updated.progress.currentEpisodePercent ?? 0,
    lastCompletedSeason: updated.progress.lastCompletedSeason ?? null,
    lastCompletedEpisode: updated.progress.lastCompletedEpisode ?? null,
    site,
    matchedBy: body?.tmdbId ? "tmdb" : (wasMissing ? "tmdb-title" : "library"),
    queued,
  });
}
