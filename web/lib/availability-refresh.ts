import "server-only";
import { createServiceClient } from "@/lib/supabase/admin";
import type { ReelItem } from "@core/storage/schema";
import { getAiringSchedule } from "@core/api/anilist";
import { getSeriesDetails, getMovieDetails } from "@core/api/tmdb";
import { getLatestChapter } from "@core/api/mangadex";

interface AvailabilityRow {
  media_key: string;
  status: string | null;
  hd_available: boolean;
  digital_date: string | null;
  next_episode: number | null;
  next_chapter: number | null;
  next_air_at: string | null;
  updated_at: string;
}

const MAX_TITLES = 150;

/**
 * Reads every user's library, then refreshes the shared `availability` cache from
 * authoritative public APIs (AniList exact air times, TMDB release/HD status,
 * MangaDex latest chapter). These are the same sources Google surfaces, via stable APIs.
 */
export async function refreshAvailability(): Promise<{ updated: number }> {
  const supabase = createServiceClient();
  const tmdbKey = process.env.TMDB_API_KEY ?? "";

  const { data, error } = await supabase.from("library").select("data");
  if (error) throw new Error(`Could not read libraries: ${error.message}`);

  const seen = new Map<string, ReelItem>();
  for (const row of (data as { data: ReelItem[] }[] | null) ?? []) {
    for (const item of row.data ?? []) {
      if (!seen.has(item.id)) seen.set(item.id, item);
    }
  }

  const active = Array.from(seen.values())
    .filter(
      (i) =>
        (i.status === "watching" && (i.type === "anime" || i.type === "series" || i.type === "movie")) ||
        ((i.status === "reading") && (i.type === "manga" || i.type === "manhwa"))
    )
    .slice(0, MAX_TITLES);

  const rows: AvailabilityRow[] = [];
  const now = new Date().toISOString();

  for (const item of active) {
    try {
      if (item.type === "anime" && item.anilistId !== null) {
        const airing = await getAiringSchedule(item.anilistId);
        rows.push({
          media_key: item.id,
          status: airing ? "airing" : "finished",
          hd_available: false,
          digital_date: null,
          next_episode: airing?.episode ?? null,
          next_chapter: null,
          next_air_at: airing ? new Date(airing.airingAt * 1000).toISOString() : null,
          updated_at: now,
        });
      } else if (item.type === "series" && item.tmdbId !== null && tmdbKey) {
        const s = await getSeriesDetails(item.tmdbId, tmdbKey);
        rows.push({
          media_key: item.id,
          status: s.status === "Returning Series" ? "airing" : "finished",
          hd_available: true,
          digital_date: null,
          next_episode: s.number_of_episodes > (item.totalEpisodes ?? 0) ? (item.totalEpisodes ?? 0) + 1 : null,
          next_chapter: null,
          next_air_at: null,
          updated_at: now,
        });
      } else if (item.type === "movie" && item.tmdbId !== null && tmdbKey) {
        const digital = await getMovieDigitalStatus(item.tmdbId, tmdbKey);
        rows.push({
          media_key: item.id,
          status: digital.digital ? "digital" : "released",
          hd_available: digital.digital,
          digital_date: digital.date,
          next_episode: null,
          next_chapter: null,
          next_air_at: null,
          updated_at: now,
        });
      } else if ((item.type === "manga" || item.type === "manhwa") && item.mangadexId !== null) {
        const latest = await getLatestChapter(item.mangadexId);
        const num = latest?.attributes.chapter ? Number.parseFloat(latest.attributes.chapter) : null;
        const current = item.progress.currentChapter ?? 0;
        rows.push({
          media_key: item.id,
          status: "airing",
          hd_available: false,
          digital_date: null,
          next_episode: null,
          next_chapter: num !== null && num > current ? num : null,
          next_air_at: null,
          updated_at: now,
        });
      }
    } catch {
      continue;
    }
  }

  if (rows.length > 0) {
    const { error: upsertErr } = await supabase.from("availability").upsert(rows, { onConflict: "media_key" });
    if (upsertErr) throw new Error(`Upsert failed: ${upsertErr.message}`);
  }

  return { updated: rows.length };
}

async function getMovieDigitalStatus(
  tmdbId: number,
  key: string
): Promise<{ digital: boolean; date: string | null }> {
  try {
    const res = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}/release_dates?api_key=${key}`, {
      cache: "no-store",
    });
    if (!res.ok) return { digital: false, date: null };
    const json = (await res.json()) as {
      results?: { release_dates: { type: number; release_date: string }[] }[];
    };
    let digitalDate: string | null = null;
    for (const country of json.results ?? []) {
      for (const rd of country.release_dates) {
        // type 4 = Digital, 5 = Physical
        if ((rd.type === 4 || rd.type === 5) && rd.release_date) {
          const d = rd.release_date.slice(0, 10);
          if (!digitalDate || d < digitalDate) digitalDate = d;
        }
      }
    }
    const isOut = digitalDate !== null && new Date(digitalDate) <= new Date();
    return { digital: isOut, date: digitalDate };
  } catch {
    return { digital: false, date: null };
  }
}
