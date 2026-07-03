import Image from "next/image";
import { notFound } from "next/navigation";
import { Clock, Layers, Star, Sparkles, Tv, Zap } from "lucide-react";
import type { ReelItemType } from "@core/storage/schema";
import { formatRuntime, formatAirDate } from "@core/utils/formatters";
import { getDetail } from "@/lib/detail";
import { getCuratedLinks, getAvailability, curatedToWatchOptions } from "@/lib/db/media";
import { getProfile } from "@/lib/auth";
import { TypeBadge } from "@/components/ui-fx/badge";
import { GlassCard } from "@/components/ui-fx/glass-card";
import { AddToLibrary, type LibrarySeed } from "@/components/library/add-to-library";
import { WhereToWatch } from "@/components/detail/where-to-watch";
import { PosterRow } from "@/components/discovery/poster-row";
import { ExpandableText } from "@/components/detail/expandable-text";

const VALID_TYPES: ReelItemType[] = ["movie", "series", "anime", "manga", "manhwa"];

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

  const [curated, availability] = await Promise.all([
    getCuratedLinks(detail.id),
    getAvailability(detail.id),
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
      <div className="relative h-[240px] w-full overflow-hidden sm:h-[340px]">
        {detail.backdropUrl ? (
          <Image src={detail.backdropUrl} alt="" fill priority sizes="100vw" className="object-cover object-top" />
        ) : (
          <div className="size-full bg-[linear-gradient(160deg,#16121f,#1c1230)]" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(to_top,var(--bg-base),rgba(10,10,15,0.5)_60%,rgba(10,10,15,0.4))]" />
      </div>

      <div className="mx-auto -mt-24 max-w-[1200px] px-4 md:px-8">
        <div className="flex flex-col gap-6 sm:flex-row">
          {/* Poster */}
          <div className="relative mx-auto w-40 shrink-0 sm:mx-0 sm:w-52">
            <div className="relative aspect-[2/3] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] shadow-2xl">
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
          <div className="flex-1 pt-2 sm:pt-24">
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
            </div>
            <h1 className="font-display text-3xl font-extrabold leading-tight sm:text-4xl">{detail.title}</h1>

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

            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-[var(--text-secondary)]">
              {detail.runtime !== null && (
                <span className="flex items-center gap-1.5"><Clock className="size-4" /> {formatRuntime(detail.runtime)}</span>
              )}
              {detail.totalEpisodes !== null && (
                <span className="flex items-center gap-1.5"><Layers className="size-4" /> {detail.totalEpisodes} eps</span>
              )}
              {detail.totalChapters !== null && (
                <span className="flex items-center gap-1.5"><Layers className="size-4" /> {detail.totalChapters} ch</span>
              )}
              {detail.studios.length > 0 && <span>{detail.studios.join(", ")}</span>}
            </div>

            {detail.genres.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {detail.genres.map((g) => (
                  <span key={g} className="glass rounded-full px-2.5 py-1 text-xs text-[var(--text-secondary)]">{g}</span>
                ))}
              </div>
            )}

            <div className="mt-5">
              <AddToLibrary seed={seed} />
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-8">
            {detail.synopsis && (
              <section>
                <h2 className="mb-2 font-display text-xl font-bold">Story</h2>
                <ExpandableText text={detail.synopsis} />
              </section>
            )}

            {detail.episodes.length > 0 && (
              <section>
                <h2 className="mb-3 font-display text-xl font-bold">Episodes · Season 1</h2>
                <div className="space-y-2">
                  {detail.episodes.map((ep) => (
                    <div key={ep.id} className="glass flex gap-3 rounded-[var(--radius-md)] p-2.5">
                      <div className="relative h-[62px] w-[110px] shrink-0 overflow-hidden rounded-[8px] bg-[var(--bg-elevated)]">
                        {ep.still_path ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={`https://image.tmdb.org/t/p/w300${ep.still_path}`} alt="" className="size-full object-cover" />
                        ) : (
                          <div className="grid size-full place-items-center font-mono text-xs text-[var(--text-muted)]">E{ep.episode_number}</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="font-mono text-xs text-[var(--accent)]">E{ep.episode_number}</span>
                          <h3 className="truncate text-sm font-semibold">{ep.name}</h3>
                        </div>
                        {ep.air_date && <span className="text-xs text-[var(--text-muted)]">{formatAirDate(ep.air_date)}</span>}
                        {ep.overview && <p className="mt-1 line-clamp-2 text-xs text-[var(--text-secondary)]">{ep.overview}</p>}
                      </div>
                    </div>
                  ))}
                </div>
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
          </div>

          {/* Where to watch */}
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <GlassCard macDots title={isReading ? "Where to Read" : "Where to Watch"}>
              <div className="p-4">
                <WhereToWatch options={watchOptions} />
              </div>
            </GlassCard>
          </aside>
        </div>
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
    accent: "bg-[rgba(168,85,247,0.16)] text-[#c084fc]",
    gold: "bg-[rgba(245,165,36,0.16)] text-[var(--gold)]",
    green: "bg-[rgba(34,197,94,0.16)] text-[#4ade80]",
    muted: "bg-[var(--glass)] text-[var(--text-secondary)]",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${tones[tone]}`}>
      {icon} {children}
    </span>
  );
}
