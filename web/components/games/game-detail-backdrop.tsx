"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

export function GameDetailBackdrop({ images, title }: { images: (string | null)[]; title: string }) {
  const slides = useMemo(() => Array.from(new Set(images.filter((image): image is string => Boolean(image)))).slice(0, 6), [images]);
  const [index, setIndex] = useState(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (slides.length < 2 || reducedMotion) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % slides.length), 6500);
    return () => window.clearInterval(timer);
  }, [reducedMotion, slides.length]);

  const active = slides[index];
  if (!active) return <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgb(var(--accent-rgb)/0.26),transparent_42%),linear-gradient(145deg,var(--bg-elevated),var(--bg-base))]" />;

  return (
    <>
      <Image key={active} src={active} alt="" fill priority sizes="100vw" className="object-cover object-center motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700" />
      {slides.length > 1 && (
        <div className="absolute right-5 top-5 z-[12] hidden max-w-[360px] gap-2 rounded-2xl border border-white/15 bg-black/20 p-2 shadow-lg backdrop-blur-xl md:flex" aria-label={`${title} screenshot slideshow`}>
          {slides.slice(0, 5).map((source, slideIndex) => (
            <button key={source} type="button" onClick={() => setIndex(slideIndex)} className={cn("relative aspect-video w-14 overflow-hidden rounded-xl border transition sm:w-16", slideIndex === index ? "border-white/75 ring-2 ring-white/20" : "border-white/15 opacity-65 hover:opacity-100")} aria-label={`Show ${title} image ${slideIndex + 1}`} aria-current={slideIndex === index ? "true" : undefined}>
              <Image src={source} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </>
  );
}
