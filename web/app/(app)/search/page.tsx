import { Suspense } from "react";
import { Search } from "lucide-react";
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
      <h1 className="mb-4 font-display text-2xl font-bold">Search</h1>
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
