"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { UnifiedSearchResult } from "@core/utils/search";
import { PosterCard } from "./poster-card";
import { PosterSkeleton } from "@/components/ui-fx/feedback";
import { cn } from "@/lib/utils";

/** Card width comes from --poster-w / --poster-w-sm so the Settings →
 * Appearance "Compact poster rows" toggle actually changes density. */
const CARD_WIDTH = "w-[var(--poster-w-sm)] sm:w-[var(--poster-w)]";

function uniqueItems(items: UnifiedSearchResult[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.source}:${item.type}:${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function itemKey(item: UnifiedSearchResult) {
  return `${item.source}:${item.type}:${item.id}`;
}

/** Adds `is-visible` once the row scrolls into view, kicking off the stagger. */
function useRevealOnScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);

  return { ref, visible };
}

export function PosterRow({
  title,
  subtitle,
  items,
  viewAllHref,
  randomize = false,
  action,
}: {
  title: string;
  subtitle?: string;
  items: UnifiedSearchResult[];
  viewAllHref?: string;
  randomize?: boolean;
  action?: React.ReactNode;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const { ref: rowRef, visible } = useRevealOnScroll<HTMLDivElement>();
  const [displayItems, setDisplayItems] = useState(() => uniqueItems(items));

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const unique = uniqueItems(items);
      setDisplayItems(randomize ? [...unique].sort(() => Math.random() - 0.5) : unique);
    });
    return () => cancelAnimationFrame(frame);
  }, [items, randomize]);

  if (items.length === 0) return null;

  function nudge(direction: -1 | 1) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  }

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between px-1">
        <div>
          <h2 className="font-display text-lg font-bold">{title}</h2>
          {subtitle && <p className="text-xs text-[var(--text-muted)]">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--accent)]"
            >
              View All
            </Link>
          )}
          {action}
          <div className="hidden gap-1 sm:flex">
            <button
              onClick={() => nudge(-1)}
              aria-label={`Scroll ${title} left`}
              className="glass grid size-7 place-items-center rounded-full text-[var(--text-secondary)] transition hover:text-[var(--accent)]"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={() => nudge(1)}
              aria-label={`Scroll ${title} right`}
              className="glass grid size-7 place-items-center rounded-full text-[var(--text-secondary)] transition hover:text-[var(--accent)]"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
      <div
        ref={scrollerRef}
        className="-mx-1 overflow-x-auto px-1 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div
          ref={rowRef}
          className={cn("pb-stagger flex snap-x snap-mandatory gap-3 scroll-smooth", visible && "is-visible")}
        >
          {displayItems.map((item, i) => (
            <PosterCard
              key={itemKey(item)}
              item={item}
              style={{ "--i": i } as React.CSSProperties}
              className={cn(CARD_WIDTH, "shrink-0 snap-start")}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export function PosterRowSkeleton({ title }: { title: string }) {
  return (
    <section className="space-y-3">
      <h2 className="px-1 font-display text-lg font-bold">{title}</h2>
      <div className="-mx-1 flex gap-3 overflow-hidden px-1 pb-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <PosterSkeleton key={i} className={cn(CARD_WIDTH, "shrink-0")} />
        ))}
      </div>
    </section>
  );
}

export function PosterGrid({ items, randomize = false, mobileColumns = 3 }: { items: UnifiedSearchResult[]; randomize?: boolean; mobileColumns?: 2 | 3 }) {
  const { ref, visible } = useRevealOnScroll<HTMLDivElement>();
  const [displayItems, setDisplayItems] = useState(() => uniqueItems(items));
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const unique = uniqueItems(items);
      setDisplayItems(randomize ? [...unique].sort(() => Math.random() - 0.5) : unique);
    });
    return () => cancelAnimationFrame(frame);
  }, [items, randomize]);
  return (
    <div
      ref={ref}
      className={cn(
        "pb-stagger grid gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7",
        mobileColumns === 2 ? "grid-cols-2" : "grid-cols-3",
        visible && "is-visible"
      )}
    >
      {displayItems.map((item, i) => (
        <PosterCard key={itemKey(item)} item={item} style={{ "--i": Math.min(i, 14) } as React.CSSProperties} />
      ))}
    </div>
  );
}
