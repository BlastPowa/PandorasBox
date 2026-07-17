import Image from "next/image";
import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Clock, Layers, Star, Sparkles, Tv, Zap, Globe } from "lucide-react";
import type { ReelItemType } from "@core/storage/schema";
import { formatRuntime, formatAirDate } from "@core/utils/formatters";
import { getDetail } from "@/lib/detail";
import { getCuratedLinks, getAvailability, curatedToWatchOptions } from "@/lib/db/media";
import { getProfile } from "@/lib/auth";
import { TypeBadge } from "@/components/ui-fx/badge";
import { GlassCard } from "@/components/ui-fx/glass-card";
import { AddToLibrary, type LibrarySeed } from "@/components/library/add-to-library";
import { TrailerButton } from "@/components/detail/trailer-button";
import { EpisodesSection } from "@/components/detail/episodes-section";
import { AnimeEpisodesSection } from "@/components/detail/anime-episodes-section";
import { AddToCollection } from "@/components/collections/add-to-collection";
import { getTrailerKey } from "@/lib/trailers";
import { WhereToWatch } from "@/components/detail/where-to-watch";
import { PosterRow } from "@/components/discovery/poster-row";
import { ExpandableText } from "@/components/detail/expandable-text";
import { BackButton } from "@/components/shell/back-button";
import { ReviewsPanel } from "@/components/reviews/reviews-panel";
import { ShareDialog } from "@/components/social/share-dialog";
import { FriendsWithTitle } from "@/components/social/friends-with-title";

const VALID_TYPES: ReelItemType[] = ["movie", "series", "anime", "manga", "manhwa"];

export async function generateMetadata({ params }: { params: Promise<{ type: string; source: string; id: string }> }): Promise<Metadata> {
  const { type, source, id } = await params;
  if (!VALID_TYPES.includes(type as ReelItemType)) return { title: "Title unavailable · PBox" };
  const detail = await getDetail(type as ReelItemType, source, decodeURIComponent(id), "IE");
  if (!detail) return { title: "Title unavailable · PBox" };
  const description = detail.synopsis || `Track ${detail.title} on PBox.`;
  const images = detail.backdropUrl ? [detail.backdropUrl] : detail.posterUrl ? [detail.posterUrl] : [];
  return {
    title: `${detail.title} · PBox`, description,
    openGraph: { title: detail.title, description, type: "website", images },
    twitter: { card: "summary_large_image", title: detail.title, description, images },
  };
}

