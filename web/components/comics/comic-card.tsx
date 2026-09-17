import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, BookOpen } from "lucide-react";
import type { ComicSeries } from "@/lib/comics-shared";
import { PUBLISHER_LABEL } from "@/lib/comics-shared";

type ReadingProgress = { current: number; total: number; percent: number } | null;

export function ComicCard({ comic, view = "grid", progress = null }: { comic: ComicSeries; view?: "grid" | "list"; progress?: ReadingProgress }) {
  const label = comic.publisher === "other" ? null : PUBLISHER_LABEL[comic.publisher];

  if (view === "list") {
    return (
      <Link
        href={`/comic/${comic.id}`}
        className="pb-uiverse-row group grid grid-cols-[76px_1fr_auto] items-center gap-3 overflow-hidden rounded-[20px] border border-[var(--border)] p-2.5 sm:grid-cols-[96px_1fr_auto] sm:gap-4 sm:p-3"
      >
        <div className="relative aspect-[2/3] overflow-hidden rounded-[14px] bg-[var(--bg-elevated)] shadow-sm">
          {comic.coverUrl ? (
            <Image src={comic.coverUrl} alt={comic.name} fill sizes="96px" className="object-cover transition duration-500 group-hover:scale-105" />
          ) : (
            <div className="grid size-full place-items-center font-display text-2xl font-bold text-[var(--text-muted)]">{comic.name.charAt(0)}</div>
          )}
        </div>
        <div className="min-w-0 py-1">
          <div className="flex flex-wrap items-center gap-2">
            {label && <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--accent)]">{label}</span>}
            {comic.startYear !== null && <span className="text-[10px] font-semibold text-[var(--text-muted)]">{comic.startYear}</span>}
          </div>
          <h3 className="mt-1 line-clamp-1 font-display text-base font-bold tracking-tight text-[var(--text)] sm:text-lg">{comic.name}</h3>
          {comic.synopsis && <p className="mt-1 hidden line-clamp-2 max-w-3xl text-xs leading-5 text-[var(--text-secondary)] sm:block">{comic.synopsis}</p>}
          <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-muted)]"><BookOpen className="size-3.5 text-[var(--accent)]" />{comic.issueCount > 0 ? `${comic.issueCount} issues` : "Series details"}</p>
          {progress && (
            <div className="mt-2 max-w-md">
              <div className="flex items-center justify-between gap-3 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]"><span>Reading issue {progress.current}{progress.total > 0 ? ` / ${progress.total}` : ""}</span><span>{progress.percent}%</span></div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-[var(--border)]"><div className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--accent-2))]" style={{ width: `${progress.percent}%` }} /></div>
            </div>
          )}
        </div>
        <span className="grid size-9 place-items-center rounded-full border border-[var(--border)] bg-[var(--glass)] text-[var(--text-secondary)] transition group-hover:border-[rgb(var(--accent-rgb)/0.45)] group-hover:text-[var(--accent)] sm:size-10">
          <ArrowUpRight className="size-4" />
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={`/comic/${comic.id}`}
      className="pb-uiverse-card pb-aura group relative block overflow-hidden rounded-[20px] border border-[var(--border)] bg-[var(--bg-surface)]"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden">
        {comic.coverUrl ? (
          <Image src={comic.coverUrl} alt={comic.name} fill sizes="(max-width: 768px) 40vw, 220px" className="object-cover transition-transform duration-500 group-hover:scale-[1.06]" />
        ) : (
          <div className="grid size-full place-items-center bg-[linear-gradient(160deg,var(--bg-elevated),var(--bg-surface))] font-display text-3xl font-bold text-[var(--text-muted)]">
            {comic.name.charAt(0)}
          </div>
        )}
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(5,6,10,.96)_0%,rgba(5,6,10,.62)_28%,transparent_64%)]" />
        {label && <span className="absolute left-2.5 top-2.5 rounded-full border border-white/15 bg-black/55 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.14em] text-white backdrop-blur-md">{label}</span>}
        {progress && <span className="absolute bottom-[66px] left-2.5 rounded-full border border-white/15 bg-black/60 px-2.5 py-1 text-[9px] font-extrabold text-white backdrop-blur-md">Issue {progress.current}{progress.total > 0 ? ` / ${progress.total}` : ""}</span>}
        <span className="absolute right-2.5 top-2.5 grid size-8 translate-y-1 place-items-center rounded-full border border-white/15 bg-black/45 text-white opacity-0 backdrop-blur-md transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <ArrowUpRight className="size-4" />
        </span>
        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-3.5">
          <h3 className="line-clamp-2 text-[13px] font-bold leading-tight text-white sm:text-sm">{comic.name}</h3>
          <div className="mt-1.5 flex items-center gap-2 text-[10px] font-medium text-white/65">
            {comic.startYear !== null && <span>{comic.startYear}</span>}
            {comic.startYear !== null && comic.issueCount > 0 && <span className="size-1 rounded-full bg-white/35" />}
            {comic.issueCount > 0 && <span>{comic.issueCount} issues</span>}
          </div>
        </div>
        {progress && <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10"><div className="h-full bg-[linear-gradient(90deg,var(--accent),var(--accent-2))]" style={{ width: `${progress.percent}%` }} /></div>}
      </div>
    </Link>
  );
}
