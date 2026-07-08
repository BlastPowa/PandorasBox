"use client";

import { useEffect, useRef, useState } from "react";

export const HERO_SLIDE_EVENT = "pb:hero-slide";

/**
 * Fixed, blurred backdrop of the current hero image (lordflix-style). Blur and
 * darkness ramp up as the user scrolls off the hero, so the poster rows appear
 * to float over a softening cinematic backdrop.
 *
 * The scroll listener only writes a CSS custom property (--pb-scroll, 0..1) and
 * is rAF-throttled, so scrolling never triggers a React re-render. All the
 * actual blur/opacity math lives in globals.css (.pb-ambient__image).
 *
 * --pb-scroll is written to the *container*, not the image, and inherits down.
 * Writing it to the image would be clobbered every time React re-renders that
 * element's `style` prop with a new background image.
 *
 * Slides are stacked layers cross-faded by opacity rather than a single element
 * whose `background-image` transitions — see .pb-ambient__layer in globals.css
 * for why that distinction matters.
 */
export function AmbientBackground({ imageUrl }: { imageUrl: string | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState(imageUrl);
  const [seen, setSeen] = useState<string[]>(imageUrl ? [imageUrl] : []);

  // The Hero owns the slideshow timer; it announces each slide so we track it
  // without lifting state (and without re-rendering the Hero on our account).
  useEffect(() => {
    const onSlide = (e: Event) => {
      const url = (e as CustomEvent<string | null>).detail;
      if (!url) return;
      setImage(url);
      setSeen((prev) => (prev.includes(url) ? prev : [...prev, url]));
    };
    window.addEventListener(HERO_SLIDE_EVENT, onSlide);
    return () => window.removeEventListener(HERO_SLIDE_EVENT, onSlide);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Ramp to full blur over roughly one hero's worth of scrolling — matches
    // the hero's own height (78vh mobile / 86vh desktop, see hero.tsx) so the
    // image is fully sharp while the hero is on screen and blurs in step with
    // it scrolling away, rather than an arbitrary fixed distance.
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
        {seen.map((url) => (
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
