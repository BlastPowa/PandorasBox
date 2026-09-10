"use client";

import Image from "next/image";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Images } from "lucide-react";
import type { DetailGalleryImage } from "@/lib/detail";

export function MediaGallery({ title, images }: { title: string; images: DetailGalleryImage[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  if (images.length === 0) return null;

  const active = images[Math.min(activeIndex, images.length - 1)];
  const hasMultiple = images.length > 1;

  const previous = () => setActiveIndex((current) => (current - 1 + images.length) % images.length);
  const next = () => setActiveIndex((current) => (current + 1) % images.length);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold">
          <Images className="size-5 text-[var(--accent)]" /> Photos
        </h2>
        <span className="font-mono text-xs text-[var(--text-muted)]">
          {activeIndex + 1} / {images.length}
        </span>
      </div>

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-white/10 bg-black/20 shadow-[0_24px_70px_rgba(0,0,0,0.22)]">
        <div className="group relative aspect-video w-full overflow-hidden bg-[var(--bg-elevated)]">
          <Image
            src={active.url}
            alt={`${title} photo ${activeIndex + 1}`}
            fill
            sizes="(min-width: 1024px) 760px, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.015]"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/5" />

          {hasMultiple && (
            <>
              <button
                type="button"
                onClick={previous}
                aria-label="Previous photo"
                className="glass glow-ring absolute left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full text-white transition hover:scale-105"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Next photo"
                className="glass glow-ring absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full text-white transition hover:scale-105"
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          )}
        </div>

        {hasMultiple && (
          <div className="flex gap-2 overflow-x-auto p-2.5 [scrollbar-width:thin]">
            {images.map((image, index) => (
              <button
                key={image.url}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Show photo ${index + 1}`}
                aria-current={index === activeIndex ? "true" : undefined}
                className={`relative aspect-video w-28 shrink-0 overflow-hidden rounded-[var(--radius-md)] border transition sm:w-32 ${
                  index === activeIndex
                    ? "border-[var(--accent)] opacity-100 shadow-[0_0_0_1px_rgb(var(--accent-rgb)/0.35)]"
                    : "border-white/10 opacity-55 hover:opacity-90"
                }`}
              >
                <Image src={image.url} alt="" fill sizes="128px" className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
