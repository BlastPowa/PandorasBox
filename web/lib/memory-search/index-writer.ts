import "server-only";
import { createServiceClient } from "@/lib/supabase/admin";

export interface IndexableTitle {
  mediaKey: string;
  mediaType: string;
  title: string;
  altTitles?: string[];
  year: number | null;
  posterUrl: string | null;
  synopsis: string | null;
  genres: string[];
  keywords?: string[];
  isAdult?: boolean;
}

/**
 * Fire-and-forget upsert into memory_search_index. Called opportunistically
 * whenever a title's detail is fetched, so the corpus that "Memory Search"
 * can match against grows organically as people browse — no separate crawl
 * job required to get useful results.
 */
export function indexTitle(t: IndexableTitle): void {
  if (!t.title) return;
  void (async () => {
    try {
      const supabase = createServiceClient();
      const keywords = t.keywords ?? [];
      const document = [t.title, ...(t.altTitles ?? []), t.synopsis ?? "", ...t.genres, ...keywords]
        .filter(Boolean)
        .join(" ");
      await supabase.from("memory_search_index").upsert({
        media_key: t.mediaKey,
        media_type: t.mediaType,
        title: t.title,
        alt_titles: t.altTitles ?? [],
        year: t.year,
        poster_url: t.posterUrl,
        document,
        keywords: [...t.genres, ...keywords],
        is_adult: t.isAdult ?? false,
        updated_at: new Date().toISOString(),
      });
    } catch {
      // indexing is best-effort and must never affect the page that triggered it
    }
  })();
}
