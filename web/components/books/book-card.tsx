import Link from "next/link";
import { ArrowUpRight, Star } from "lucide-react";
import type { BookSummary } from "@/lib/books-shared";
import { BookCover } from "@/components/books/book-cover";

export function BookCard({ book }: { book: BookSummary }) {
  return (
    <Link
      href={`/book/${book.id}`}
      className="pb-uiverse-card pb-aura group relative block overflow-hidden rounded-[20px] border border-[var(--border)] bg-[var(--bg-surface)]"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden">
        <BookCover
          src={book.coverUrl}
          title={book.title}
          sizes="(max-width: 768px) 40vw, 220px"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.06]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(5,6,10,.96)_0%,rgba(5,6,10,.6)_30%,transparent_64%)]" />
        {book.rating !== null && (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/55 px-2.5 py-1 text-[10px] font-extrabold text-white backdrop-blur-md">
            <Star className="size-3 fill-current text-amber-300" /> {book.rating.toFixed(1)}
          </span>
        )}
        <span className="absolute right-2.5 top-2.5 grid size-8 translate-y-1 place-items-center rounded-full border border-white/15 bg-black/45 text-white opacity-0 backdrop-blur-md transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <ArrowUpRight className="size-4" />
        </span>
        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-3.5">
          <h3 className="line-clamp-2 text-[13px] font-bold leading-tight text-white sm:text-sm">{book.title}</h3>
          <p className="mt-1 line-clamp-1 text-[10px] font-medium text-white/65">
            {book.authors[0] ?? "Unknown author"}{book.year ? ` · ${book.year}` : ""}
          </p>
        </div>
      </div>
    </Link>
  );
}
