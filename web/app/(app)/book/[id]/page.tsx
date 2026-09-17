import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { CalendarDays, ExternalLink, LibraryBig, Star, UserRound } from "lucide-react";
import { getBookDetail } from "@/lib/books";
import { AmbientBackground } from "@/components/home/ambient-background";
import { BackButton } from "@/components/shell/back-button";
import { ExpandableText } from "@/components/detail/expandable-text";

export const revalidate = 21600;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const book = await getBookDetail(id);
  if (!book) return { title: "Book unavailable · PBox" };
  const description = book.description ?? `Explore ${book.title} on Pandora's Box.`;
  const images = book.coverUrl ? [book.coverUrl] : [];
  return {
    title: `${book.title} · PBox`,
    description,
    openGraph: { title: book.title, description, type: "website", images },
    twitter: { card: "summary_large_image", title: book.title, description, images },
  };
}

export default async function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const book = await getBookDetail(id);
  if (!book) notFound();

  return (
    <div className="pb-14">
      <AmbientBackground imageUrl={book.coverUrl} />
      <section className="relative overflow-hidden">
        {book.coverUrl && (
          <>
            <Image src={book.coverUrl} alt="" fill priority sizes="100vw" className="scale-125 object-cover object-center opacity-25 blur-3xl saturate-[1.1]" />
            <div className="absolute inset-0 bg-[linear-gradient(to_top,var(--bg-base)_0%,color-mix(in_srgb,var(--bg-base)_76%,transparent)_35%,rgba(8,8,12,.18)_100%)]" />
          </>
        )}

        <div className="relative z-10 mx-auto max-w-[1400px] px-4 pb-10 pt-5 md:px-8 lg:pb-14">
          <BackButton fallbackHref="/books" />
          <div className="mt-7 grid gap-6 sm:grid-cols-[auto_1fr] sm:items-end sm:gap-8 lg:mt-12 lg:grid-cols-[auto_minmax(0,1fr)_280px]">
            <div className="relative aspect-[2/3] w-40 shrink-0 overflow-hidden rounded-[22px] border border-white/20 bg-[var(--bg-elevated)] shadow-[0_28px_70px_rgba(0,0,0,.28)] sm:w-52 lg:w-56">
              {book.coverUrl ? (
                <Image src={book.coverUrl} alt={book.title} fill sizes="224px" className="object-cover" priority />
              ) : (
                <div className="grid size-full place-items-center px-5 text-center font-display text-lg font-bold text-[var(--text-muted)]">{book.title}</div>
              )}
            </div>

            <div className="min-w-0 max-w-4xl pb-1">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Book</p>
              <h1 className="font-display text-4xl font-extrabold leading-[0.96] tracking-tight sm:text-6xl lg:text-7xl">{book.title}</h1>
              {book.authors.length > 0 && <p className="mt-3 text-base font-semibold text-[var(--text-secondary)]">by {book.authors.join(", ")}</p>}

              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-[var(--text-secondary)]">
                {book.rating !== null && <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--glass)] px-3 py-1.5 font-semibold text-[var(--text)]"><Star className="size-3.5 fill-current text-amber-400" /> {book.rating.toFixed(1)}{book.ratingsCount > 0 ? ` (${book.ratingsCount.toLocaleString()})` : ""}</span>}
                {book.year !== null && <span className="rounded-full bg-[var(--glass)] px-3 py-1.5 backdrop-blur-md">First published {book.year}</span>}
                {book.editionCount > 0 && <span className="rounded-full bg-[var(--glass)] px-3 py-1.5 backdrop-blur-md">{book.editionCount.toLocaleString()} editions</span>}
              </div>

              {book.description && (
                <div className="mt-4 max-w-3xl text-[15px] leading-7 text-[var(--text-secondary)]">
                  <ExpandableText text={book.description} />
                </div>
              )}

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <a href={book.annaArchiveUrl} target="_blank" rel="noopener noreferrer" className="pb-uiverse-button pb-uiverse-button--accent inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white">
                  <ExternalLink className="size-4" /> Find on Anna&apos;s Archive
                </a>
                <a href={book.openLibraryUrl} target="_blank" rel="noopener noreferrer" className="pb-uiverse-button pb-uiverse-button--glass inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-[var(--text-secondary)]">
                  <ExternalLink className="size-4" /> Open Library
                </a>
              </div>
            </div>

            <aside className="pb-uiverse-card pb-uiverse-card--compact hidden rounded-[22px] border border-[var(--border)] bg-[var(--glass)] p-4 text-[var(--text)] backdrop-blur-xl lg:block">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[var(--accent)]">Book snapshot</p>
              <div className="mt-3 space-y-2">
                <div className="pb-uiverse-row flex items-center gap-3 rounded-xl px-3 py-3">
                  <UserRound className="size-4 text-[var(--accent)]" />
                  <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">Author</p><p className="truncate text-sm font-bold">{book.authors[0] ?? "Unknown"}</p></div>
                </div>
                <div className="pb-uiverse-row flex items-center gap-3 rounded-xl px-3 py-3">
                  <CalendarDays className="size-4 text-[var(--accent)]" />
                  <div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">Published</p><p className="text-sm font-bold">{book.firstPublishDate ?? book.year ?? "Unknown"}</p></div>
                </div>
                <div className="pb-uiverse-row flex items-center gap-3 rounded-xl px-3 py-3">
                  <LibraryBig className="size-4 text-[var(--accent)]" />
                  <div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">ISBN</p><p className="truncate text-sm font-bold">{book.isbn ?? "Not listed"}</p></div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1400px] space-y-8 px-4 md:px-8">
        {book.subjects.length > 0 && (
          <section className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">Genres & subjects</p>
            <div className="flex flex-wrap gap-2">
              {book.subjects.map((subject) => <span key={subject} className="pb-uiverse-mini-card rounded-full px-3.5 py-1.5 text-xs font-medium text-[var(--text-secondary)]">{subject}</span>)}
            </div>
          </section>
        )}
        {book.publishers.length > 0 && (
          <section className="pb-uiverse-card pb-uiverse-card--feature max-w-3xl rounded-[var(--radius-xl)] p-5 sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">Publishers</p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{book.publishers.join(", ")}</p>
          </section>
        )}
      </div>
    </div>
  );
}
