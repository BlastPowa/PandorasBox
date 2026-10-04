import { Suspense } from "react";
import { getBooksByGenre } from "@/lib/books";
import { BooksBrowser } from "@/components/books/books-browser";
import { PosterSkeleton } from "@/components/ui-fx/feedback";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Books",
  description: "Browse highly rated books and genre shelves powered by Open Library.",
};

async function BooksContent() {
  try {
    const initial = await getBooksByGenre("featured");
    return <BooksBrowser initial={initial} />;
  } catch {
    return <><p role="status" className="mb-5 rounded-2xl border border-[var(--border)] bg-[var(--glass)] p-4 text-sm text-[var(--text-secondary)]">The book catalogue is temporarily unavailable. Try another shelf or reload in a moment.</p><BooksBrowser initial={[]} /></>;
  }
}

export default function BooksPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 md:px-8">
      <Suspense
        fallback={
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8">
            {Array.from({ length: 24 }).map((_, index) => <PosterSkeleton key={index} />)}
          </div>
        }
      >
        <BooksContent />
      </Suspense>
    </div>
  );
}
