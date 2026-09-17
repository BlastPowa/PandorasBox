import Link from "next/link";
import Image from "next/image";
import { CalendarDays, Gamepad2 } from "lucide-react";
import type { GameCard as GameCardData } from "@/lib/igdb";
import { cn } from "@/lib/utils";

function releaseContext(releaseDate: string | null, year: number | null) {
  if (!releaseDate) return year ? String(year) : "Release TBA";
  return new Intl.DateTimeFormat("en-IE", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(releaseDate));
}

export function GameCard({ game, className }: { game: GameCardData; className?: string }) {
  return (
    <Link
      href={`/game/${game.id}`}
      className={cn(
        "group pb-card-3d relative block overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] shadow-[0_12px_32px_rgba(15,23,42,.06)] transition duration-300 hover:-translate-y-1 hover:border-[rgb(var(--accent-rgb)/0.34)] hover:shadow-[0_20px_46px_rgba(15,23,42,.12)]",
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
        {game.peakPlayers !== null && (
          <div className="absolute left-2 top-2 rounded-full border border-emerald-300/25 bg-emerald-950/80 px-2 py-0.5 font-mono text-[9px] font-semibold text-emerald-200 backdrop-blur">
            {new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(game.peakPlayers)} playing
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 p-2.5">
          <h3 className="line-clamp-2 text-[13px] font-semibold leading-tight text-white">{game.name}</h3>
          <div className="mt-1.5 flex items-center gap-2 text-[9px] font-semibold text-white/65">
            <span className="inline-flex min-w-0 items-center gap-1"><CalendarDays className="size-3 shrink-0" /><span className="truncate">{releaseContext(game.releaseDate, game.year)}</span></span>
            {game.platforms[0] && <><span className="size-1 shrink-0 rounded-full bg-white/35" /><span className="truncate">{game.platforms[0]}</span></>}
          </div>
        </div>
      </div>
      {(game.developers[0] || game.publishers[0] || game.platforms.length > 1) && (
        <div className="flex min-h-10 items-center justify-between gap-2 border-t border-[var(--border)] px-2.5 py-2 text-[9px] font-semibold text-[var(--text-muted)]">
          <span className="truncate">{game.developers[0] ?? game.publishers[0] ?? "Game"}</span>
          {game.platforms.length > 1 && <span className="inline-flex shrink-0 items-center gap-1 text-[var(--accent)]"><Gamepad2 className="size-3" />+{game.platforms.length - 1}</span>}
        </div>
      )}
    </Link>
  );
}
