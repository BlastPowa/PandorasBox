"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Compass, ListChecks, Star, Tv, Sparkles } from "lucide-react";

const STORAGE_KEY = "pb_onboarding_seen_v1";

const STEPS = [
  { icon: Compass, text: "Discover via Home, Browse, Search, or Randomize" },
  { icon: ListChecks, text: "Add titles to your library with a status" },
  { icon: Tv, text: "Mark episodes/chapters as you go" },
  { icon: Star, text: "Rate, review, and build your own rankings" },
];

export function OnboardingHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    } catch {
      // localStorage unavailable (private mode etc.) — just skip the hint
    }
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Quick start guide"
      className="fade-up fixed bottom-24 left-3 z-40 w-[min(320px,calc(100vw-1.5rem))] rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--bg-elevated)]/95 p-4 shadow-2xl backdrop-blur-xl md:bottom-6"
    >
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-[var(--gold)]" />
          <h3 className="font-display text-sm font-bold">New to Pandora&apos;s Box?</h3>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="grid size-6 shrink-0 place-items-center rounded-full text-[var(--text-muted)] hover:bg-[var(--glass)] hover:text-[var(--text)]"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <ul className="space-y-1.5">
        {STEPS.map((step, i) => (
          <li key={i} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <step.icon className="size-3.5 shrink-0 text-[var(--accent)]" />
            {step.text}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={dismiss}
          className="flex-1 rounded-[var(--radius-md)] bg-[linear-gradient(120deg,var(--accent),var(--accent-2))] px-3 py-1.5 text-xs font-bold text-[#0a0a0f]"
        >
          Got it
        </button>
        <Link
          href="/faq"
          onClick={dismiss}
          className="glass rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text)]"
        >
          More help
        </Link>
      </div>
    </div>
  );
}
