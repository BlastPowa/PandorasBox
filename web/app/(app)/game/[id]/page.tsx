import { notFound } from "next/navigation";
import Image from "next/image";
import { Star, Calendar, ExternalLink } from "lucide-react";
import { getGameDetail } from "@/lib/igdb";
import { AmbientBackground } from "@/components/home/ambient-background";
import { BackButton } from "@/components/shell/back-button";
import { GameTrailers } from "@/components/games/game-trailers";
import { ExpandableText } from "@/components/detail/expandable-text";

export const revalidate = 86400;

export default async function GameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gameId = Number.parseInt(id, 10);
  if (!Number.isFinite(gameId)) notFound();

  const game = await getGameDetail(gameId);
  if (!game) notFound();

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8">
      <AmbientBackground imageUrl={game.backdropUrl} />
      <BackButton fallbackHref="/gamers" />

      <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:gap-8">
        {game.coverUrl && (
          <div className="relative aspect-[3/4] w-40 shrink-0 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] sm:w-52">
            <Image src={game.coverUrl} alt={game.name} fill sizes="208px" className="object-cover" priority />
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-4">
          <h1 className="font-display text-3xl font-extrabold leading-tight sm:text-5xl">{game.name}</h1>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-[var(--text-secondary)]">
            {game.rating !== null && (
              <span className="inline-flex items-center gap-1.5">
                <Star className="size-3.5 fill-current text-[var(--gold)]" />
                <span className="font-semibold text-[var(--text)]">{game.rating.toFixed(1)}</span>
                <span className="text-[var(--text-muted)]">/10</span>
              </span>
            )}
            {game.year !== null && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="size-3.5" />
                {game.year}
              </span>
            )}
            {game.platforms.length > 0 && (
              <span className="text-[var(--text-muted)]">{game.platforms.slice(0, 6).join(" · ")}</span>
            )}
          </div>

          {game.genres.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {game.genres.map((g) => (
                <span key={g} className="rounded-full bg-[var(--glass)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                  {g}
                </span>
              ))}
            </div>
          )}

          {game.summary && (
            <div className="max-w-2xl">
              <ExpandableText text={game.summary} />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            {game.steamUrl && (
              <a
                href={game.steamUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(120deg,var(--accent),var(--accent-2))] px-6 py-2.5 text-sm font-bold text-[#0a0a0f] transition hover:brightness-110"
              >
                <ExternalLink className="size-4" /> View on Steam
              </a>
            )}
            {game.epicUrl && (
              <a
                href={game.epicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="glass inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--glass-strong)]"
              >
                <ExternalLink className="size-4" /> Epic Games
              </a>
            )}
          </div>

          {(game.developers.length > 0 || game.publishers.length > 0) && (
            <div className="flex flex-wrap gap-x-8 gap-y-1 pt-1 text-xs text-[var(--text-muted)]">
              {game.developers.length > 0 && (
                <span>
                  <span className="font-semibold text-[var(--text-secondary)]">Developer:</span>{" "}
                  {game.developers.slice(0, 3).join(", ")}
                </span>
              )}
              {game.publishers.length > 0 && (
                <span>
                  <span className="font-semibold text-[var(--text-secondary)]">Publisher:</span>{" "}
                  {game.publishers.slice(0, 3).join(", ")}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-10 space-y-10">
        {game.storyline && game.storyline !== game.summary && (
          <section className="space-y-2">
            <h2 className="font-display text-lg font-bold">Story</h2>
            <div className="max-w-3xl">
              <ExpandableText text={game.storyline} />
            </div>
          </section>
        )}

        <GameTrailers videos={game.videos} title={game.name} />

        {game.dlcs.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold">DLC &amp; Expansions</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {game.dlcs.map((d) => (
                <div key={d.id} className="glass flex gap-3 rounded-[var(--radius-md)] p-3">
                  {d.coverUrl ? (
                    <div className="relative aspect-[3/4] w-16 shrink-0 overflow-hidden rounded-[var(--radius-sm)]">
                      <Image src={d.coverUrl} alt={d.name} fill sizes="64px" className="object-cover" />
                    </div>
                  ) : (
                    <div className="grid aspect-[3/4] w-16 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-[var(--bg-surface)] font-display text-lg font-bold text-[var(--text-muted)]">
                      {d.name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold leading-tight">{d.name}</h3>
                    {d.summary && (
                      <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-[var(--text-muted)]">{d.summary}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {game.screenshots.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold">Screenshots</h2>
            <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {game.screenshots.map((src) => (
                <div key={src} className="relative aspect-video w-80 shrink-0 snap-start overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)]">
                  <Image src={src} alt="Screenshot" fill sizes="320px" className="object-cover" />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
