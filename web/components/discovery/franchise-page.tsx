"use client";

import { Sparkles } from "lucide-react";
import type { UnifiedSearchResult } from "@core/utils/search";
import type { FranchiseDef } from "@/lib/franchises";
import { PosterGrid } from "@/components/discovery/poster-row";
import { EmptyState } from "@/components/ui-fx/feedback";
import { BulkAddToCollection } from "@/components/collections/bulk-add-to-collection";
import type { AddToCollectionItem } from "@/components/collections/add-to-collection";
import { useLibrary } from "@/lib/library/use-library";
import { BackButton } from "@/components/shell/back-button";
import { DiscoveryPageHeader } from "@/components/discovery/discovery-page-header";

function toCollectionItem(r: UnifiedSearchResult): AddToCollectionItem {
  return {
    id: r.id,
    type: r.type,
    source: r.source,
    title: r.title,
    posterUrl: r.posterUrl,
    year: r.year,
    anilistId: r.anilistId,
    tmdbId: r.tmdbId,
    mangadexId: r.mangadexId,
  };
}

export function FranchisePage({ franchise, items }: { franchise: FranchiseDef; items: UnifiedSearchResult[] }) {
  const { signedIn } = useLibrary();

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8">
      <BackButton fallbackHref="/browse" label="Browse" className="mb-3 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text)]" />
      <DiscoveryPageHeader eyebrow="PBox Franchise" title={franchise.name} description={franchise.description} actions={signedIn && items.length > 0 ? <BulkAddToCollection items={items.map(toCollectionItem)} /> : <Sparkles className="hidden size-6 text-[var(--gold)] sm:block" />} />

      <div className="mt-6">
        {items.length === 0 ? (
          <EmptyState title="Nothing found" description="TMDB may be temporarily unavailable — try again shortly." />
        ) : (
          <PosterGrid items={items} />
        )}
      </div>
    </div>
  );
}
