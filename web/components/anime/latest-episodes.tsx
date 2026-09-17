import Link from "next/link";
import Image from "next/image";
import { Clock, Radio } from "lucide-react";
import type { AiredEpisode } from "@/lib/anime";

function timeAgo(unixSeconds: number): string {
  const mins = Math.max(1, Math.round((Date.now() / 1000 - unixSeconds) / 60));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function LatestEpisodes({ episodes }: { episodes: AiredEpisode[] }) {
  if (episodes.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2 px-1">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--accent)]">
            <Radio className="size-3.5" /> Airing now
          </div>
          <h2 className="mt-1 font-display text-xl font-bold">Latest Episodes</h2>
          <p className="text-xs text-[var(--text-muted)]">Recently released episodes from popular currently airing shows</p>
        </div>
        <span className="rounded-full border border-[var(--border)] bg-[var(--glass)] px-3 py-1 text-[11px] font-bold text-[var(--text-secondary)]">
          {episodes.length} recent drops
        </span>
      </div>

      <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-5">
        {episodes.map((ep) => (
          <Link
            key={ep.id}
            href={`/title/anime/anilist/${ep.anilistId}`}
            className="group pb-card-3d w-[72vw] max-w-[260px] shrink-0 snap-start overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] sm:w-auto sm:max-w-none"
          >
            <div className="relative aspect-video w-full overflow-hidden">
              {ep.posterUrl ? (
                <Image
                  src={ep.posterUrl}
                  alt={ep.title}
                  fill
                  sizes="(max-width: 640px) 50vw, 220px"
                  className="object-cover object-top"
                />
              ) : (
                <div className="grid size-full place-items-center bg-[linear-gradient(160deg,#16121f,#1c1230)] font-display text-2xl font-bold text-[var(--text-muted)]">
                  {ep.title.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(10,10,15,0.85),transparent_60%)]" />
              <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-[rgba(10,10,15,0.75)] px-2 py-0.5 font-mono text-[10px] font-semibold text-white backdrop-blur">
                <Clock className="size-2.5" />
                {timeAgo(ep.airedAt)}
              </span>
            </div>
            <div className="space-y-1 p-2.5">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-wide text-[var(--accent)]">
                Episode {ep.episode}
              </p>
              <h3 className="line-clamp-2 text-[13px] font-semibold leading-tight text-[var(--text)]">
                {ep.title}
              </h3>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
