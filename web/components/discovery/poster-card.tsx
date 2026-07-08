import Link from "next/link";
import Image from "next/image";
import type { UnifiedSearchResult } from "@core/utils/search";
import { TypeBadge } from "@/components/ui-fx/badge";
import { cn } from "@/lib/utils";

export function PosterCard({
  item,
  className,
  style,
}: {
  item: UnifiedSearchResult;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <Link
      href={`/title/${item.type}/${item.source}/${item.anilistId ?? item.tmdbId ?? item.mangadexId ?? item.id}`}
      style={style}
      className={cn(
        "group pb-card-3d relative block overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)]",
        className
      )}
    >
      <div className="relative aspect-[2/3] w-full">
        {item.posterUrl ? (
          <Image
            src={item.posterUrl}
            alt={item.title}
            fill
            sizes="(max-width: 768px) 40vw, 180px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="grid size-full place-items-center bg-[linear-gradient(160deg,#16121f,#1c1230)] font-display text-3xl font-bold text-[var(--text-muted)]">
            {item.title.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(10,10,15,0.95),rgba(10,10,15,0.1)_45%,transparent)]" />
        <div className="absolute left-2 top-2">
          <TypeBadge type={item.type} />
        </div>
        {item.score !== null && (
          <div className="absolute right-2 top-2 rounded-full bg-[rgba(10,10,15,0.7)] px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--gold)] backdrop-blur">
            ★ {item.score.toFixed(1)}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 p-2.5">
          <h3 className="line-clamp-2 text-[13px] font-semibold leading-tight text-white">
            {item.title}
          </h3>
          {item.year !== null && (
            <span className="mt-0.5 block font-mono text-[10px] text-[var(--text-muted)]">
              {item.year}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
