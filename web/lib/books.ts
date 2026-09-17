import "server-only";
import {
  BOOK_GENRES,
  type BookDetail,
  type BookGenre,
  type BookSummary,
} from "./books-shared";

export * from "./books-shared";

const OPEN_LIBRARY = "https://openlibrary.org";
const CACHE_SECONDS = 6 * 60 * 60;

interface OpenLibrarySearchDoc {
  key?: string;
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  isbn?: string[];
  ratings_average?: number;
  ratings_count?: number;
  subject?: string[];
  edition_count?: number;
}

interface OpenLibraryWork {
  key?: string;
  title?: string;
  description?: string | { value?: string };
  covers?: number[];
  subjects?: string[];
  first_publish_date?: string;
  authors?: Array<{ author?: { key?: string } }>;
}

interface OpenLibraryAuthor {
  name?: string;
}

interface OpenLibraryEdition {
  isbn_13?: string[];
  isbn_10?: string[];
  publishers?: string[];
  publish_date?: string;
  covers?: number[];
}

function normalizedIsbn(value: string | null | undefined): string | null {
  if (!value) return null;
  const clean = value.replace(/[-\s]/g, "").toUpperCase();
  return /^(?:97[89]\d{10}|\d{9}[\dX])$/.test(clean) ? clean : null;
}

