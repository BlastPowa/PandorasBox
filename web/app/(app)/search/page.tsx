import { Suspense } from "react";
import { ArrowRight, Search, Sparkles } from "lucide-react";
import { runSearch } from "@/lib/search-server";
import { FilterableGrid } from "@/components/discovery/type-filter";
import { EmptyState } from "@/components/ui-fx/feedback";
import { SearchModeTabs } from "@/components/search/search-mode-tabs";
import { getFranchiseOrders, matchFranchiseQuery } from "@/lib/franchises";

export const dynamic = "force-dynamic";

async function Results({ q }: { q: string }) {
  const franchiseDef = matchFranchiseQuery(q);
  const [results, franchiseOrders] = await Promise.all([
    runSearch(q),
    franchiseDef ? getFranchiseOrders(franchiseDef.slug) : Promise.resolve(null),
  ]);
  const franchise = franchiseDef && franchiseOrders
    ? {
        slug: franchiseDef.slug,
        name: franchiseDef.name,
        description: franchiseDef.description,
        ...franchiseOrders,
      }
    : null;
  return (
    <FilterableGrid items={results} franchise={franchise} query={q} />
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
      <header className="relative mb-6 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--media-border)] bg-[radial-gradient(circle_at_78%_18%,rgb(var(--accent-2-rgb)/0.18),transparent_34%),radial-gradient(circle_at_12%_100%,rgb(var(--accent-rgb)/0.2),transparent_40%),var(--bg-surface)] px-5 py-6 sm:px-7 sm:py-8">
        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]"><Sparkles className="size-4" /> Unified discovery</span>
        <h1 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">Find your next story</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">Search movies, television, anime, manga, manhwa, and comics from one place.</p>

        <form action="/search" method="get" className="mt-5 flex max-w-3xl flex-col gap-2 sm:flex-row">
          <label className="group flex min-h-12 flex-1 items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 shadow-sm backdrop-blur-xl transition focus-within:border-[rgb(var(--accent-rgb)/0.6)] focus-within:ring-2 focus-within:ring-[rgb(var(--accent-rgb)/0.12)]">
            <Search className="size-4 shrink-0 text-[var(--text-muted)] transition group-focus-within:text-[var(--accent)]" />
            <span className="sr-only">Search titles</span>
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search a title, series, manga, comic..."
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent py-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            />
          </label>
          <button
            type="submit"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-5 text-sm font-bold text-[var(--accent-contrast)] shadow-[0_12px_30px_rgb(var(--accent-rgb)/0.2)] transition hover:brightness-110 active:scale-[0.98]"
          >
            Search <ArrowRight className="size-4" />
          </button>
        </form>
      </header>
      <SearchModeTabs>
        {query.length === 0 ? (
          <EmptyState
            icon={<Search className="size-10" />}
            title="Start with a title"
            description="Search across movies, TV, K-drama, cartoons, anime, manga, manhwa, and comics."
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
