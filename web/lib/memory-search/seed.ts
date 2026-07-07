import "server-only";
import { createServiceClient } from "@/lib/supabase/admin";
import { indexTitle } from "@/lib/memory-search/index-writer";
import {
  getTrendingMovies,
  getPopularMovies,
  getTopRatedMovies,
  getTrendingSeries,
  getPopularSeries,
  getKdrama,
  getWesternAnimation,
  getMarvelMovies,
  getDcMovies,
  getDisneyMovies,
  getNostalgiaShows,
  getTrendingAnime,
  getPopularAnime,
  getTrendingManga,
} from "@/lib/discovery";

const SEED_THRESHOLD = 150;

/**
 * Bootstraps the memory-search corpus from titles we already fetch for
 * Home/Browse, so vague-search has something useful to match against even
 * before organic per-title indexing (via detail-page visits) catches up.
 * Fire-and-forget; runs at most once per cold corpus.
 */
export function seedIndexIfSparse(): void {
  void (async () => {
    try {
      const supabase = createServiceClient();
      const { count } = await supabase
        .from("memory_search_index")
        .select("media_key", { count: "exact", head: true });
      if ((count ?? 0) >= SEED_THRESHOLD) return;

      const lists = await Promise.all([
        getTrendingMovies(40),
        getPopularMovies(40),
        getTopRatedMovies(40),
        getTrendingSeries(40),
        getPopularSeries(40),
        getKdrama(20),
        getWesternAnimation(20),
        getMarvelMovies(20),
        getDcMovies(20),
        getDisneyMovies(20),
        getNostalgiaShows(20),
        getTrendingAnime(40),
        getPopularAnime(40),
        getTrendingManga(40),
      ]);

      for (const list of lists) {
        for (const item of list) {
          indexTitle({
            mediaKey: item.id,
            mediaType: item.type,
            title: item.title,
            year: item.year,
            posterUrl: item.posterUrl,
            synopsis: item.synopsis,
            genres: [],
          });
        }
      }
    } catch {
      // seeding is best-effort
    }
  })();
}
