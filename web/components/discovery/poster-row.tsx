import type { UnifiedSearchResult } from "@core/utils/search";
import { PosterCard } from "./poster-card";
import { PosterSkeleton } from "@/components/ui-fx/feedback";

export function PosterRow({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle?: string;
  items: UnifiedSearchResult[];
}) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between px-1">
        <div>
          <h2 className="font-display text-lg font-bold">{title}</h2>
          {subtitle && <p className="text-xs text-[var(--text-muted)]">{subtitle}</p>}
        </div>
      </div>
      <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
          <PosterCard key={item.id} item={item} className="w-[130px] shrink-0 snap-start sm:w-[150px]" />
        ))}
      </div>
    </section>
  );
}

export function PosterRowSkeleton({ title }: { title: string }) {
  return (
    <section className="space-y-3">
      <h2 className="px-1 font-display text-lg font-bold">{title}</h2>
      <div className="-mx-1 flex gap-3 overflow-hidden px-1 pb-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <PosterSkeleton key={i} className="w-[130px] shrink-0 sm:w-[150px]" />
        ))}
      </div>
    </section>
  );
}

export function PosterGrid({ items }: { items: UnifiedSearchResult[] }) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
      {items.map((item) => (
        <PosterCard key={item.id} item={item} />
      ))}
    </div>
  );
}
