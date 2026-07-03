"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Search, CornerDownLeft } from "lucide-react";
import type { UnifiedSearchResult } from "@core/utils/search";
import { NAV_ITEMS } from "@/lib/nav";
import { TypeBadge } from "@/components/ui-fx/badge";
import { Spinner } from "@/components/ui-fx/feedback";

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<UnifiedSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) {
      setQ("");
      setResults([]);
      setActive(0);
    }
  }, [open]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const query = q.trim();
    if (query.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const json = (await res.json()) as { results: UnifiedSearchResult[] };
        setResults(json.results);
        setActive(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q]);

  const navMatches = NAV_ITEMS.filter(
    (n) => !n.adminOnly && (q.trim().length === 0 || n.label.toLowerCase().includes(q.trim().toLowerCase()))
  ).slice(0, q.trim().length === 0 ? 6 : 4);

  const flat: { kind: "nav" | "result"; href: string; label: string; item?: UnifiedSearchResult }[] = [
    ...navMatches.map((n) => ({ kind: "nav" as const, href: n.href, label: n.label })),
    ...results.map((r) => ({
      kind: "result" as const,
      href: `/title/${r.type}/${r.source}/${r.anilistId ?? r.tmdbId ?? r.mangadexId}`,
      label: r.title,
      item: r,
    })),
  ];

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = flat[active];
      if (target) go(target.href);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-[12vh] z-50 w-[92vw] max-w-xl -translate-x-1/2 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] shadow-2xl"
          aria-describedby={undefined}
        >
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>
          <div className="flex items-center gap-3 border-b border-[var(--border)] px-4">
            {loading ? <Spinner size={16} /> : <Search className="size-4 text-[var(--text-muted)]" />}
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onInputKey}
              placeholder="Search titles or jump to a page…"
              className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-[var(--text-muted)]"
            />
            <kbd className="hidden rounded border border-[var(--border)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-muted)] sm:block">ESC</kbd>
          </div>
          <div className="max-h-[52vh] overflow-y-auto p-2">
            {flat.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-[var(--text-muted)]">
                {q.trim().length >= 2 ? "No matches" : "Type to search movies, TV, anime, manga…"}
              </p>
            )}
            {navMatches.length > 0 && (
              <div className="mb-1">
                <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Pages</p>
                {navMatches.map((n) => {
                  const idx = flat.findIndex((f) => f.kind === "nav" && f.href === n.href);
                  const Icon = n.icon;
                  return (
                    <button
                      key={n.href}
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => go(n.href)}
                      className={`flex w-full items-center gap-3 rounded-[8px] px-3 py-2 text-left text-sm ${active === idx ? "bg-[var(--glass)]" : ""}`}
                    >
                      <Icon className="size-4 text-[var(--text-secondary)]" /> {n.label}
                    </button>
                  );
                })}
              </div>
            )}
            {results.length > 0 && (
              <div>
                <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Titles</p>
                {results.map((r) => {
                  const href = `/title/${r.type}/${r.source}/${r.anilistId ?? r.tmdbId ?? r.mangadexId}`;
                  const idx = flat.findIndex((f) => f.kind === "result" && f.href === href && f.label === r.title);
                  return (
                    <button
                      key={r.id}
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => go(href)}
                      className={`flex w-full items-center gap-3 rounded-[8px] px-3 py-2 text-left ${active === idx ? "bg-[var(--glass)]" : ""}`}
                    >
                      <div className="relative h-12 w-8 shrink-0 overflow-hidden rounded-[4px] bg-[var(--bg-surface)]">
                        {r.posterUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.posterUrl} alt="" className="size-full object-cover" />
                        )}
                      </div>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{r.title}</span>
                        <span className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                          <TypeBadge type={r.type} />
                          {r.year ?? ""}
                        </span>
                      </span>
                      {active === idx && <CornerDownLeft className="size-3.5 text-[var(--text-muted)]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
