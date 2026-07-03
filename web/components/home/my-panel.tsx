"use client";

import { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { PlayCircle, ChevronRight } from "lucide-react";
import { formatProgress, getStatusColor, getStatusLabel } from "@core/utils/formatters";
import { useLibrary } from "@/lib/library/use-library";
import { GlassCard } from "@/components/ui-fx/glass-card";

export function MyPanel() {
  const { items, signedIn, loading } = useLibrary();

  const inProgress = useMemo(
    () =>
      items
        .filter(
          (i) =>
            (i.status === "watching" || i.status === "reading") &&
            i.progress.percentComplete > 0 &&
            i.progress.percentComplete < 100
        )
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 6),
    [items]
  );

  const recent = useMemo(
    () =>
      items
        .slice()
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5),
    [items]
  );

  const counts = useMemo(() => {
    let animeTv = 0;
    let reading = 0;
    let watching = 0;
    let completed = 0;
    let episodes = 0;
    for (const i of items) {
      if (i.type === "manga" || i.type === "manhwa") reading += 1;
      else animeTv += 1;
      if (i.status === "watching" || i.status === "reading") watching += 1;
      if (i.status === "completed") completed += 1;
      episodes += i.progress.currentEpisode ?? 0;
    }
    return { animeTv, reading, watching, completed, episodes, total: items.length };
  }, [items]);

  if (!signedIn || loading || items.length === 0) return null;

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
      {/* Continue */}
      <GlassCard macDots title="Continue">
        <div className="p-4">
          {inProgress.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--text-muted)]">
              Nothing in progress — start something and it&apos;ll show up here.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {inProgress.map((i) => (
                <Link
                  key={i.id}
                  href={`/title/${i.type}/${i.source}/${i.anilistId ?? i.tmdbId ?? i.mangadexId}`}
                  className="group"
                >
                  <div className="relative aspect-[2/3] overflow-hidden rounded-[var(--radius-md)] bg-[var(--bg-elevated)]">
                    {i.posterUrl ? (
                      <Image src={i.posterUrl} alt={i.title} fill sizes="120px" className="object-cover transition-transform group-hover:scale-105" />
                    ) : (
                      <div className="grid size-full place-items-center font-display text-xl">{i.title.charAt(0)}</div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 grid place-items-center bg-gradient-to-t from-black/70 to-transparent pb-1 pt-6 opacity-0 transition-opacity group-hover:opacity-100">
                      <PlayCircle className="size-6 text-white" />
                    </div>
                    <div className="absolute inset-x-0 bottom-0 h-1 bg-black/40">
                      <div className="h-full bg-[linear-gradient(120deg,var(--accent),var(--accent-2))]" style={{ width: `${Math.round(i.progress.percentComplete)}%` }} />
                    </div>
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs font-medium">{i.title}</p>
                  <p className="line-clamp-1 text-[10px] text-[var(--text-muted)]">{formatProgress(i.progress, i.type)}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </GlassCard>

      {/* Stats + recent (MAL "My Panel" sidebar) */}
      <div className="space-y-4">
        <GlassCard macDots title="My Stats">
          <div className="divide-y divide-[var(--border)] text-sm">
            <Row label="Screen Entries" value={counts.animeTv} href="/library" />
            <Row label="Reading Entries" value={counts.reading} href="/library" />
            <Row label="Watching / Reading" value={counts.watching} />
            <Row label="Completed" value={counts.completed} />
            <Row label="Episodes" value={counts.episodes} />
          </div>
          <div className="border-t border-[var(--border)] p-2">
            <Link href="/stats" className="flex items-center justify-center gap-1 rounded-[8px] py-1.5 text-xs font-semibold text-[var(--accent)] hover:bg-[var(--glass)]">
              Full stats <ChevronRight className="size-3.5" />
            </Link>
          </div>
        </GlassCard>

        <GlassCard macDots title="Recent Updates">
          <div className="divide-y divide-[var(--border)]">
            {recent.map((i) => (
              <Link
                key={i.id}
                href={`/title/${i.type}/${i.source}/${i.anilistId ?? i.tmdbId ?? i.mangadexId}`}
                className="flex items-center gap-2.5 p-2.5 transition-colors hover:bg-[var(--glass)]"
              >
                <div className="relative h-10 w-7 shrink-0 overflow-hidden rounded-[4px] bg-[var(--bg-elevated)]">
                  {i.posterUrl && <Image src={i.posterUrl} alt="" fill sizes="28px" className="object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{i.title}</p>
                  <p className="text-[10px]" style={{ color: getStatusColor(i.status) }}>{getStatusLabel(i.status)}</p>
                </div>
              </Link>
            ))}
          </div>
        </GlassCard>
      </div>
    </section>
  );
}

function Row({ label, value, href }: { label: string; value: number; href?: string }) {
  const content = (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className="text-[var(--text-secondary)]">{label}</span>
      <span className="font-mono font-semibold">{value}</span>
    </div>
  );
  return href ? <Link href={href} className="block hover:bg-[var(--glass)]">{content}</Link> : content;
}
