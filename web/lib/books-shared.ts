export type BookGenre =
  | "featured"
  | "fantasy"
  | "science_fiction"
  | "horror"
  | "romance"
  | "mystery_and_detective_stories"
  | "history"
  | "biography";

export interface BookGenreOption {
  value: BookGenre;
  label: string;
  subject: string;
}

export const BOOK_GENRES: BookGenreOption[] = [
  { value: "featured", label: "Top rated", subject: "fiction" },
  { value: "fantasy", label: "Fantasy", subject: "fantasy" },
  { value: "science_fiction", label: "Sci-Fi", subject: "science fiction" },
  { value: "horror", label: "Horror", subject: "horror" },
  { value: "romance", label: "Romance", subject: "romance" },
  { value: "mystery_and_detective_stories", label: "Mystery", subject: "mystery and detective stories" },
  { value: "history", label: "History", subject: "history" },
  { value: "biography", label: "Biography", subject: "biography" },
];

export interface BookSummary {
  id: string;
  title: string;
  authors: string[];
  coverUrl: string | null;
  year: number | null;
  rating: number | null;
  ratingsCount: number;
  editionCount: number;
  isbn: string | null;
  subjects: string[];
}

export interface BookDetail extends BookSummary {
  description: string | null;
  firstPublishDate: string | null;
  publishers: string[];
  openLibraryUrl: string;
  annaArchiveUrl: string;
}

export function isBookGenre(value: string | null): value is BookGenre {
  return BOOK_GENRES.some((genre) => genre.value === value);
}

export function bookGenreLabel(value: BookGenre): string {
  return BOOK_GENRES.find((genre) => genre.value === value)?.label ?? "Books";
}
