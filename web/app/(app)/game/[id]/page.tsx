import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Star, Calendar, ExternalLink } from "lucide-react";
import { getGameDetail } from "@/lib/igdb";
import { BackButton } from "@/components/shell/back-button";
import { GameTrailers } from "@/components/games/game-trailers";
import { ExpandableText } from "@/components/detail/expandable-text";
import { GameContentGallery } from "@/components/games/game-content-gallery";
import { ShareDialog } from "@/components/social/share-dialog";
import { FriendsWithTitle } from "@/components/social/friends-with-title";

export const revalidate = 86400;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const gameId = Number.parseInt(id, 10);
  if (!Number.isFinite(gameId)) return { title: "Game unavailable · PBox" };
  const game = await getGameDetail(gameId);
  if (!game) return { title: "Game unavailable · PBox" };
  const description = game.summary || `Explore ${game.name} on PBox.`;
  const images = game.backdropUrl ? [game.backdropUrl] : game.coverUrl ? [game.coverUrl] : [];
  return { title: `${game.name} · PBox`, description, openGraph: { title: game.name, description, type: "website", images }, twitter: { card: "summary_large_image", title: game.name, description, images } };
}

export default async function GameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gameId = Number.parseInt(id, 10);
  if (!Number.isFinite(gameId)) notFound();

  const game = await getGameDetail(gameId);
  if (!game) notFound();

  return (
    <div className="pb-14">
      <section className="relative min-h-[560px] overflow-hidden sm:min-h-[610px] lg:min-h-[660px]">
        {game.backdropUrl || game.coverUrl ? (
          <Image
            src={game.backdropUrl ?? game.coverUrl!}
            alt=""
            fill
            priority
            sizes="100vw"
            className={game.backdropUrl ? "object-cover object-center" : "scale-110 object-cover blur-2xl"}
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgb(var(--accent-rgb)/0.26),transparent_42%),linear-gradient(145deg,var(--bg-elevated),var(--bg-base))]" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(to_top,var(--bg-base)_0%,color-mix(in_srgb,var(--bg-base)_72%,transparent)_26%,rgba(7,7,12,0.26)_62%,rgba(7,7,12,0.42)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,7,12,0.55)_0%,rgba(7,7,12,0.18)_50%,transparent_78%)]" />

        <div className="relative z-10 mx-auto flex min-h-[560px] max-w-[1400px] flex-col px-4 pb-10 pt-5 sm:min-h-[610px] md:px-8 lg:min-h-[660px] lg:pb-14">
          <div>
            <BackButton
              fallbackHref="/gamers"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/25 px-3 py-1.5 text-sm font-semibold text-white shadow-sm backdrop-blur-md transition hover:bg-black/40"
            />
          </div>

          <div className="mt-auto flex items-end gap-5 sm:gap-7">
            {game.coverUrl && (
              <div className="relative hidden aspect-[3/4] w-40 shrink-0 overflow-hidden rounded-[22px] border border-white/20 shadow-[0_28px_70px_rgba(0,0,0,0.38)] sm:block lg:w-52">
                <Image src={game.coverUrl} alt={game.name} fill sizes="208px" className="object-cover" priority />
              </div>
            )}

            <div className="min-w-0 max-w-4xl flex-1 pb-1 text-white [text-shadow:0_2px_18px_rgba(0,0,0,.35)]">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-white/70">Game</p>
              <h1 className="font-display text-4xl font-extrabold leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">{game.name}</h1>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-white/80">
                {game.rating !== null && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1.5 backdrop-blur-md">
                    <Star className="size-4 fill-current text-[var(--gold)]" />
                    <span className="font-bold text-white">{game.rating.toFixed(1)}</span>
                    <span className="text-white/60">/10</span>
                  </span>
                )}
                {game.year !== null && (
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="size-4" /> {game.year}
                  </span>
                )}
                {game.platforms.length > 0 && <span>{game.platforms.slice(0, 6).join(" · ")}</span>}
              </div>

              {game.genres.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {game.genres.map((genre) => (
                    <span key={genre} className="rounded-full border border-white/15 bg-black/20 px-3 py-1 text-xs font-semibold text-white/85 backdrop-blur-md">
                      {genre}
                    </span>
                  ))}
                </div>
              )}

              {game.summary && (
                <div className="mt-4 max-w-3xl text-[15px] leading-7 text-white/85">
                  <ExpandableText text={game.summary} />
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-3 [text-shadow:none]">
                {game.steamUrl && (
                  <a
                    href={game.steamUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pb-uiverse-button pb-uiverse-button--light inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-slate-950"
                  >
                    <ExternalLink className="size-4" /> Steam
                  </a>
                )}
                {game.epicUrl && (
                  <a
                    href={game.epicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pb-uiverse-button pb-uiverse-button--glass inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white"
                  >
                    <ExternalLink className="size-4" /> Epic Games
                  </a>
                )}
                <div className="rounded-full border border-white/20 bg-black/25 backdrop-blur-md">
                  <ShareDialog entity={{
                    kind: "title",
                    mediaKey: `igdb-${gameId}`,
                    mediaType: "game",
                    source: "igdb",
                    sourceId: id,
                    title: game.name,
                    year: game.year,
                    posterUrl: game.coverUrl,
                  }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="relative z-10 mx-auto -mt-2 max-w-[1400px] space-y-10 px-4 md:px-8">
        {(game.developers.length > 0 || game.publishers.length > 0) && (
          <div className="pb-uiverse-card pb-uiverse-card--compact flex flex-wrap gap-x-8 gap-y-2 rounded-[var(--radius-lg)] px-4 py-3 text-xs text-[var(--text-muted)] sm:px-5">
            {game.developers.length > 0 && (
              <span><span className="font-semibold text-[var(--text-secondary)]">Developer</span> · {game.developers.slice(0, 3).join(", ")}</span>
            )}
            {game.publishers.length > 0 && (
              <span><span className="font-semibold text-[var(--text-secondary)]">Publisher</span> · {game.publishers.slice(0, 3).join(", ")}</span>
            )}
          </div>
        )}

        <div className="max-w-xl">
          <Suspense fallback={<div className="skeleton h-28 rounded-[var(--radius-lg)]" />}>
            <FriendsWithTitle mediaKey={`igdb-${gameId}`} />
          </Suspense>
        </div>

        {game.storyline && game.storyline !== game.summary && (
          <section className="pb-uiverse-card pb-uiverse-card--feature max-w-4xl space-y-3 rounded-[var(--radius-xl)] p-5 sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">The story</p>
            <h2 className="font-display text-2xl font-bold">Story</h2>
            <div className="max-w-3xl text-[15px] leading-7 text-[var(--text-secondary)]">
              <ExpandableText text={game.storyline} />
            </div>
          </section>
        )}

        <GameTrailers videos={game.videos} title={game.name} />
        <GameContentGallery title={game.name} screenshots={game.screenshots} dlcs={game.dlcs} editions={game.editions} />
      </div>
    </div>
  );
}
