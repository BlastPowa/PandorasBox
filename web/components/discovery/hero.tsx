"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import type { UnifiedSearchResult } from "@core/utils/search";
import { truncateText } from "@core/utils/formatters";
import { TypeBadge } from "@/components/ui-fx/badge";
import { Play, Info } from "lucide-react";

export function Hero({ items }: { items: UnifiedSearchResult[] }) {
  const slides = items.filter((i) => i.posterUrl).slice(0, 5);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % slides.length), 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (slides.length === 0) return null;
  const active = slides[index];
  const href = `/title/${active.type}/${active.source}/${active.anilistId ?? active.tmdbId ?? active.id}`;

  return (
    <section className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)]">
      <div className="relative h-[300px] w-full sm:h-[380px]">
        {active.posterUrl && (
          <Image
            key={active.id}
            src={active.posterUrl}
            alt={active.title}
            fill
            priority
            sizes="100vw"
            className="fade-up object-cover object-top"
          />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(to_top,var(--bg-base)_5%,rgba(10,10,15,0.4)_55%,rgba(10,10,15,0.65))]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--bg-base)_2%,transparent_60%)]" />

        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-6 sm:max-w-2xl sm:p-10">
          <div className="flex items-center gap-2">
            <TypeBadge type={active.type} />
            {active.score !== null && (
              <span className="font-mono text-xs font-semibold text-[var(--gold)]">
                ★ {active.score.toFixed(1)}
              </span>
            )}
            {active.year !== null && (
              <span className="font-mono text-xs text-[var(--text-muted)]">{active.year}</span>
            )}
          </div>
          <h1 className="font-display text-3xl font-extrabold leading-tight drop-shadow sm:text-5xl">
            {active.title}
          </h1>
          {active.synopsis && (
            <p className="hidden text-sm leading-relaxed text-[var(--text-secondary)] sm:block">
              {truncateText(active.synopsis, 180)}
            </p>
          )}
          <div className="mt-1 flex items-center gap-3">
            <Link
              href={href}
              className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(120deg,var(--accent),var(--accent-2))] px-6 py-2.5 text-sm font-semibold text-[#0a0a0f] transition hover:brightness-110"
            >
              <Play className="size-4 fill-current" /> View
            </Link>
            <Link
              href={href}
              className="glass inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--glass-strong)]"
            >
              <Info className="size-4" /> Details
            </Link>
          </div>
        </div>

        {slides.length > 1 && (
          <div className="absolute bottom-4 right-6 flex gap-1.5">
            {slides.map((s, i) => (
              <button
                key={s.id}
                aria-label={`Show slide ${i + 1}`}
                onClick={() => setIndex(i)}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: i === index ? 24 : 8,
                  background: i === index ? "var(--accent)" : "rgba(255,255,255,0.3)",
                }}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
