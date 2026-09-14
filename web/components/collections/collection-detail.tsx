"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { CopyPlus, FolderOpen, Globe, Lock, Users, EyeOff } from "lucide-react";
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
import { ShareDialog } from "@/components/social/share-dialog";

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
  const { items: libraryItems, signedIn } = useLibrary();
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
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
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
  const heroImage = collection?.cover_url ?? items.find((item) => item.poster_url)?.poster_url ?? null;

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

  async function copyCollection() {
    try {
      const response = await fetch(`/api/collections/${id}/copy`, { method: "POST" });
      const body = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !body.id) throw new Error(body.error ?? "Could not copy collection");
      toast.success("Saved as a private collection", { action: { label: "Open", onClick: () => { window.location.href = `/collections/${body.id}`; } } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not copy collection");
    }
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
    <div className="space-y-7">
      <section className="relative min-h-[300px] overflow-hidden rounded-[28px] border border-[var(--media-border)] bg-[var(--bg-surface)] shadow-[0_24px_70px_rgba(15,23,42,.1)] sm:min-h-[360px]">
        {heroImage ? (
          <>
            <Image src={heroImage} alt="" fill priority sizes="(max-width: 1400px) 100vw, 1400px" className="scale-110 object-cover object-center opacity-55 blur-[2px]" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,8,12,.78)_0%,rgba(8,8,12,.48)_50%,rgba(8,8,12,.2)_100%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(8,8,12,.88)_0%,rgba(8,8,12,.28)_60%,rgba(8,8,12,.12)_100%)]" />
          </>
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_24%,rgb(var(--accent-rgb)/0.35),transparent_42%),radial-gradient(circle_at_78%_32%,rgb(var(--accent-2-rgb)/0.24),transparent_38%),linear-gradient(145deg,#171724,#09090f)]" />
        )}

        <div className="relative z-10 flex min-h-[300px] flex-col p-4 text-white sm:min-h-[360px] sm:p-6">
          <div>
            <BackButton fallbackHref="/collections" label="Collections" className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/25 px-3 py-1.5 text-sm font-semibold text-white/90 backdrop-blur-md transition hover:bg-black/40 hover:text-white" />
          </div>

          <div className="mt-auto flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-3xl">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-white/65">Collection</p>
              <h1 className="font-display text-4xl font-extrabold leading-[.96] tracking-tight sm:text-6xl">{collection.name}</h1>
              {collection.description && <p className="mt-3 max-w-2xl text-sm leading-6 text-white/78 sm:text-[15px]">{collection.description}</p>}
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-white/75">
                <span className="rounded-full border border-white/15 bg-black/20 px-3 py-1.5 backdrop-blur-md">{items.length} {items.length === 1 ? "title" : "titles"}</span>
                <span className="rounded-full border border-white/15 bg-black/20 px-3 py-1.5 capitalize backdrop-blur-md">{collection.visibility}</span>
                {collection.tags.slice(0, 4).map((tag) => <span key={tag} className="rounded-full border border-white/15 bg-black/20 px-3 py-1.5 backdrop-blur-md">{tag}</span>)}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {signedIn && !isOwner && <Button variant="glass" onClick={() => void copyCollection()}><CopyPlus className="size-4" /> Save copy</Button>}
              <div className="rounded-full border border-white/20 bg-black/20 backdrop-blur-md">
                <ShareDialog entity={{
                  kind: "collection",
                  collectionId: collection.id,
                  title: collection.name,
                  description: collection.description,
                  posterUrl: collection.cover_url,
                  visibility: collection.visibility,
                  shareSlug: collection.share_slug,
                }} allowDirect={isOwner} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {isOwner && (
        <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] p-3 shadow-sm">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Who can see this</span>
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
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] p-3 shadow-sm">
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
