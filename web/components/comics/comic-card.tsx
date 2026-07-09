import Link from "next/link";
import Image from "next/image";
import type { ComicSeries } from "@/lib/comics-shared";
import { PUBLISHER_LABEL } from "@/lib/comics-shared";

export function ComicCard({ comic }: { comic: ComicSeries }) {
  const label = comic.publisher === "other" ? null : PUBLISHER_LABEL[comic.publisher];
  return (
    <Link
      href={`/comic/${comic.id}`}
      className="glass glow-ring group relative block overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)]"
    >
      <div className="relative aspect-[2/3] w-full">
        {comic.coverUrl ? (
          <Image src={comic.coverUrl} alt={comic.name} fill sizes="(max-width: 768px) 40vw, 200px" className="object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="grid size-full place-items-center bg-[linear-gradient(160deg,#16121f,#1c1230)] font-display text-3xl font-bold text-[var(--text-muted)]">
            {comic.name.charAt(0)}
          </div>
        )}
        {label && (
          <span className="absolute left-2 top-2 rounded-full bg-[rgba(10,10,15,0.7)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur">
            {label}
          </span>
        )}
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(10,10,15,0.92),transparent_55%)]" />
        <div className="absolute inset-x-0 bottom-0 p-2.5">
          <h3 className="line-clamp-2 text-[13px] font-semibold leading-tight text-white">{comic.name}</h3>
          <span className="mt-0.5 block font-mono text-[10px] text-[var(--text-muted)]">
            {comic.startYear ?? ""} {comic.issueCount > 0 ? `· ${comic.issueCount} issues` : ""}
          </span>
        </div>
      </div>
    </Link>
  );
}
