import Link from "next/link";
import Image from "next/image";
import type { GameCard as GameCardData } from "@/lib/igdb";
import { cn } from "@/lib/utils";

export function GameCard({ game, className }: { game: GameCardData; className?: string }) {
  return (
    <Link
      href={`/game/${game.id}`}
      className={cn(
        "group pb-card-3d relative block overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)]",
        className
      )}
    >
      <div className="relative aspect-[3/4] w-full">
        {game.coverUrl ? (
          <Image
            src={game.coverUrl}
            alt={game.name}
            fill
            sizes="(max-width: 768px) 40vw, 200px"
            className="object-cover"
          />
        ) : (
          <div className="grid size-full place-items-center bg-[linear-gradient(160deg,#16121f,#1c1230)] font-display text-3xl font-bold text-[var(--text-muted)]">
            {game.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(10,10,15,0.95),rgba(10,10,15,0.05)_45%,transparent)]" />
        {game.rating !== null && (
          <div className="absolute right-2 top-2 rounded-full bg-[rgba(10,10,15,0.7)] px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--gold)] backdrop-blur">
            ★ {game.rating.toFixed(1)}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 p-2.5">
          <h3 className="line-clamp-2 text-[13px] font-semibold leading-tight text-white">{game.name}</h3>
          {game.year !== null && (
            <span className="mt-0.5 block font-mono text-[10px] text-[var(--text-muted)]">{game.year}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
