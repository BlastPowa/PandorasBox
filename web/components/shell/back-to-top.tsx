"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Fixed back-to-top button with a scroll-progress ring. Appears once the user
 * is a viewport deep. The ring is drawn with an SVG stroke-dashoffset so it
 * doubles as the "scroll progress" indicator from the plan.
 */
const RADIUS = 20;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function BackToTop() {
  const [progress, setProgress] = useState(0);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0);
      setShown(window.scrollY > window.innerHeight * 0.6);
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={cn(
        "group fixed bottom-20 right-4 z-40 grid size-12 place-items-center rounded-full",
        "border border-[var(--border)] bg-[var(--bg-elevated)]/80 backdrop-blur-xl",
        "transition-all duration-300 hover:border-[var(--accent)] md:bottom-6 md:right-6",
        shown ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      )}
    >
      <svg className="absolute inset-0 size-full -rotate-90" viewBox="0 0 48 48" aria-hidden="true">
        <circle
          cx="24"
          cy="24"
          r={RADIUS}
          fill="none"
          strokeWidth="2"
          stroke="var(--border)"
        />
        <circle
          cx="24"
          cy="24"
          r={RADIUS}
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          stroke="var(--accent)"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
        />
      </svg>
      <ArrowUp className="size-5 text-[var(--text-secondary)] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:text-[var(--accent)]" />
    </button>
  );
}
