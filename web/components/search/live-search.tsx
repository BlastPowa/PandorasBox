/* eslint-disable @next/next/no-img-element -- Small catalogue thumbnails and collection collages use remote source URLs. */
"use client";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, Star } from "lucide-react";
import { SearchInput } from "@/components/ui-fx/input";
import type { UnifiedSearchResult } from "@core/utils/search";
import { mediaItemHref } from "@/lib/library/item-href";

export function LiveSearch({ onNavigate, autoFocus = false }: { onNavigate?: () => void; autoFocus?: boolean }) {
  const router = useRouter();
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("all");
  const [snapshot, setSnapshot] = useState<{query: string; items: UnifiedSearchResult[]; error: boolean}>({query: "", items: [], error: false});
  const q = query.trim();
  useEffect(() => {
    if (q.length < 2) return;
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (!response.ok) throw new Error();
        const data = await response.json() as { results?: UnifiedSearchResult[] };
        if (!controller.signal.aborted) setSnapshot({query: q, items: data.results ?? [], error: false});
      } catch { if (!controller.signal.aborted) setSnapshot({query: q, items: [], error: true}); }
    }, 300);
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [q]);
  useEffect(() => {
    const close = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  const items = snapshot.query === q ? snapshot.items.filter(item => kind === "all" || item.type === kind || (kind === "manga" && item.type === "manhwa")) : [];
  const pending = q !== snapshot.query;
  function navigate() { setOpen(false); onNavigate?.(); }
  function keyboard(e: KeyboardEvent) {
    if (e.key === "Escape") { input.current?.focus(); setOpen(false); e.stopPropagation(); }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const links = [...(root.current?.querySelectorAll<HTMLAnchorElement>("[data-search-result]") ?? [])];
    if (!links.length) return;
    e.preventDefault();
    const current = links.indexOf(document.activeElement as HTMLAnchorElement);
    const index = e.key === "ArrowDown" ? (current + 1) % links.length : (current <= 0 ? links.length - 1 : current - 1);
    links[index]?.focus();
  }
  return <div ref={root} className="relative min-w-0" onKeyDown={keyboard} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false); }}>
    <form onSubmit={e => { e.preventDefault(); if (!q) return; navigate(); router.push(`/search?q=${encodeURIComponent(q)}`); }}>
      <SearchInput ref={input} autoFocus={autoFocus} icon={<Search className="size-4" />} placeholder="Search movies, shows, anime and more" value={query} onChange={e => {setQuery(e.target.value); setOpen(true);}} onFocus={() => setOpen(true)} onClick={() => setOpen(true)} autoComplete="off" aria-label="Search" aria-expanded={open && q.length >= 2} className="text-base" />
    </form>
    {open && q.length >= 2 && <div className="pb-search-preview absolute inset-x-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)]/95 shadow-[0_24px_80px_rgba(0,0,0,.5)] backdrop-blur-2xl">
      <div className="flex gap-1.5 overflow-x-auto border-b border-[var(--border)] p-3" role="group" aria-label="Search categories">
        {[["all","All"],["movie","Movies"],["series","Shows"],["anime","Anime"],["manga","Manga"],["comic","Comics"]].map(([value,label]) => <button type="button" key={value} aria-pressed={kind === value} onClick={() => setKind(value)} className={`min-h-9 shrink-0 rounded-full px-3 text-xs font-semibold ${kind === value ? "bg-[var(--accent)] text-[var(--accent-contrast)]" : "bg-[var(--glass)] text-[var(--text-muted)]"}`}>{label}</button>)}
      </div>
      <div className="max-h-[min(55dvh,440px)] overflow-y-auto p-2" aria-label="Search suggestions">
        {pending ? <p role="status" className="p-4 text-sm text-[var(--text-muted)]">Searching…</p> : snapshot.error ? <p role="status" className="p-4 text-sm text-[var(--text-muted)]">Search is unavailable. Try again in a moment.</p> : !items.length ? <p role="status" className="p-4 text-sm text-[var(--text-muted)]">No matches in this category. Try another title or see all results.</p> : items.map(item => <Link data-search-result key={`${item.type}:${item.id}`} href={mediaItemHref(item)} onClick={navigate} className="flex min-h-20 items-center gap-3 rounded-xl p-2 transition hover:bg-[var(--glass)] focus:bg-[var(--glass)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]">
          {item.posterUrl ? <img src={item.posterUrl} alt="" className="h-16 w-11 shrink-0 rounded-md object-cover" /> : <span className="h-16 w-11 shrink-0 rounded-md bg-[var(--bg-elevated)]" />}
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{item.title}</span><span className="mt-1 flex items-center gap-2 text-xs text-[var(--text-muted)]">{item.year}{item.score != null && <span className="inline-flex items-center gap-1"><Star className="size-3 fill-[var(--gold)] text-[var(--gold)]" />{item.score.toFixed(1)}</span>}</span></span>
          <span className="rounded-full border border-[var(--border)] px-2 py-1 text-[10px] uppercase text-[var(--text-muted)]">{item.type === "series" ? "TV" : item.type}</span>
        </Link>)}
      </div>
      <Link href={`/search?q=${encodeURIComponent(q)}`} onClick={navigate} className="flex min-h-11 items-center justify-between border-t border-[var(--border)] px-4 text-xs font-semibold text-[var(--text-secondary)]"><span>Full search · related titles & lists</span><ArrowRight className="size-4" /></Link>
    </div>}
  </div>;
}
