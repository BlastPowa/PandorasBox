import { Suspense } from "react";
import { Search, Sparkles } from "lucide-react";
import { runSearch } from "@/lib/search-server";
import { FilterableGrid } from "@/components/discovery/type-filter";
import { EmptyState } from "@/components/ui-fx/feedback";
import { SearchModeTabs } from "@/components/search/search-mode-tabs";

export const dynamic = "force-dynamic";

async function Results({ q }: { q: string }) {
  const results = await runSearch(q);
  return (
    <>
      <p className="mb-4 text-sm text-[var(--text-secondary)]">
        {results.length} result{results.length === 1 ? "" : "s"} for{" "}
        <span className="font-semibold text-[var(--text)]">&ldquo;{q}&rdquo;</span>
      </p>
      <FilterableGrid items={results} />
    </>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8">
      <header className="relative mb-6 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--media-border)] bg-[radial-gradient(circle_at_75%_20%,rgb(var(--accent-2-rgb)/0.22),transparent_35%),radial-gradient(circle_at_10%_90%,rgb(var(--accent-rgb)/0.28),transparent_42%),var(--bg-surface)] px-5 py-8 sm:px-8 sm:py-12">
        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]"><Sparkles className="size-4" /> Unified discovery</span>
        <h1 className="mt-2 font-display text-3xl font-extrabold sm:text-5xl">Search every story</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--text-secondary)]">One search across movies, television, anime, manga, manhwa, and comics.</p>
      </header>
      <SearchModeTabs>
        {query.length === 0 ? (
          <EmptyState
            icon={<Search className="size-10" />}
            title="Search everything"
            description="Movies, TV, K-drama, cartoons, anime, manga and manhwa — one search across TMDB, AniList and MangaDex."
          />
        ) : (
          <Suspense
            key={query}
            fallback={<div className="skeleton h-64 w-full rounded-[var(--radius-lg)]" />}
          >
            <Results q={query} />
          </Suspense>
        )}
      </SearchModeTabs>
    </div>
  );
}
