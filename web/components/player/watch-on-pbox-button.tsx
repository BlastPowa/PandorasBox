"use client";

import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { toast } from "sonner";
import type { ReelItemType } from "@core/storage/schema";
import type { PlaybackSource } from "@/lib/playback/types";

export function WatchOnPBoxButton({
  title,
  type,
  year,
}: {
  title: string;
  type: ReelItemType;
  year: number | null;
}) {
  const [movieHasSources, setMovieHasSources] = useState<boolean | null>(null);

  useEffect(() => {
    if (type !== "movie") return;

    const controller = new AbortController();
    const params = new URLSearchParams({ title, type });
    if (year) params.set("year", String(year));

    void fetch(`/api/playback/sources?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Playback discovery failed");
        const data = (await response.json()) as { sources?: PlaybackSource[] };
        setMovieHasSources((data.sources ?? []).length > 0);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setMovieHasSources(false);
      });

    return () => controller.abort();
  }, [title, type, year]);

  if (type !== "movie" && type !== "series" && type !== "anime") return null;

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleClick() {
    if (type === "series" || type === "anime") {
      scrollTo("pbox-episodes");
      toast.info("Choose an episode to continue watching on Pandora's Box.");
      return;
    }

    if (movieHasSources) {
      scrollTo("pbox-player");
      return;
    }

    scrollTo("where-to-watch");
    toast.info("No verified Pandora's Box source is available for this title yet.");
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={type === "movie" && movieHasSources === null}
      className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-extrabold text-[#08090d] shadow-[0_8px_28px_rgba(153,92,255,0.3)] transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-wait disabled:opacity-65"
    >
      <Play className="size-4 fill-current" />
      {type === "movie" && movieHasSources === null ? "Finding source..." : "Watch on Pandora's Box"}
    </button>
  );
}
