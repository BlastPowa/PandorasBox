"use client";
import { useEffect, useState } from "react";

export function countdownText(timestamp: number, now: number): string {
  const seconds = Math.max(0, Math.ceil((timestamp * 1000 - now) / 1000));
  if (!seconds) return "Aired · schedule may update";
  const days = Math.floor(seconds / 86400), hours = Math.floor(seconds % 86400 / 3600), minutes = Math.floor(seconds % 3600 / 60);
  return `${days}d ${hours}h ${minutes}m ${seconds % 60}s`;
}

export function EpisodeCountdown({ timestamp, episode }: { timestamp: number; episode: number }) {
  const [now, setNow] = useState(0);
  useEffect(() => { const update = () => setNow(Date.now()); update(); const timer = setInterval(update,1000); return () => clearInterval(timer); }, [timestamp]);
  return <section className="mt-4 max-w-xl rounded-2xl border border-[rgb(var(--accent-rgb)/.3)] bg-[rgb(var(--accent-rgb)/.1)] p-4" aria-label="Next anime episode">
    <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-bold text-[var(--accent)]">NEXT EPISODE · {episode}</span><span className="font-mono text-sm font-bold tabular-nums">{now ? countdownText(timestamp,now) : "Checking broadcast time…"}</span></div>
    <p className="mt-2 text-xs text-[var(--text-secondary)]">{now ? new Date(timestamp * 1000).toLocaleString(undefined,{dateStyle:"full",timeStyle:"short"}) : "Loading local date and time…"}</p>
    <p className="mt-1 text-[10px] text-[var(--text-muted)]">Broadcast schedule from AniList · times shown in your local time zone</p>
  </section>;
}
