export type RandomType = "any" | "movie" | "series" | "anime" | "manga";

export interface RandomFilters {
  type: RandomType;
  genre: string | null;
}

/** Genre → { tmdbMovie, tmdbTv, anilist } id/name mapping so one picker works across all sources. */
export const GENRE_MAP: Record<string, { movie?: number; tv?: number; anilist?: string }> = {
  Action: { movie: 28, tv: 10759, anilist: "Action" },
  Adventure: { movie: 12, tv: 10759, anilist: "Adventure" },
  Comedy: { movie: 35, tv: 35, anilist: "Comedy" },
  Drama: { movie: 18, tv: 18, anilist: "Drama" },
  Fantasy: { movie: 14, tv: 10765, anilist: "Fantasy" },
  Horror: { movie: 27, anilist: "Horror" },
  Romance: { movie: 10749, anilist: "Romance" },
  "Sci-Fi": { movie: 878, tv: 10765, anilist: "Sci-Fi" },
  Thriller: { movie: 53, tv: 9648, anilist: "Thriller" },
  Mystery: { movie: 9648, tv: 9648, anilist: "Mystery" },
  Animation: { movie: 16, tv: 16 },
  "Slice of Life": { anilist: "Slice of Life" },
  Supernatural: { anilist: "Supernatural" },
  Sports: { anilist: "Sports" },
  Psychological: { anilist: "Psychological" },
};

export const GENRE_OPTIONS = Object.keys(GENRE_MAP);
