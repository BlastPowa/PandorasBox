"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/**
 * True history-back navigation (preserves the previous page's scroll position
 * and state) instead of a static link to a fixed parent route, which always
 * reopens that page fresh and loses wherever the user was scrolled to.
 * Falls back to `fallbackHref` when there's no prior history entry (e.g. the
 * page was opened directly via a shared link or a new tab).
 */
export function BackButton({
  fallbackHref = "/",
  label = "Back",
  className,
}: {
  fallbackHref?: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();

  function handleClick() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  }

  return (
    <button
      onClick={handleClick}
      className={
        className ??
        "inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text)]"
      }
    >
      <ArrowLeft className="size-4" /> {label}
    </button>
  );
}
