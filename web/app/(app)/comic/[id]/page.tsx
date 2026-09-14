import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { Suspense } from "react";
import { BookOpen, ExternalLink } from "lucide-react";
import { getComicDetail, getComicIssues, READING_LINKS, PUBLISHER_LABEL } from "@/lib/comics";
import { AmbientBackground } from "@/components/home/ambient-background";
import { BackButton } from "@/components/shell/back-button";
import { ExpandableText } from "@/components/detail/expandable-text";
import { AddToLibrary, type LibrarySeed } from "@/components/library/add-to-library";
import { AddToCollection } from "@/components/collections/add-to-collection";
import { ComicIssuesSection } from "@/components/comics/comic-issues-section";
import { ShareDialog } from "@/components/social/share-dialog";
import { FriendsWithTitle } from "@/components/social/friends-with-title";

export const revalidate = 86400;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const comicId = Number.parseInt(id, 10);
  if (!Number.isFinite(comicId)) return { title: "Comic unavailable · PBox" };
  const comic = await getComicDetail(comicId);
  if (!comic) return { title: "Comic unavailable · PBox" };
  const description = comic.synopsis || `Track ${comic.name} on PBox.`;
  const images = comic.coverUrl ? [comic.coverUrl] : [];
  return { title: `${comic.name} · PBox`, description, openGraph: { title: comic.name, description, type: "website", images }, twitter: { card: "summary_large_image", title: comic.name, description, images } };
}

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
    <div className="pb-14">
      <AmbientBackground imageUrl={comic.coverUrl} />

      <section className="relative overflow-hidden">
        {comic.coverUrl && (
          <>
            <Image
              src={comic.coverUrl}
              alt=""
              fill
              priority
              sizes="100vw"
              className="scale-125 object-cover object-center opacity-30 blur-3xl saturate-[1.1]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(to_top,var(--bg-base)_0%,color-mix(in_srgb,var(--bg-base)_76%,transparent)_35%,rgba(8,8,12,.18)_100%)]" />
          </>
        )}

        <div className="relative z-10 mx-auto max-w-[1400px] px-4 pb-8 pt-5 md:px-8 sm:pb-10 lg:pb-12">
          <BackButton fallbackHref="/comics" />

          <div className="mt-7 flex flex-col gap-6 sm:flex-row sm:items-end sm:gap-8 lg:mt-12">
            {comic.coverUrl && (
              <div className="relative aspect-[2/3] w-40 shrink-0 overflow-hidden rounded-[22px] border border-white/20 shadow-[0_28px_70px_rgba(0,0,0,.28)] sm:w-52 lg:w-56">
                <Image src={comic.coverUrl} alt={comic.name} fill sizes="224px" className="object-cover" priority />
              </div>
            )}

            <div className="min-w-0 max-w-4xl flex-1 pb-1">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Comic series</p>
              <h1 className="font-display text-4xl font-extrabold leading-[0.96] tracking-tight sm:text-6xl lg:text-7xl">{comic.name}</h1>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-[var(--text-secondary)]">
                {publisherLabel && (
                  <span className="rounded-full border border-[var(--border)] bg-[var(--glass)] px-3 py-1.5 font-semibold text-[var(--text)] backdrop-blur-md">{publisherLabel}</span>
                )}
                {comic.startYear !== null && <span className="rounded-full bg-[var(--glass)] px-3 py-1.5 backdrop-blur-md">Since {comic.startYear}</span>}
                {comic.issueCount > 0 && <span className="rounded-full bg-[var(--glass)] px-3 py-1.5 backdrop-blur-md">{comic.issueCount} issues</span>}
              </div>

              {comic.synopsis && (
                <div className="mt-4 max-w-3xl text-[15px] leading-7 text-[var(--text-secondary)]">
                  <ExpandableText text={comic.synopsis} />
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-3">
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
                <ShareDialog entity={{
                  kind: "title",
                  mediaKey: seed.id,
                  mediaType: "comic",
                  source: "comicvine",
                  sourceId: id,
                  title: comic.name,
                  year: comic.startYear,
                  posterUrl: comic.coverUrl,
                }} />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <a
                  href={readLink.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pb-uiverse-button pb-uiverse-button--accent inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white"
                >
                  <BookOpen className="size-4" /> Read on {readLink.name}
                </a>
                <a
                  href={comic.comicVineUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pb-uiverse-button pb-uiverse-button--glass inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-[var(--text-secondary)]"
                >
                  <ExternalLink className="size-4" /> Comic Vine
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1400px] space-y-10 px-4 md:px-8">
        {comic.people.length > 0 && (
          <section className="pb-uiverse-card pb-uiverse-card--feature rounded-[var(--radius-xl)] p-5 sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">Created by</p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{comic.people.map((person) => person.name).join(", ")}</p>
          </section>
        )}

        <div className="max-w-xl">
          <Suspense fallback={<div className="skeleton h-28 rounded-[var(--radius-lg)]" />}>
            <FriendsWithTitle mediaKey={seed.id} />
          </Suspense>
        </div>

        {comic.characters.length > 0 && (
          <section className="space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">Meet the cast</p>
              <h2 className="mt-1 font-display text-2xl font-bold">Characters</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {comic.characters.map((character) => (
                <span key={character.id} className="pb-uiverse-mini-card rounded-full px-3.5 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
                  {character.name}
                </span>
              ))}
            </div>
          </section>
        )}

        <ComicIssuesSection itemId={seed.id} issues={issues} />
      </div>
    </div>
  );
}
