"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Play, X } from "lucide-react";
import type { GameVideo } from "@/lib/igdb";

/** Grid of trailer thumbnails (YouTube stills) opening an embedded player. */
export function GameTrailers({ videos, title }: { videos: GameVideo[]; title: string }) {
  const [active, setActive] = useState<GameVideo | null>(null);
  if (videos.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg font-bold">Trailers &amp; Videos</h2>
      <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {videos.map((v) => (
          <button
            key={v.id}
            onClick={() => setActive(v)}
            className="group relative aspect-video w-56 shrink-0 snap-start overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)]"
          >
            <img
              src={`https://img.youtube.com/vi/${v.youtubeId}/mqdefault.jpg`}
              alt={v.name}
              className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/30 transition group-hover:bg-black/10" />
            <span className="absolute inset-0 grid place-items-center">
              <span className="grid size-11 place-items-center rounded-full bg-[var(--accent)]/90 text-[#0a0a0f]">
                <Play className="size-5 fill-current" />
              </span>
            </span>
            <span className="absolute inset-x-0 bottom-0 truncate bg-[linear-gradient(to_top,rgba(10,10,15,0.9),transparent)] p-2 text-left text-[11px] font-semibold text-white">
              {v.name}
            </span>
          </button>
        ))}
      </div>

      <Dialog.Root open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-3 shadow-2xl">
            <div className="mb-2 flex items-center justify-between gap-3 px-1">
              <Dialog.Title className="truncate font-display text-sm font-bold">
                {title} — {active?.name}
              </Dialog.Title>
              <Dialog.Close className="grid size-8 place-items-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--glass)]">
                <X className="size-4" />
              </Dialog.Close>
            </div>
            <div className="relative aspect-video w-full overflow-hidden rounded-[var(--radius-md)] bg-black">
              {active && (
                <iframe
                  key={active.youtubeId}
                  src={`https://www.youtube-nocookie.com/embed/${active.youtubeId}?autoplay=1&rel=0`}
                  title={active.name}
                  allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                  className="size-full"
                />
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
