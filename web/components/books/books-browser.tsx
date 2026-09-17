"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpenText, Search, Sparkles } from "lucide-react";
import { BOOK_GENRES, bookGenreLabel, type BookGenre, type BookSummary } from "@/lib/books-shared";
import { BookCard } from "@/components/books/book-card";
import { PosterSkeleton } from "@/components/ui-fx/feedback";

export function BooksBrowser({ initial }: { initial: BookSummary[] }) {
  const [books, setBooks] = useState(initial);
  const [genre, setGenre] = useState<BookGenre>("featured");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!debounced && genre === "featured") return;
    if (debounced.length === 1) return;

    const controller = new AbortController();
    const params = new URLSearchParams();
    if (debounced.length >= 2) params.set("q", debounced);
    else params.set("genre", genre);

    fetch(`/api/books?${params.toString()}`, { signal: controller.signal })
      .then(async (res) => {
        const json = (await res.json()) as { results?: BookSummary[]; error?: string };
        if (!res.ok) throw new Error(json.error ?? "Could not load books");
        setBooks(json.results ?? []);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setBooks([]);
        setError(err instanceof Error ? err.message : "Could not load books");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [debounced, genre, initial]);

  const heading = useMemo(
    () => debounced.length >= 2 ? `Results for “${debounced}”` : bookGenreLabel(genre),
    [debounced, genre]
  );

  return (
    <div className="space-y-7">
      <section className="pb-uiverse-card pb-uiverse-card--hero relative overflow-hidden rounded-[28px] border border-[var(--border)] px-5 py-7 sm:px-8 sm:py-9">
        <div className="pointer-events-none absolute -right-12 -top-16 size-64 rounded-full bg-[rgb(var(--accent-rgb)/0.13)] blur-3xl" />
        <div className="relative max-w-3xl">
          <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.22em] text-[var(--accent)]">
            <Sparkles className="size-3.5" /> Pandora reads
          </p>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Books</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            Explore highly rated books and genre shelves from Open Library, then open the full work record or search externally by ISBN.
          </p>
          <label className="relative mt-5 block max-w-xl">
            <span className="sr-only">Search books</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={query}
              onChange={(event) => {
                const value = event.target.value;
                const trimmed = value.trim();
                setQuery(value);
                setError(null);
                if (!trimmed && genre === "featured") {
                  setBooks(initial);
                  setLoading(false);
                } else {
                  setLoading(trimmed.length !== 1);
                }
              }}
              placeholder="Search title, author, ISBN…"
              className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] pl-11 pr-4 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[rgb(var(--accent-rgb)/0.65)]"
            />
          </label>
        </div>
      </section>

      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {BOOK_GENRES.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              setGenre(option.value);
              setQuery("");
              setDebounced("");
              setError(null);
              if (option.value === "featured") {
                setBooks(initial);
                setLoading(false);
              } else {
                setLoading(true);
              }
            }}
            className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition ${genre === option.value && debounced.length < 2 ? "border-transparent bg-[linear-gradient(120deg,var(--accent),var(--accent-2))] text-white" : "border-[var(--border)] bg-[var(--glass)] text-[var(--text-secondary)] hover:text-[var(--text)]"}`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[var(--accent)]"><BookOpenText className="size-3.5" /> Open Library</p>
            <h2 className="mt-1 font-display text-2xl font-bold">{heading}</h2>
          </div>
          {!loading && <p className="text-xs font-medium text-[var(--text-muted)]">{books.length} books</p>}
        </div>

        {loading ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8">
            {Array.from({ length: 24 }).map((_, index) => <PosterSkeleton key={index} />)}
          </div>
        ) : error ? (
          <div className="pb-uiverse-card rounded-[20px] px-5 py-12 text-center text-sm text-[var(--text-secondary)]">{error}</div>
        ) : books.length === 0 ? (
          <div className="pb-uiverse-card rounded-[20px] px-5 py-12 text-center text-sm text-[var(--text-secondary)]">No books found. Try another title, author, ISBN, or genre.</div>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8">
            {books.map((book) => <BookCard key={book.id} book={book} />)}
          </div>
        )}
      </section>
    </div>
  );
}
