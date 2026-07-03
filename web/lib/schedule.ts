import "server-only";

const ANILIST_URL = "https://graphql.anilist.co";

export interface ScheduleEntry {
  mediaId: number;
  title: string;
  coverUrl: string | null;
  episode: number;
  airingAt: number;
  type: "anime";
}

interface AiringNode {
  episode: number;
  airingAt: number;
  media: {
    id: number;
    title: { english: string | null; romaji: string };
    coverImage: { large: string | null };
    isAdult: boolean;
    format: string | null;
    popularity: number | null;
  };
}

/** Live weekly anime airing schedule from AniList (no API key required). */
export async function getAiringWeek(): Promise<ScheduleEntry[]> {
  const now = Math.floor(Date.now() / 1000);
  const weekEnd = now + 60 * 60 * 24 * 7;
  const query = `
    query ($start: Int, $end: Int) {
      Page(page: 1, perPage: 50) {
        airingSchedules(airingAt_greater: $start, airingAt_lesser: $end, sort: TIME) {
          episode
          airingAt
          media {
            id
            title { english romaji }
            coverImage { large }
            isAdult
            format
            popularity
          }
        }
      }
    }
  `;
  try {
    const res = await fetch(ANILIST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, variables: { start: now, end: weekEnd } }),
      next: { revalidate: 60 * 30 },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: { Page?: { airingSchedules?: AiringNode[] } } };
    const nodes = json.data?.Page?.airingSchedules ?? [];
    return nodes
      .filter((n) => !n.media.isAdult && (n.media.popularity ?? 0) > 5000)
      .map((n) => ({
        mediaId: n.media.id,
        title: n.media.title.english ?? n.media.title.romaji,
        coverUrl: n.media.coverImage.large,
        episode: n.episode,
        airingAt: n.airingAt,
        type: "anime" as const,
      }));
  } catch {
    return [];
  }
}
