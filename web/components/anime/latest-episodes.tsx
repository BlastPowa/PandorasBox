import Link from "next/link";
import Image from "next/image";
import { Clock } from "lucide-react";
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
      <div className="px-1">
        <h2 className="font-display text-lg font-bold">Latest Episodes</h2>
        <p className="text-xs text-[var(--text-muted)]">Recently released episodes</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {episodes.map((ep) => (
          <Link
            key={ep.id}
            href={`/title/anime/anilist/${ep.anilistId}`}
            className="group pb-card-3d overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)]"
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