export default async function TitlePage({
  params,
}: {
  params: Promise<{ type: string; source: string; id: string }>;
}) {
  const { type, source, id } = await params;
  if (!VALID_TYPES.includes(type as ReelItemType)) notFound();

  const profile = await getProfile();
  const country = profile?.country ?? "IE";
  const detail = await getDetail(type as ReelItemType, source, decodeURIComponent(id), country);
  if (!detail) notFound();

  const [curated, availability, trailerKey] = await Promise.all([
    getCuratedLinks(detail.id),
    getAvailability(detail.id),
    getTrailerKey(detail.type, detail.source, decodeURIComponent(id)),
  ]);

  const watchOptions = [...curatedToWatchOptions(curated), ...detail.autoWatchOptions];
  const isReading = detail.type === "manga" || detail.type === "manhwa";

  const seed: LibrarySeed = {
    id: detail.id,
    source: detail.source,
    type: detail.type,
    title: detail.title,
    posterUrl: detail.posterUrl,
    backdropUrl: detail.backdropUrl,
    synopsis: detail.synopsis,
    genres: detail.genres,
    year: detail.year,
    totalEpisodes: detail.totalEpisodes,
    totalChapters: detail.totalChapters,
    totalSeasons: detail.totalSeasons,
    anilistId: detail.anilistId,
    tmdbId: detail.tmdbId,
    mangadexId: detail.mangadexId,
    malId: detail.malId,
  };

  return (
    <div>
      {/* Hero backdrop */}
      <div className="relative h-[590px] w-full overflow-hidden sm:h-[580px] lg:h-[640px]">
        {detail.backdropUrl || detail.posterUrl ? (
          <Image
            src={detail.backdropUrl ?? detail.posterUrl!}
            alt=""
            fill
            priority
            sizes="100vw"
            className={detail.backdropUrl ? "object-cover object-top" : "scale-110 object-cover opacity-45 blur-xl"}
          />
        ) : (
          <div className="size-full bg-[linear-gradient(160deg,#16121f,#1c1230)]" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(to_top,var(--bg-base)_0%,rgba(8,8,13,0.82)_28%,rgba(8,8,13,0.28)_68%,rgba(8,8,13,0.5)_100%),linear-gradient(90deg,rgba(6,6,10,0.78)_0%,rgba(6,6,10,0.28)_58%,transparent_100%)]" />
        <div className="absolute left-4 top-4 md:left-8">
          <BackButton className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-white backdrop-blur" />
        </div>
      </div>

      <div className="relative z-10 mx-auto -mt-[370px] max-w-[1200px] px-4 sm:-mt-[330px] md:px-8 lg:-mt-[350px]">
        <div className="flex items-end gap-4 sm:gap-6">
          {/* Poster */}
          <div className="relative hidden w-36 shrink-0 sm:block lg:w-44">
            <div className="relative aspect-[2/3] overflow-hidden rounded-[var(--radius-lg)] border border-white/15 shadow-2xl">
              {detail.posterUrl ? (
                <Image src={detail.posterUrl} alt={detail.title} fill sizes="208px" className="object-cover" />
              ) : (
                <div className="grid size-full place-items-center bg-[var(--bg-elevated)] font-display text-4xl">
                  {detail.title.charAt(0)}
                </div>
              )}
            </div>
          </div>

          {/* Headline */}
          <div className="min-w-0 flex-1 pb-2">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <TypeBadge type={detail.type} />
              {detail.year !== null && (
                <span className="font-mono text-sm text-[var(--text-muted)]">{detail.year}</span>
              )}
              {detail.score !== null && (
                <span className="flex items-center gap-1 font-mono text-sm font-semibold text-[var(--gold)]">
                  <Star className="size-3.5 fill-current" /> {detail.score.toFixed(1)}
                </span>
              )}
              {(detail.ratings ?? []).map((r) => (
                <span
                  key={r.source}
                  className="hidden items-center gap-1 rounded-full bg-[var(--glass)] px-2 py-0.5 font-mono text-xs text-[var(--text-secondary)] sm:flex"
                  title={r.source}
                >
                  {r.source === "Rotten Tomatoes" ? "🍅" : r.source === "Internet Movie Database" ? "IMDb" : r.source === "Metacritic" ? "Metacritic" : r.source}{" "}
                  <span className="font-semibold text-[var(--text)]">{r.value}</span>
                </span>
              ))}
            </div>
            <h1 className="max-w-4xl font-display text-3xl font-extrabold leading-[0.98] tracking-tight text-white drop-shadow-[0_3px_18px_rgba(0,0,0,0.8)] sm:text-5xl lg:text-6xl">{detail.title}</h1>

            {/* Availability badges (live) */}
            {availability && (
              <div className="mt-3 flex flex-wrap gap-2">
                {availability.next_episode !== null && (
                  <Badge icon={<Sparkles className="size-3" />} tone="accent">
                    Ep {availability.next_episode}
                    {availability.next_air_at ? ` · ${formatAirDate(availability.next_air_at)}` : ""}
                  </Badge>
                )}
                {availability.hd_available && (
                  <Badge icon={<Zap className="size-3" />} tone="gold">Now in HD</Badge>
                )}
                {availability.status === "digital" && (
                  <Badge icon={<Tv className="size-3" />} tone="green">Now Streaming</Badge>
                )}
                {availability.status === "theatrical" && (
                  <Badge tone="muted">In Theatres</Badge>
                )}
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-white/75">
              {detail.runtime !== null && (
                <span className="flex items-center gap-1.5"><Clock className="size-4" /> {formatRuntime(detail.runtime)}</span>
              )}
              {detail.totalEpisodes !== null && (
                <span className="flex items-center gap-1.5"><Layers className="size-4" /> {detail.totalEpisodes} eps</span>
              )}
              {detail.totalChapters !== null && (
                <span className="flex items-center gap-1.5"><Layers className="size-4" /> {detail.totalChapters} ch</span>
              )}
              {detail.studios.length > 0 && <span className="hidden sm:inline">{detail.studios.join(", ")}</span>}
            </div>

            {detail.genres.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {detail.genres.map((g) => (
                  <span key={g} className="glass rounded-full px-2.5 py-1 text-xs text-[var(--text-secondary)]">{g}</span>
                ))}
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <AddToLibrary seed={seed} />
              <TrailerButton
                type={detail.type}
                source={detail.source}
                id={decodeURIComponent(id)}
                initialKey={trailerKey}
                totalSeasons={detail.totalSeasons}
                title={detail.title}
              />
              <AddToCollection
                item={{
                  id: detail.id,
                  type: detail.type,
                  source: detail.source,
                  title: detail.title,
                  posterUrl: detail.posterUrl,
                  year: detail.year,
                  anilistId: detail.anilistId,
                  tmdbId: detail.tmdbId,
                  mangadexId: detail.mangadexId,
                }}
              />
              <ShareDialog entity={{
                kind: "title",
                mediaKey: detail.id,
                mediaType: detail.type,
                source: detail.source,
                sourceId: decodeURIComponent(id),
                title: detail.title,
                year: detail.year,
                posterUrl: detail.posterUrl,
              }} />
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="mt-8 grid gap-6 sm:mt-12 lg:grid-cols-[1fr_360px]">
          <div className="min-w-0 space-y-8">
            {(detail.cast ?? []).length > 0 && (
              <section>
                <h2 className="mb-3 font-display text-xl font-bold">Cast</h2>
                <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]">
                  {(detail.cast ?? []).map((c, i) => {
                    const avatar = (
                      <div className="relative mx-auto aspect-square w-20 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                        {c.profileUrl ? (
                          <Image src={c.profileUrl} alt={c.name} fill sizes="80px" className="object-cover" />
                        ) : (
                          <div className="grid size-full place-items-center font-display text-lg text-[var(--text-muted)]">
                            {c.name.charAt(0)}
                          </div>
                        )}
                      </div>
                    );
                    const body = (
                      <>
                        {avatar}
                        <div className="mt-1.5 line-clamp-2 text-xs font-semibold leading-tight">{c.name}</div>
                        {c.character && <div className="line-clamp-1 text-[10px] text-[var(--text-muted)]">{c.character}</div>}
                      </>
                    );
                    return c.id ? (
                      <Link
                        key={`${c.name}-${i}`}
                        href={`/person/${c.source}/${c.id}`}
                        className="w-24 shrink-0 text-center transition-opacity hover:opacity-80"
                      >
                        {body}
                      </Link>
                    ) : (
                      <div key={`${c.name}-${i}`} className="w-24 shrink-0 text-center">
                        {body}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {detail.synopsis && (
              <section>
                <h2 className="mb-2 font-display text-xl font-bold">Story</h2>
                <ExpandableText text={detail.synopsis} />
              </section>
            )}

            {detail.chapters.length > 0 && (
              <section>
                <h2 className="mb-3 font-display text-xl font-bold">Chapters</h2>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {detail.chapters.map((c) => (
                    <a
                      key={c.id}
                      href={`https://mangadex.org/chapter/${c.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="glass glow-ring flex items-center justify-between rounded-[var(--radius-md)] px-3 py-2 text-sm"
                    >
                      <span className="truncate">Ch. {c.number}{c.title ? ` — ${c.title}` : ""}</span>
                      <span className="shrink-0 text-xs text-[var(--text-muted)]">{formatAirDate(c.publishAt)}</span>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {detail.related.length > 0 && <PosterRow title="Related" items={detail.related} />}

            <section>
              <ReviewsPanel mediaKey={detail.id} />
            </section>
          </div>

          {/* Where to watch */}
          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <GlassCard macDots title={isReading ? "Where to Read" : "Where to Watch"}>
              <div className="p-4">
                <WhereToWatch options={watchOptions} />
                <Link
                  href="/sites"
                  className="glass glow-ring mt-4 flex items-center justify-center gap-2 rounded-[var(--radius-md)] px-4 py-2.5 text-sm font-semibold"
                >
                  <Globe className="size-4 text-[var(--accent)]" />
                  Can&apos;t find it? Browse all sites
                </Link>
              </div>
            </GlassCard>
            <Suspense fallback={<div className="skeleton h-28 rounded-[var(--radius-lg)]" />}><FriendsWithTitle mediaKey={detail.id} /></Suspense>
          </aside>
        </div>

        {detail.type === "series" && detail.tmdbId !== null && (detail.episodes.length > 0 || (detail.totalSeasons ?? 0) > 0) && (
          <EpisodesSection
            itemId={detail.id}
            tmdbId={detail.tmdbId}
            totalSeasons={detail.totalSeasons ?? 1}
            initialEpisodes={detail.episodes}
          />
        )}

        {detail.type === "anime" && detail.malId !== null && (detail.animeEpisodes ?? []).length > 0 && (
          <AnimeEpisodesSection
            itemId={detail.id}
            malId={detail.malId}
            initialEpisodes={detail.animeEpisodes ?? []}
          />
        )}
      </div>
    </div>
  );
}

function Badge({
  children,
  icon,
  tone,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  tone: "accent" | "gold" | "green" | "muted";
}) {
  const tones: Record<string, string> = {
    accent: "bg-[rgb(var(--accent-rgb)/0.16)] text-[var(--accent)]",
    gold: "bg-[rgb(var(--gold-rgb)/0.16)] text-[var(--gold)]",
    green: "bg-[rgba(34,197,94,0.16)] text-[#4ade80]",
    muted: "bg-[var(--glass)] text-[var(--text-secondary)]",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${tones[tone]}`}>
      {icon} {children}
    </span>
  );
}
