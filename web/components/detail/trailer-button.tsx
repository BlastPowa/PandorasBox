"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Clapperboard, X } from "lucide-react";
import { toast } from "sonner";
import type { ReelItemType } from "@core/storage/schema";

interface TrailerButtonProps {
  type: ReelItemType;
  source: string;
  id: string;
  initialKey: string | null;
  totalSeasons: number | null;
  title: string;
}

export function TrailerButton({ type, source, id, initialKey, totalSeasons, title }: TrailerButtonProps) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState<string | null>(initialKey);
  const [season, setSeason] = useState(1);
  const [loading, setLoading] = useState(false);

  const isSeries = type === "series" && (totalSeasons ?? 1) > 1;

  async function loadSeason(next: number) {
    setSeason(next);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/trailer?type=${type}&source=${source}&id=${id}&season=${next}`
      );
      const json = (await res.json()) as { key: string | null };
      setKey(json.key);
      if (!json.key) toast.info(`No trailer found for season ${next}.`);
    } catch {
      setKey(null);
    } finally {
      setLoading(false);
    }
  }

  if (!initialKey && !isSeries) return null;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="glass glow-ring inline-flex h-11 items-center gap-2 rounded-[var(--radius-md)] px-5 text-sm font-semibold">
          <Clapperboard className="size-4 text-[var(--accent)]" /> Watch Trailer
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-3 shadow-2xl">
          <div className="mb-2 flex items-center justify-between gap-3 px-1">
            <Dialog.Title className="truncate font-display text-sm font-bold">{title} — Trailer</Dialog.Title>
            <div className="flex items-center gap-2">
              {isSeries && (
                <select
                  value={season}
                  onChange={(e) => void loadSeason(Number.parseInt(e.target.value, 10))}
                  className="h-8 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-surface)] px-2 text-xs"
                >
                  {Array.from({ length: totalSeasons ?? 1 }, (_, i) => i + 1).map((s) => (
                    <option key={s} value={s}>Season {s}</option>
                  ))}
                </select>
              )}
              <Dialog.Close className="grid size-8 place-items-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--glass)]">
                <X className="size-4" />
              </Dialog.Close>
            </div>
          </div>
          <div className="relative aspect-video w-full overflow-hidden rounded-[var(--radius-md)] bg-black">
            {loading ? (
              <div className="grid size-full place-items-center text-sm text-[var(--text-muted)]">Loading…</div>
            ) : key ? (
              <iframe
                key={key}
                src={`https://www.youtube-nocookie.com/embed/${key}?autoplay=1&rel=0`}
                title={`${title} trailer`}
                allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                className="size-full"
              />
            ) : (
              <div className="grid size-full place-items-center text-sm text-[var(--text-muted)]">
                No trailer available.
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
