import { notFound } from "next/navigation";
import Image from "next/image";
import { BookOpen, ExternalLink } from "lucide-react";
import { getComicDetail, getComicIssues, READING_LINKS, PUBLISHER_LABEL } from "@/lib/comics";
import { AmbientBackground } from "@/components/home/ambient-background";
import { BackButton } from "@/components/shell/back-button";
import { ExpandableText } from "@/components/detail/expandable-text";
import { AddToLibrary, type LibrarySeed } from "@/components/library/add-to-library";
import { AddToCollection } from "@/components/collections/add-to-collection";

export const revalidate = 86400;

export default async function ComicDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const comicId = Number.parseInt(id, 10);
  if (!Number.isFinite(comicId)) notFound();

  const [comic, issues] = await Promise.all([getComicDetail(comicId), getComicIssues(comicId)]);
  if (!comic) notFound();

  const readLink = READING_LINKS[comic.publisher];
  const publisherLabel = comic.publisher === "other" ? null : PUBLISHER_LABEL[comic.publisher];

  const seed: LibrarySeed = {
    id: `comicvine-${comic.id}`,
    source: "comicvine",
    type: "comic",
    title: comic.name,
    posterUrl: comic.coverUrl,
    backdropUrl: null,
    synopsis: comic.synopsis,
    genres: [],
    year: comic.startYear,
    totalEpisodes: null,
    totalChapters: comic.issueCount > 0 ? comic.issueCount : null,
    totalSeasons: null,
    anilistId: null,
    tmdbId: null,
    mangadexId: null,
    malId: null,
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8">
      <AmbientBackground imageUrl={comic.coverUrl} />
      <BackButton fallbackHref="/comics" />

      <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:gap-8">
        {comic.coverUrl && (
          <div className="relative aspect-[2/3] w-40 shrink-0 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] sm:w-52">
            <Image src={comic.coverUrl} alt={comic.name} fill sizes="208px" className="object-cover" priority />
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-4">
          <h1 className="font-display text-3xl font-extrabold leading-tight sm:text-5xl">{comic.name}</h1>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-[var(--text-secondary)]">
            {publisherLabel && (
              <span className="rounded-full bg-[var(--glass)] px-3 py-1 font-semibold text-[var(--text)]">{publisherLabel}</span>
            )}
            {comic.startYear !== null && <span>Since {comic.startYear}</span>}
            {comic.issueCount > 0 && <span className="text-[var(--text-muted)]">{comic.issueCount} issues</span>}
          </div>

          {comic.synopsis && (
            <div className="max-w-2xl">
              <ExpandableText text={comic.synopsis} />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <AddToLibrary seed={seed} />
            <AddToCollection
              item={{
                id: seed.id,
                type: "comic",
                source: "comicvine",
                title: comic.name,
                posterUrl: comic.coverUrl,
                year: comic.startYear,
                anilistId: null,
                tmdbId: null,
                mangadexId: null,
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href={readLink.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--glass)] px-5 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--glass-strong)]"
            >
              <BookOpen className="size-4" /> Read on {readLink.name}
            </a>
            <a
              href={comic.comicVineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="glass inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--glass-strong)]"
            >
              <ExternalLink className="size-4" /> Comic Vine
            </a>
          </div>

          {comic.people.length > 0 && (
            <p className="pt-1 text-xs text-[var(--text-muted)]">
              <span className="font-semibold text-[var(--text-secondary)]">Creators:</span>{" "}
              {comic.people.map((p) => p.name).join(", ")}
            </p>
          )}
        </div>
      </div>

      <div className="mt-10 space-y-10">
        {comic.characters.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold">Characters</h2>
            <div className="flex flex-wrap gap-2">
              {comic.characters.map((c) => (
                <span key={c.id} className="rounded-full bg-[var(--glass)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
                  {c.name}
                </span>
              ))}
            </div>
          </section>
        )}

        {issues.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold">Recent Issues</h2>
            <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {issues.map((iss) => (
                <a
                  key={iss.id}
                  href={iss.comicVineUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group w-32 shrink-0 snap-start"
                >
                  <div className="relative aspect-[2/3] w-full overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)]">
                    {iss.coverUrl ? (
                      <Image src={iss.coverUrl} alt={iss.name ?? `Issue ${iss.issueNumber}`} fill sizes="128px" className="object-cover transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <div className="grid size-full place-items-center font-display text-xl font-bold text-[var(--text-muted)]">
                        #{iss.issueNumber}
                      </div>
                    )}
                  </div>
                  <p className="mt-1.5 line-clamp-1 text-xs font-semibold">
                    {iss.issueNumber ? `#${iss.issueNumber}` : ""} {iss.name ?? ""}
                  </p>
                  {iss.coverDate && (
                    <p className="font-mono text-[10px] text-[var(--text-muted)]">{iss.coverDate.slice(0, 7)}</p>
                  )}
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
