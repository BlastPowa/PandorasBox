"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { FolderOpen, Share2, Globe, Lock, Users, EyeOff } from "lucide-react";
import { BackButton } from "@/components/shell/back-button";
import type { UnifiedSearchResult } from "@core/utils/search";
import {
  getCollection,
  getCollectionItems,
  removeItemFromCollection,
  updateCollection,
  snapshotToResult,
  type Collection,
  type CollectionItem,
  type CollectionVisibility,
} from "@/lib/collections/collections";
import { useLibrary } from "@/lib/library/use-library";
import { createClient } from "@/lib/supabase/client";
import { PosterGrid } from "@/components/discovery/poster-row";
import { EmptyState } from "@/components/ui-fx/feedback";
import { Button } from "@/components/ui-fx/button";
import { Pill } from "@/components/ui-fx/badge";

type SortKey = "added" | "title" | "title_desc" | "year" | "score";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "added", label: "Recently Added" },
  { key: "title", label: "A–Z" },
  { key: "title_desc", label: "Z–A" },
  { key: "year", label: "Release Date" },
  { key: "score", label: "Highest Rated" },
];

const VISIBILITY: { key: CollectionVisibility; label: string; icon: typeof Globe }[] = [
  { key: "public", label: "Public", icon: Globe },
  { key: "unlisted", label: "Unlisted", icon: EyeOff },
  { key: "friends", label: "Friends", icon: Users },
  { key: "private", label: "Private", icon: Lock },
];

export function CollectionDetail({ id }: { id: string }) {
  const { items: libraryItems } = useLibrary();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("added");

  const load = useCallback(async () => {
    try {
      const [meta, rows] = await Promise.all([getCollection(id), getCollectionItems(id)]);
      setCollection(meta);
      setItems(rows);
      const { data } = await createClient().auth.getUser();
      // owner check happens against collection.user_id via a lightweight probe:
      // updateCollection will fail for non-owners, so we infer ownership by
      // whether the current user can see it in their own list is overkill — instead
      // trust RLS: only the owner can mutate. We reveal owner controls if signed-in
      // user id matches the collection's owner (fetched separately).
      if (data.user) {
        const { data: own } = await createClient()
          .from("collections")
          .select("id")
          .eq("id", id)
          .eq("user_id", data.user.id)
          .maybeSingle();
        setIsOwner(Boolean(own));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load collection");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Live status/rating overlay from the viewer's own library when they own the item.
  const libById = useMemo(() => new Map(libraryItems.map((i) => [i.id, i])), [libraryItems]);

  const types = useMemo(() => {
    const set = new Set(items.map((i) => i.item_type).filter(Boolean) as string[]);
    return ["all", ...Array.from(set)];
  }, [items]);

  const resolved = useMemo<UnifiedSearchResult[]>(() => {
    let list = items.slice();
    if (typeFilter !== "all") list = list.filter((i) => i.item_type === typeFilter);
    list.sort((a, b) => {
      switch (sort) {
        case "title":
          return (a.title ?? "").localeCompare(b.title ?? "");
        case "title_desc":
          return (b.title ?? "").localeCompare(a.title ?? "");
        case "year":
          return (b.year ?? 0) - (a.year ?? 0);
        case "score":
          return (b.score ?? 0) - (a.score ?? 0);
        default:
          return new Date(b.added_at).getTime() - new Date(a.added_at).getTime();
      }
    });
    return list.map((i) => {
      const lib = libById.get(i.item_id);
      const base = snapshotToResult(i);
      return lib ? { ...base, score: lib.rating ?? base.score } : base;
    });
  }, [items, typeFilter, sort, libById]);

  async function changeVisibility(v: CollectionVisibility) {
    if (!collection) return;
    try {
      await updateCollection(collection.id, { visibility: v });
      setCollection({ ...collection, visibility: v, is_public: v === "public" || v === "unlisted" });
      toast.success(`Now ${v}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update");
    }
  }

  function share() {
    if (!collection) return;
    const canShare = collection.visibility !== "private";
    void navigator.clipboard.writeText(window.location.href).then(() =>
      canShare
        ? toast.success("Share link copied")
        : toast.warning("This collection is private — set it to Public or Unlisted to share.")
    );
  }

  if (loading) return <div className="skeleton h-64 w-full rounded-[var(--radius-lg)]" />;
  if (!collection) {
    return (
      <EmptyState
        icon={<FolderOpen className="size-10" />}
        title="Collection not found"
        description="It may be private or removed."
        action={<Button asChild variant="glass"><Link href="/collections">Back</Link></Button>}
      />
    );
  }

  return (
    <div className="space-y-5">
      <BackButton fallbackHref="/collections" label="Collections" className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text)]" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold">{collection.name}</h1>
          {collection.description && <p className="mt-1 text-sm text-[var(--text-secondary)]">{collection.description}</p>}
          <p className="mt-1 text-xs capitalize text-[var(--text-muted)]">
            {items.length} {items.length === 1 ? "title" : "titles"} · {collection.visibility}
          </p>
        </div>
        <Button variant="glass" size="sm" onClick={share}>
          <Share2 className="size-4" /> Share
        </Button>
      </div>

      {isOwner && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Visibility</span>
          {VISIBILITY.map((v) => (
            <Pill key={v.key} active={collection.visibility === v.key} onClick={() => void changeVisibility(v.key)}>
              <v.icon className="mr-1 inline size-3" />
              {v.label}
            </Pill>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="size-10" />}
          title="Empty collection"
          description="Open any title (or use the library) and 'Add to collection' to drop it in here."
          action={<Button asChild variant="glass"><Link href="/browse">Browse</Link></Button>}
        />
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {types.length > 2 && (
              <div className="flex flex-wrap gap-2">
                {types.map((t) => (
                  <Pill key={t} active={typeFilter === t} onClick={() => setTypeFilter(t)}>
                    {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
                  </Pill>
                ))}
              </div>
            )}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="ml-auto rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-semibold outline-none"
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>

          <PosterGrid items={resolved} />

          {isOwner && (
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
          )}
        </div>
      )}
    </div>
  );
}
