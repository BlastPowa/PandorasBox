import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import type { UnifiedSearchResult } from "@core/utils/search";
import { TypeBadge } from "@/components/ui-fx/badge";
import { cn } from "@/lib/utils";
import { mediaItemHref } from "@/lib/library/item-href";

export function PosterCard({
  item,
  className,
  style,
  quickLook = false,
}: {
  item: UnifiedSearchResult;
  className?: string;
  style?: React.CSSProperties;
  quickLook?: boolean;
}) {
  const href = mediaItemHref(item);
  return (
    <div
      style={style}
      className={cn(
        "group pb-card-3d relative overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)]",
        className
      )}
    >
      <Link href={href} aria-label={`View details for ${item.title}`} className="block">
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
        {quickLook && (
          <div className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(to_top,rgba(7,8,13,.98)_8%,rgba(7,8,13,.91)_48%,rgba(7,8,13,.32)_78%,transparent)] p-3 opacity-0 transition duration-300 group-hover:opacity-100 group-focus-within:opacity-100 sm:flex sm:flex-col sm:justify-end">
            <div className="translate-y-2 transition duration-300 group-hover:translate-y-0 group-focus-within:translate-y-0">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em] text-white/70">
                {item.year && <span>{item.year}</span>}
                {item.score !== null && <span className="text-[var(--gold)]">★ {item.score.toFixed(1)}</span>}
              </div>
              <h3 className="line-clamp-2 font-display text-sm font-bold leading-tight text-white">{item.title}</h3>
              {item.synopsis && <p className="mt-2 line-clamp-3 text-[10px] leading-4 text-white/72">{item.synopsis}</p>}
              <span className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white">
                Quick look <ArrowUpRight className="size-3" />
              </span>
            </div>
          </div>
        )}
        </div>
      </Link>
    </div>
  );
}
