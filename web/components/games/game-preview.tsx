"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "@/components/ui/app-link";
import Image from "next/image";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, X } from "lucide-react";
import type { GameCard } from "@/lib/igdb";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

export function GameTrailerPreview({ game, autoplay = true }: { game: GameCard; autoplay?: boolean }) {
  const reducedMotion = useReducedMotion();
  return <div className="relative aspect-video overflow-hidden rounded-2xl bg-black">
    {game.trailerId ? <iframe key={game.trailerId} src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(game.trailerId)}?autoplay=${autoplay && !reducedMotion ? 1 : 0}&mute=1&controls=1&playsinline=1&rel=0`} title={`${game.name} trailer`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen className="absolute inset-0 size-full" /> : <>
      {(game.backdropUrl ?? game.coverUrl) && <Image src={(game.backdropUrl ?? game.coverUrl)!} alt="" fill sizes="400px" className="object-cover" />}
      <span className="absolute bottom-2 left-2 rounded-lg bg-black/70 px-2 py-1 text-xs text-white">Trailer unavailable</span>
    </>}
  </div>;
}

export function GamePreview({ game, children, className }: { game: GameCard; children: ReactNode; className?: string }) {
  const anchor = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hover, setHover] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [position, setPosition] = useState({ top: 16, left: 16 });
  function cancelClose() { if (timer.current) clearTimeout(timer.current); }
  function closeSoon() { cancelClose(); timer.current = setTimeout(() => setHover(false), 220); }
  function open() {
    if (!window.matchMedia("(hover: hover) and (min-width: 768px)").matches) return;
    cancelClose(); const rect = anchor.current?.getBoundingClientRect(); if (!rect) return;
    const width = Math.min(370, window.innerWidth - 32);
    const height = Math.min(520, window.innerHeight - 32);
    setPosition({ top: Math.max(16, Math.min(rect.top, window.innerHeight - height - 16)), left: Math.max(16, Math.min(rect.right + 12, window.innerWidth - width - 16)) }); setHover(true);
  }
  useEffect(() => {
    const close = (event: Event) => { if ((event.target as HTMLElement)?.closest?.("[data-game-preview]")) return; setHover(false); };
    window.addEventListener("scroll", close, true); window.addEventListener("resize", close);
    return () => { if (timer.current) clearTimeout(timer.current); window.removeEventListener("scroll", close, true); window.removeEventListener("resize", close); };
  }, []);
  const release = game.releaseDate ? new Date(game.releaseDate).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "Release date TBA";
  const body = <><GameTrailerPreview game={game} /><div className="space-y-3 pt-3"><h3 className="font-display text-lg font-bold">{game.name}</h3><p className="text-xs text-[var(--text-muted)]">{release}{game.rating !== null ? ` · ★ ${game.rating.toFixed(1)}` : ""}</p>{game.summary && <p className="line-clamp-3 text-xs leading-5 text-[var(--text-secondary)]">{game.summary}</p>}<p className="text-xs font-semibold">{game.developers[0] ?? game.publishers[0] ?? "Studio TBA"}</p><div className="flex flex-wrap gap-1.5">{game.platforms.slice(0,5).map(platform => <span key={platform} className="rounded-full border border-[var(--border)] px-2 py-1 text-[10px]">{platform}</span>)}</div><Link href={`/game/${game.id}`} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-3 text-sm font-bold text-white">More details <ArrowRight className="size-4" /></Link></div></>;
  return <div ref={anchor} className={`relative min-w-0 ${className ?? ""}`} onMouseEnter={open} onMouseLeave={closeSoon} onFocusCapture={open} onBlurCapture={closeSoon}>
    {children}
    <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}><Dialog.Trigger asChild><button className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--glass)] text-xs font-bold md:hidden [@media(hover:none)]:block">Quick look<span className="sr-only"> at {game.name}</span></button></Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" /><Dialog.Content className="fixed inset-x-3 bottom-[max(12px,var(--safe-bottom))] z-50 max-h-[88dvh] overflow-y-auto rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-2xl sm:left-1/2 sm:right-auto sm:w-[min(400px,92vw)] sm:-translate-x-1/2"><div className="mb-3 flex items-center justify-between"><Dialog.Title className="font-bold">Game preview</Dialog.Title><Dialog.Close aria-label="Close game preview" className="grid size-11 place-items-center rounded-full border border-[var(--border)]"><X className="size-4" /></Dialog.Close></div><Dialog.Description className="sr-only">Trailer, release date and details for {game.name}</Dialog.Description>{body}</Dialog.Content></Dialog.Portal></Dialog.Root>
    {hover && !mobileOpen && createPortal(<div data-game-preview role="region" aria-label={`${game.name} preview`} onMouseEnter={cancelClose} onMouseLeave={closeSoon} onFocusCapture={cancelClose} onBlurCapture={closeSoon} onKeyDown={event => { if (event.key === "Escape") setHover(false); }} className="fixed z-[70] max-h-[calc(100dvh-32px)] w-[min(370px,calc(100vw-32px))] overflow-y-auto rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-3 shadow-2xl" style={position}>{body}</div>, document.body)}
  </div>;
}
