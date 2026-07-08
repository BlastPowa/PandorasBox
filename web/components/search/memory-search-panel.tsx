"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Sparkles, Search as SearchIcon, Clock } from "lucide-react";
import { Button } from "@/components/ui-fx/button";
import { EmptyState } from "@/components/ui-fx/feedback";
import type { MemorySearchResult } from "@/app/api/memory-search/route";

/** Client-side throttle between searches — the shared free Gemini quota is
 * only ~20 requests/day for the whole app, so this exists purely to stop a
 * single person from rapid-fire clicking through that budget in seconds. */
const COOLDOWN_SECONDS = 20;

export function MemorySearchPanel() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemorySearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function search() {
    if (cooldown > 0) return;
    if (query.trim().length < 8) {
      setNotice("Describe it in a bit more detail — a sentence or two works best.");
      return;
    }
    setSearching(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/memory-search?q=${encodeURIComponent(query.trim())}`);
      if (res.status === 429) {
        setNotice("Searching a bit too fast — wait a moment and try again.");
        setCooldown(COOLDOWN_SECONDS);
        return;
      }
      const json = (await res.json()) as { results: MemorySearchResult[]; error?: string; notice?: string };
      setResults(json.results);
      if (json.error) setNotice(json.error);
      else if (json.notice) setNotice(json.notice);
      else if (json.results.length === 0) setNotice("Nothing matched yet — try describing it differently, or a plot detail we might have indexed.");
      setCooldown(COOLDOWN_SECONDS);
    } catch {
      setNotice("Search failed — try again.");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2 rounded-[var(--radius-md)] bg-[rgb(var(--accent-rgb)/0.1)] p-3 text-xs leading-relaxed text-[var(--text-secondary)]">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" />
        <span>
          Half-remember something? Describe the plot, a character, or a scene — &ldquo;a dystopian world where time
          is life and currency&rdquo; — and AI-assisted recognition plus our own index will try to find it.
        </span>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="A group of strangers wake up trapped in a rotating cube filled with deadly traps..."
          rows={3}
          className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-sm outline-none focus:border-[var(--accent)]"
        />
        <Button onClick={() => void search()} loading={searching} disabled={cooldown > 0} className="sm:self-end">
          {cooldown > 0 ? (
            <>
              <Clock className="size-4" /> Wait {cooldown}s
            </>
          ) : (
            <>
              <SearchIcon className="size-4" /> Find it
            </>
          )}
        </Button>
      </div>

      <p className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
        <Sparkles className="size-3 shrink-0" />
        This uses a free-tier AI search with a limited number of lookups per day — if it's temporarily
        unavailable, you'll still get results from our own index.
      </p>

      {notice && <p className="text-sm text-[var(--text-muted)]">{notice}</p>}

      {results && results.length > 0 && (
        <div className="space-y-2">
          {results.map((r) => (
            <Link
              key={r.id}
              href={`/title/${r.type}/${r.id.split("-")[0]}/${r.id.split("-").slice(1).join("-")}`}
              className="glass flex items-center gap-3 rounded-[var(--radius-md)] p-2.5 hover:border-[var(--accent)]"
            >
              <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-[6px] bg-[var(--bg-surface)]">
                {r.posterUrl && <Image src={r.posterUrl} alt="" fill sizes="44px" className="object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold">{r.title}</p>
                  {r.year && <span className="text-xs text-[var(--text-muted)]">{r.year}</span>}
                </div>
                {r.matchedBecause.length > 0 && (
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    Matched because: {r.matchedBecause.join(", ")}
                  </p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <div className="font-mono text-sm font-bold text-[var(--accent)]">{r.confidence}%</div>
                <div className="text-[10px] uppercase text-[var(--text-muted)]">confidence</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {results && results.length === 0 && !notice && (
        <EmptyState icon={<Sparkles className="size-10" />} title="No matches yet" description="Try a different description." />
      )}
    </div>
  );
}
