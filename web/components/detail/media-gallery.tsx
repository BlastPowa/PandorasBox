"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Images } from "lucide-react";
import type { DetailGalleryImage } from "@/lib/detail";

export function MediaGallery({ title, images }: { title: string; images: DetailGalleryImage[] }) {
  const cleanImages = useMemo(() => dedupeImages(images), [images]);
  const [activeIndex, setActiveIndex] = useState(0);
  if (cleanImages.length === 0) return null;

  const safeIndex = Math.min(activeIndex, cleanImages.length - 1);
  const active = cleanImages[safeIndex];
  const hasMultiple = cleanImages.length > 1;

  const previous = () => setActiveIndex((current) => (current - 1 + cleanImages.length) % cleanImages.length);
  const next = () => setActiveIndex((current) => (current + 1) % cleanImages.length);

  return (
    <section className="min-w-0">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Gallery</p>
          <h2 className="mt-0.5 flex items-center gap-2 font-display text-xl font-extrabold sm:text-2xl">
            <Images className="size-5 text-[var(--accent)]" /> Photos
          </h2>
        </div>
        <span className="rounded-full border border-[var(--border)] bg-[var(--glass)] px-3 py-1.5 font-mono text-[10px] text-[var(--text-muted)] sm:text-xs">
          {safeIndex + 1} / {cleanImages.length}
        </span>
      </div>

      <div className="pb-uiverse-card pb-uiverse-card--feature overflow-hidden rounded-[24px] border border-[var(--media-border)] shadow-[0_24px_70px_rgba(0,0,0,0.14)]">
        <div className="group relative aspect-[4/3] w-full overflow-hidden bg-[var(--bg-elevated)] sm:aspect-video">
          <Image
            src={active.url}
            alt={`${title} photo ${safeIndex + 1}`}
            fill
            sizes="(min-width: 1280px) 920px, (min-width: 768px) 80vw, 100vw"
            priority={safeIndex === 0}
            className="object-cover transition-transform duration-500 group-hover:scale-[1.015]"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/48 via-transparent to-black/10" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3 text-white sm:p-4">
            <span className="rounded-full border border-white/15 bg-black/30 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] backdrop-blur-md sm:text-[10px]">{title}</span>
            <span className="font-mono text-[10px] text-white/70">{safeIndex + 1} of {cleanImages.length}</span>
          </div>

          {hasMultiple && (
            <>
              <button
                type="button"
                onClick={previous}
                aria-label="Previous photo"
                className="glass glow-ring absolute left-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-white/15 text-white shadow-lg transition hover:scale-105 sm:left-3"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Next photo"
                className="glass glow-ring absolute right-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-white/15 text-white shadow-lg transition hover:scale-105 sm:right-3"
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          )}
        </div>

        {hasMultiple && (
          <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto p-2.5 pr-4 [scrollbar-width:thin] sm:gap-2.5 sm:p-3">
            {cleanImages.map((image, index) => (
              <button
                key={`${normaliseImageUrl(image.url)}-${index}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Show photo ${index + 1}`}
                aria-current={index === safeIndex ? "true" : undefined}
                className={`relative aspect-video w-[42vw] max-w-36 shrink-0 snap-start overflow-hidden rounded-[14px] border transition sm:w-36 ${
                  index === safeIndex
                    ? "border-[var(--accent)] opacity-100 shadow-[0_0_0_1px_rgb(var(--accent-rgb)/0.35),0_12px_28px_rgb(var(--accent-rgb)/0.12)]"
                    : "border-[var(--border)] opacity-60 hover:-translate-y-0.5 hover:opacity-95"
                }`}
              >
                <Image src={image.url} alt="" fill sizes="144px" className="object-cover" />
                <span className="absolute bottom-1.5 right-1.5 grid size-5 place-items-center rounded-full bg-black/55 font-mono text-[9px] text-white/80 backdrop-blur-sm">{index + 1}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function dedupeImages(images: DetailGalleryImage[]) {
  const seen = new Set<string>();
  return images.filter((image) => {
    const key = normaliseImageUrl(image.url);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normaliseImageUrl(url: string) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/t\/p\/[^/]+\//, "/t/p/original/");
    return `${parsed.hostname.toLowerCase()}${path.toLowerCase()}`;
  } catch {
    return url.split(/[?#]/, 1)[0].trim().toLowerCase();
  }
}
