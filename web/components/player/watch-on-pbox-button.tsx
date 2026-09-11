"use client";

import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import type { ReelItemType } from "@core/storage/schema";

export function WatchOnPBoxButton({
  title,
  type,
  year,
  source,
  sourceId,
}: {
  title: string;
  type: ReelItemType;
  year: number | null;
  source: string;
  sourceId: string;
}) {
  const router = useRouter();

  if (type !== "movie" && type !== "series" && type !== "anime") return null;

  function handleClick() {
    router.push(`/watch/${type}/${encodeURIComponent(source)}/${encodeURIComponent(sourceId)}`);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-extrabold text-[#08090d] shadow-[0_8px_28px_rgba(153,92,255,0.3)] transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-wait disabled:opacity-65"
    >
      <Play className="size-4 fill-current" />
      Watch on Pandora&apos;s Box
    </button>
  );
}