function coverUrl(
  coverId: number | null | undefined,
  isbn: string | null | undefined,
  size: "M" | "L" = "L"
): string | null {
  if (Number.isFinite(coverId) && (coverId ?? 0) > 0) {
    return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg?default=false`;
  }
  const cleanIsbn = normalizedIsbn(isbn);
  return cleanIsbn
    ? `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-${size}.jpg?default=false`
    : null;
}

function normalizeWorkId(key: string | undefined): string | null {
  if (!key) return null;
  const id = key.replace(/^\/works\//, "").trim();
  return /^OL\d+W$/i.test(id) ? id : null;
}

function weightedRating(book: BookSummary): number {
  if (book.rating == null) return -1;
  return book.rating * Math.log10(Math.max(10, book.ratingsCount + 1));
}

function mapSearchDoc(doc: OpenLibrarySearchDoc): BookSummary | null {
  const id = normalizeWorkId(doc.key);
  const title = doc.title?.trim();
  if (!id || !title) return null;
  const isbn = doc.isbn?.map(normalizedIsbn).find((value): value is string => Boolean(value)) ?? null;
  return {
    id,
    title,
    authors: (doc.author_name ?? []).filter(Boolean).slice(0, 4),
    coverUrl: coverUrl(doc.cover_i, isbn),
    year: Number.isFinite(doc.first_publish_year) ? (doc.first_publish_year ?? null) : null,
    rating: Number.isFinite(doc.ratings_average) ? Math.round((doc.ratings_average ?? 0) * 10) / 10 : null,
    ratingsCount: doc.ratings_count ?? 0,
    editionCount: doc.edition_count ?? 0,
    isbn,
    subjects: (doc.subject ?? []).filter(Boolean).slice(0, 8),
  };
}

async function searchOpenLibrary(query: string, limit = 48): Promise<BookSummary[]> {
  const params = new URLSearchParams({
    q: query,
    limit: String(Math.min(80, Math.max(1, limit))),
    fields: "key,title,author_name,first_publish_year,cover_i,isbn,ratings_average,ratings_count,subject,edition_count",
  });
  const res = await fetch(`${OPEN_LIBRARY}/search.json?${params.toString()}`, {
    headers: { "User-Agent": "PandorasBox/1.0" },
    next: { revalidate: CACHE_SECONDS },
  });
  if (!res.ok) throw new Error(`Open Library search failed (${res.status})`);
  const json = (await res.json()) as { docs?: OpenLibrarySearchDoc[] };
  const seen = new Set<string>();
  return (json.docs ?? [])
    .map(mapSearchDoc)
    .filter((book): book is BookSummary => {
      if (!book || seen.has(book.id)) return false;
      seen.add(book.id);
      return true;
    });
}

export async function getBooksByGenre(genre: BookGenre): Promise<BookSummary[]> {
  const option = BOOK_GENRES.find((item) => item.value === genre) ?? BOOK_GENRES[0];
  const books = await searchOpenLibrary(`subject:"${option.subject}"`, genre === "featured" ? 72 : 56);
  return books
    .filter((book) => book.coverUrl || book.ratingsCount > 0)
    .sort((a, b) => {
      const byRating = weightedRating(b) - weightedRating(a);
      if (byRating !== 0) return byRating;
      return b.ratingsCount - a.ratingsCount;
    })
    .slice(0, 48);
}

export async function searchBooks(query: string): Promise<BookSummary[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  return (await searchOpenLibrary(trimmed.slice(0, 120), 60)).slice(0, 48);
}

export function annaArchiveSearchUrl(book: Pick<BookSummary, "isbn" | "title" | "authors">): string {
  const query = normalizedIsbn(book.isbn) || [book.title.trim(), book.authors[0]?.trim()].filter(Boolean).join(" ");
  return `https://annas-archive.cc/s/?q=${encodeURIComponent(query)}`;
}

function descriptionText(value: OpenLibraryWork["description"]): string | null {
  const raw = typeof value === "string" ? value : value?.value;
  if (!raw) return null;
  const clean = raw.replace(/\s+/g, " ").trim();
  return clean || null;
}

export async function getBookDetail(id: string): Promise<BookDetail | null> {
  if (!/^OL\d+W$/i.test(id)) return null;
  const workId = id.toUpperCase();
  const [workRes, ratingsRes, editionsRes] = await Promise.all([
    fetch(`${OPEN_LIBRARY}/works/${workId}.json`, { headers: { "User-Agent": "PandorasBox/1.0" }, next: { revalidate: CACHE_SECONDS } }),
    fetch(`${OPEN_LIBRARY}/works/${workId}/ratings.json`, { headers: { "User-Agent": "PandorasBox/1.0" }, next: { revalidate: CACHE_SECONDS } }),
    fetch(`${OPEN_LIBRARY}/works/${workId}/editions.json?limit=30`, { headers: { "User-Agent": "PandorasBox/1.0" }, next: { revalidate: CACHE_SECONDS } }),
  ]);
  if (!workRes.ok) return null;

  const work = (await workRes.json()) as OpenLibraryWork;
  const ratings = ratingsRes.ok
    ? (await ratingsRes.json()) as { summary?: { average?: number; count?: number } }
    : null;
  const editionsJson = editionsRes.ok
    ? (await editionsRes.json()) as { entries?: OpenLibraryEdition[]; size?: number }
    : null;
  const editions = editionsJson?.entries ?? [];

  const authorKeys = (work.authors ?? [])
    .map((entry) => entry.author?.key)
    .filter((key): key is string => Boolean(key))
    .slice(0, 6);
  const authors = (await Promise.all(authorKeys.map(async (key) => {
    try {
      const res = await fetch(`${OPEN_LIBRARY}${key}.json`, {
        headers: { "User-Agent": "PandorasBox/1.0" },
        next: { revalidate: CACHE_SECONDS },
      });
      if (!res.ok) return null;
      return ((await res.json()) as OpenLibraryAuthor).name?.trim() || null;
    } catch {
      return null;
    }
  }))).filter((name): name is string => Boolean(name));

  const isbn = editions
    .flatMap((edition) => [...(edition.isbn_13 ?? []), ...(edition.isbn_10 ?? [])])
    .map(normalizedIsbn)
    .find((value): value is string => Boolean(value))
    ?? null;
  const coverId = work.covers?.find((value) => value > 0)
    ?? editions.flatMap((edition) => edition.covers ?? []).find((value) => value > 0)
    ?? null;
  const publishers = [...new Set(editions.flatMap((edition) => edition.publishers ?? []).filter(Boolean))].slice(0, 8);
  const yearMatch = (work.first_publish_date ?? editions.find((edition) => edition.publish_date)?.publish_date ?? "").match(/\d{4}/);
  const ratingAverage = ratings?.summary?.average;

  const summary: BookSummary = {
    id: workId,
    title: work.title?.trim() || "Untitled book",
    authors,
    coverUrl: coverUrl(coverId, isbn),
    year: yearMatch ? Number.parseInt(yearMatch[0], 10) : null,
    rating: Number.isFinite(ratingAverage) ? Math.round((ratingAverage ?? 0) * 10) / 10 : null,
    ratingsCount: ratings?.summary?.count ?? 0,
    editionCount: editionsJson?.size ?? editions.length,
    isbn,
    subjects: (work.subjects ?? []).filter(Boolean).slice(0, 18),
  };

  return {
    ...summary,
    description: descriptionText(work.description),
    firstPublishDate: work.first_publish_date ?? null,
    publishers,
    openLibraryUrl: `${OPEN_LIBRARY}/works/${workId}`,
    annaArchiveUrl: annaArchiveSearchUrl(summary),
  };
}
