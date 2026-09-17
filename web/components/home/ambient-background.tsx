"use client";

import { useEffect, useRef, useState } from "react";

export const HERO_SLIDE_EVENT = "pb:hero-slide";

/**
 * Fixed backdrop of the current hero image. Darkness ramps up as the user
 * scrolls off the hero so poster rows remain readable while artwork stays crisp.
 *
 * The scroll listener only writes a CSS custom property (--pb-scroll, 0..1) and
 * is rAF-throttled, so scrolling never triggers a React re-render. All the
 * actual opacity/scale math lives in globals.css (.pb-ambient__image).
 *
 * --pb-scroll is written to the *container*, not the image, and inherits down.
 * Writing it to the image would be clobbered every time React re-renders that
 * element's `style` prop with a new background image.
 *
 * Slides are stacked layers cross-faded by opacity rather than a single element
 * whose `background-image` transitions — see .pb-ambient__layer in globals.css
 * for why that distinction matters.
 */
export function AmbientBackground({
  imageUrl,
  imageUrls = [],
  intervalMs = 6500,
}: {
  imageUrl: string | null;
  imageUrls?: string[];
  intervalMs?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState(imageUrl);
  const [layers, setLayers] = useState<string[]>(imageUrl ? [imageUrl] : []);
  const slideshowKey = Array.from(new Set([imageUrl, ...imageUrls].filter((url): url is string => Boolean(url)))).slice(0, 6).join("\u0000");

  // The homepage can hand us a small set of wide artwork and let this fixed
  // layer rotate independently. Detail pages still pass just one image.
  useEffect(() => {
    const slides = slideshowKey ? slideshowKey.split("\u0000") : [];
    if (slides.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("pb-reduce-motion")) return;

    let index = 0;
    const timer = window.setInterval(() => {
      index = (index + 1) % slides.length;
      const next = slides[index];
      setImage(next);
      setLayers((prev) => [next, ...prev.filter((item) => item !== next)].slice(0, 2));
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [intervalMs, slideshowKey]);

  // The Hero owns the slideshow timer; it announces each slide so we track it
  // without lifting state (and without re-rendering the Hero on our account).
  useEffect(() => {
    const onSlide = (e: Event) => {
      const url = (e as CustomEvent<string | null>).detail;
      if (!url) return;
      setImage(url);
      setLayers((prev) => [url, ...prev.filter((item) => item !== url)].slice(0, 2));
    };
    window.addEventListener(HERO_SLIDE_EVENT, onSlide);
    return () => window.removeEventListener(HERO_SLIDE_EVENT, onSlide);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Ramp the backdrop treatment over roughly one hero's worth of scrolling.
    // This keeps the transition aligned with the hero without repainting a
    // viewport-sized blur on every scroll frame.
    let rampPx = window.innerHeight * 0.8;
    let frame = 0;

    const update = () => {
      frame = 0;
      const progress = Math.min(window.scrollY / rampPx, 1);
      el.style.setProperty("--pb-scroll", progress.toFixed(3));
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    const onResize = () => {
      rampPx = window.innerHeight * 0.8;
      update();
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [image]);

  if (!image) return null;

  return (
    <div ref={containerRef} className="pb-ambient" aria-hidden="true">
      <div className="pb-ambient__image">
        {layers.map((url) => (
          <div
            key={url}
            className={`pb-ambient__layer${url === image ? " is-active" : ""}`}
            style={{ backgroundImage: `url(${JSON.stringify(url)})` }}
          />
        ))}
      </div>
      <div className="pb-ambient__scrim" />
    </div>
  );
}
