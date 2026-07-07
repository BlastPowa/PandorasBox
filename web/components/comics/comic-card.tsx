import Image from "next/image";
import { ExternalLink, BookOpen } from "lucide-react";
import type { ComicSeries } from "@/lib/comics";
import { READING_LINKS } from "@/lib/comics";

export function ComicCard({ comic }: { comic: ComicSeries }) {
  const readLink = READING_LINKS[comic.publisher];
  return (
    <div className="glass glow-ring group flex w-[150px] shrink-0 flex-col overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] sm:w-[170px]">
      <a href={comic.comicVineUrl} target="_blank" rel="noopener noreferrer" className="relative block aspect-[2/3] w-full">
        {comic.coverUrl ? (
          <Image src={comic.coverUrl} alt={comic.name} fill sizes="170px" className="object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="grid size-full place-items-center bg-[linear-gradient(160deg,#16121f,#1c1230)] font-display text-3xl font-bold text-[var(--text-muted)]">
            {comic.name.charAt(0)}
          </div>
        )}
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(10,10,15,0.9),transparent_50%)]" />
        <div className="absolute inset-x-0 bottom-0 p-2.5">
          <h3 className="line-clamp-2 text-[13px] font-semibold leading-tight text-white">{comic.name}</h3>
          <span className="mt-0.5 block font-mono text-[10px] text-[var(--text-muted)]">
            {comic.startYear ?? ""} {comic.issueCount > 0 ? `· ${comic.issueCount} issues` : ""}
          </span>
        </div>
      </a>
      <a
        href={readLink.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1.5 border-t border-[var(--border)] px-2 py-2 text-[11px] font-semibold text-[var(--accent)] hover:bg-[var(--glass)]"
      >
        <BookOpen className="size-3.5" /> Read on {readLink.name} <ExternalLink className="size-3" />
      </a>
    </div>
  );
}
