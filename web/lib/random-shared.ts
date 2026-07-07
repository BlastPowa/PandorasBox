export type RandomType = "any" | "movie" | "series" | "kdrama" | "anime" | "manga";
export type GenreMode = "any" | "all";

export interface RandomFilters {
  type: RandomType;
  genres: string[];
  mode: GenreMode;
}

/** TMDB movie genre ids (real, so filtering actually works). */
export const MOVIE_GENRES: Record<string, number> = {
  Action: 28,
  Adventure: 12,
  Animation: 16,
  Comedy: 35,
  Crime: 80,
  Documentary: 99,
  Drama: 18,
  Family: 10751,
  Fantasy: 14,
  History: 36,
  Horror: 27,
  Music: 10402,
  Mystery: 9648,
  Romance: 10749,
  "Sci-Fi": 878,
  Thriller: 53,
  War: 10752,
  Western: 37,
};

/** TMDB TV genre ids (note TV uses combined buckets like Action & Adventure). */
export const TV_GENRES: Record<string, number> = {
  Action: 10759,
  Adventure: 10759,
  Animation: 16,
  Comedy: 35,
  Crime: 80,
  Documentary: 99,
  Drama: 18,
  Family: 10751,
  Fantasy: 10765,
  Kids: 10762,
  Mystery: 9648,
  Reality: 10764,
  Romance: 18,
  "Sci-Fi": 10765,
  Thriller: 9648,
  War: 10768,
  Western: 37,
};

/** Valid AniList genre names. */
export const ANILIST_GENRES: string[] = [
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Fantasy",
  "Horror",
  "Mahou Shoujo",
  "Mecha",
  "Music",
  "Mystery",
  "Psychological",
  "Romance",
  "Sci-Fi",
  "Slice of Life",
  "Sports",
  "Supernatural",
  "Thriller",
];

const ANY_GENRES = [
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Fantasy",
  "Sci-Fi",
  "Mystery",
  "Romance",
  "Thriller",
  "Horror",
  "Animation",
];

/** Genres valid for a given type — the UI only shows these so filters always apply. */
export function genresForType(type: RandomType): string[] {
  switch (type) {
    case "movie":
      return Object.keys(MOVIE_GENRES);
    case "series":
    case "kdrama":
      return Object.keys(TV_GENRES);
    case "anime":
    case "manga":
      return ANILIST_GENRES;
    default:
      return ANY_GENRES;
  }
}

export function movieGenreIds(genres: string[]): number[] {
  return genres.map((g) => MOVIE_GENRES[g]).filter((id): id is number => id !== undefined);
}
export function tvGenreIds(genres: string[]): number[] {
  // De-dupe: TV buckets merge (Action & Adventure share 10759)
  return Array.from(new Set(genres.map((g) => TV_GENRES[g]).filter((id): id is number => id !== undefined)));
}
export function anilistGenres(genres: string[]): string[] {
  return genres.filter((g) => ANILIST_GENRES.includes(g));
}
