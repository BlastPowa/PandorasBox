import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Captions, Keyboard, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import type { ReelItemType } from "@core/storage/schema";
import { getDetail } from "@/lib/detail";
import { getProfile } from "@/lib/auth";
import { PBoxWatchExperience } from "@/components/player/pbox-watch-experience";

export default async function WatchPage({
  params,
}: {
  params: Promise<{ type: string; source: string; id: string }>;
}) {
  const { type, source, id } = await params;
  if (type !== "movie" && type !== "series" && type !== "anime") notFound();

  const profile = await getProfile();
  const detail = await getDetail(type as ReelItemType, decodeURIComponent(source), decodeURIComponent(id), profile?.country ?? "IE");
  if (!detail) notFound();

  const titleHref = `/title/${detail.type}/${detail.source}/${encodeURIComponent(decodeURIComponent(id))}`;

  return (
    <div className="relative min-h-[calc(100dvh-4rem)] overflow-hidden bg-[#050507] text-white">
      {(detail.backdropUrl || detail.posterUrl) && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[560px] overflow-hidden opacity-35">
          <Image
            src={detail.backdropUrl ?? detail.posterUrl!}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-top blur-[2px]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(5,5,7,.25),#050507_92%),linear-gradient(90deg,#050507_0%,transparent_35%,transparent_65%,#050507_100%)]" />
        </div>
      )}

      <div className="relative mx-auto w-full max-w-[1500px] px-3 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link
            href={titleHref}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/45 px-4 py-2 text-sm font-semibold text-white/80 backdrop-blur-xl transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="size-4" /> Back to title
          </Link>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/55">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/15 bg-emerald-400/10 px-3 py-2 text-emerald-200">
              <ShieldCheck className="size-3.5" /> Verified open sources
            </span>
          </div>
        </div>

        <header className="mb-5">
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Now watching</p>
          <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-4xl">{detail.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/50">
            {detail.year && <span>{detail.year}</span>}
            {detail.genres.slice(0, 3).map((genre) => <span key={genre}>• {genre}</span>)}
          </div>
        </header>

        <div className="rounded-[28px] border border-white/10 bg-black/45 p-2 shadow-[0_30px_100px_rgba(0,0,0,.55)] backdrop-blur-xl sm:p-3">
          <PBoxWatchExperience
            itemId={detail.id}
            title={detail.title}
            type={detail.type as "movie" | "series" | "anime"}
            year={detail.year}
            tmdbId={detail.tmdbId}
            totalSeasons={detail.totalSeasons}
            totalEpisodes={detail.totalEpisodes}
            initialSeriesEpisodes={detail.episodes}
            initialAnimeEpisodes={detail.animeEpisodes ?? []}
            backdropUrl={detail.backdropUrl ?? detail.posterUrl}
          />
        </div>

        <div className="mt-4 grid gap-3 text-xs text-white/50 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4">
            <div className="flex items-center gap-2 font-semibold text-white/80"><Keyboard className="size-4 text-[var(--accent)]" /> Quick controls</div>
            <p className="mt-2 leading-relaxed">Space/K play · ←/→ seek 10s · M mute · F fullscreen · C subtitles</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4">
            <div className="flex items-center gap-2 font-semibold text-white/80"><Captions className="size-4 text-[var(--accent)]" /> Subtitles</div>
            <p className="mt-2 leading-relaxed">Use CC for a quick on/off toggle, or choose a subtitle language from player settings.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
