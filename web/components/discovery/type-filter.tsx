"use client";

import { useState } from "react";
import type { ReelItemType } from "@core/storage/schema";
import type { UnifiedSearchResult } from "@core/utils/search";
import { Pill } from "@/components/ui-fx/badge";
import { PosterGrid } from "@/components/discovery/poster-row";
import { EmptyState } from "@/components/ui-fx/feedback";
import { SearchX } from "lucide-react";

const FILTERS: { key: ReelItemType | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "movie", label: "Movies" },
  { key: "series", label: "TV & Series" },
  { key: "anime", label: "Anime" },
  { key: "manga", label: "Manga" },
  { key: "manhwa", label: "Manhwa" },
  { key: "comic", label: "Comics" },
];

export function FilterableGrid({ items }: { items: UnifiedSearchResult[] }) {
  const [filter, setFilter] = useState<ReelItemType | "all">("all");
  const filtered = filter === "all" ? items : items.filter((i) => i.type === filter);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Pill key={f.key} active={filter === f.key} onClick={() => setFilter(f.key)}>
            {f.label}
          </Pill>
        ))}
      </div>
      {filtered.length === 0 ? (
        <EmptyState
          icon={<SearchX className="size-10" />}
          title="No results"
          description="Try a different title or filter. Anime & manga work without setup; movies and TV need a TMDB key."
        />
      ) : (
        <PosterGrid items={filtered} />
      )}
    </div>
  );
}
