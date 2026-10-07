"use client";

import Image from "next/image";
import Link from "@/components/ui/app-link";
import { useRef } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight, Star } from "lucide-react";
import type { UnifiedSearchResult } from "@core/utils/search";
import { mediaItemHref } from "@/lib/library/item-href";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

export function CinematicRail({ title, eyebrow, items, href, ranked = false }: {
  title: string; eyebrow?: string; items: UnifiedSearchResult[]; href?: string; ranked?: boolean;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  if (!items.length) return null;
  function scroll(direction: number) {
    const node = scroller.current;
    if (node) node.scrollBy({ left: direction * node.clientWidth * .85, behavior: reducedMotion ? "instant" : "smooth" });
  }
  return <section className="pb-cinema-rail">
    <div className="pb-cinema-section-heading">
      <div>{eyebrow && <p className="pb-cinema-eyebrow">{eyebrow}</p>}<h2>{title}</h2></div>
      <div className="flex items-center gap-2">
        {href && <Link href={href} className="pb-cinema-browse">Browse all <ArrowUpRight className="size-3.5" /></Link>}
        <div className="hidden gap-1 sm:flex"><button type="button" className="pb-cinema-control" aria-label={`Scroll ${title} left`} onClick={() => scroll(-1)}><ChevronLeft className="size-4" /></button><button type="button" className="pb-cinema-control" aria-label={`Scroll ${title} right`} onClick={() => scroll(1)}><ChevronRight className="size-4" /></button></div>
      </div>
    </div>
    <div ref={scroller} className="pb-cinema-scroller">
      {items.map((item, index) => <Link key={`${item.source}:${item.type}:${item.id}`} href={mediaItemHref(item)} className={`pb-cinema-media${ranked ? " is-ranked" : ""}`}>
        {ranked && <span className="pb-cinema-rank" aria-hidden="true">{index + 1}</span>}
        <div className="min-w-0 flex-1">
          <div className="pb-cinema-media-image">{item.backdropUrl || item.posterUrl ? <Image src={(item.backdropUrl ?? item.posterUrl)!} alt="" fill sizes="(max-width: 640px) 260px, 340px" className={`object-cover transition duration-500 ${item.backdropUrl ? "" : "object-top"}`} /> : <span className="grid size-full place-items-center font-display text-3xl text-[var(--text-muted)]">{item.title.charAt(0)}</span>}</div>
          <h3 className="mt-3 truncate text-sm font-semibold">{item.title}</h3>
          <div className="mt-1.5 flex items-center gap-2 text-[10px] text-[var(--text-muted)]"><span className="rounded-full bg-[var(--glass)] px-2 py-0.5 font-bold uppercase tracking-wider">{item.type === "series" ? "Series" : item.type}</span><span>{item.year}</span>{item.score != null && <span className="ml-auto inline-flex items-center gap-1"><Star className="size-3 fill-[var(--gold)] text-[var(--gold)]" />{item.score.toFixed(1)}</span>}</div>
        </div>
      </Link>)}
    </div>
  </section>;
}
