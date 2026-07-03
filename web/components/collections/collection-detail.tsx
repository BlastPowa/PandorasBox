"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, FolderOpen } from "lucide-react";
import type { UnifiedSearchResult } from "@core/utils/search";
import {
  getCollection,
  getCollectionItemIds,
  removeItemFromCollection,
  type Collection,
} from "@/lib/collections/collections";
import { useLibrary } from "@/lib/library/use-library";
import { PosterGrid } from "@/components/discovery/poster-row";
import { EmptyState } from "@/components/ui-fx/feedback";
import { Button } from "@/components/ui-fx/button";

export function CollectionDetail({ id }: { id: string }) {
  const { items } = useLibrary();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [itemIds, setItemIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [meta, ids] = await Promise.all([getCollection(id), getCollectionItemIds(id)]);
      setCollection(meta);
      setItemIds(ids);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load collection");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const resolved = useMemo<UnifiedSearchResult[]>(() => {
    const byId = new Map(items.map((i) => [i.id, i]));
    return itemIds
      .map((iid) => byId.get(iid))
      .filter((i): i is NonNullable<typeof i> => Boolean(i))
      .map((i) => ({
        id: i.id,
        source: i.source,
        type: i.type,
        title: i.title,
        posterUrl: i.posterUrl,
        year: i.year,
        synopsis: i.synopsis,
        score: i.rating,
        totalEpisodes: i.totalEpisodes,
        totalChapters: i.totalChapters,
        anilistId: i.anilistId,
        tmdbId: i.tmdbId,
        mangadexId: i.mangadexId,
        malId: i.malId,
      }));
  }, [items, itemIds]);

  if (loading) return <div className="skeleton h-64 w-full rounded-[var(--radius-lg)]" />;
  if (!collection) {
    return <EmptyState icon={<FolderOpen className="size-10" />} title="Collection not found" description="It may be private or removed." action={<Button asChild variant="glass"><Link href="/collections">Back</Link></Button>} />;
  }

  return (
    <div className="space-y-5">
      <Link href="/collections" className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text)]">
        <ArrowLeft className="size-4" /> Collections
      </Link>
      <div>
        <h1 className="font-display text-2xl font-bold">{collection.name}</h1>
        {collection.description && <p className="mt-1 text-sm text-[var(--text-secondary)]">{collection.description}</p>}
        <p className="mt-1 text-xs text-[var(--text-muted)]">{resolved.length} of {itemIds.length} titles shown (only titles in your library resolve)</p>
      </div>

      {resolved.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="size-10" />}
          title="Empty collection"
          description="Open any title and use 'Add to collection' to drop it in here."
          action={<Button asChild variant="glass"><Link href="/browse">Browse</Link></Button>}
        />
      ) : (
        <div className="space-y-3">
          <PosterGrid items={resolved} />
          <details className="glass rounded-[var(--radius-md)] p-3 text-sm">
            <summary className="cursor-pointer font-semibold text-[var(--text-secondary)]">Manage items</summary>
            <div className="mt-2 space-y-1">
              {resolved.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-1">
                  <span className="truncate">{r.title}</span>
                  <button
                    onClick={() => void removeItemFromCollection(id, r.id).then(load)}
                    className="text-xs font-semibold text-[var(--dropped)]"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
