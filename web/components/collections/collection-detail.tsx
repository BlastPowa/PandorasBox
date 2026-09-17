"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, CopyPlus, EyeOff, FolderOpen, Globe, Lock, Pencil, Tags, Users, X } from "lucide-react";
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
  const router = useRouter();
  const { items: libraryItems, signedIn } = useLibrary();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("added");
  const [editingDetails, setEditingDetails] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTags, setEditTags] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);

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

  function beginEditDetails() {
    if (!collection) return;
    setEditName(collection.name);
    setEditDescription(collection.description ?? "");
    setEditTags(collection.tags.join(", "));
    setEditingDetails(true);
  }

  async function saveDetails() {
    if (!collection) return;
    const name = editName.trim();
    if (!name) {
      toast.error("Collection name cannot be empty");
      return;
    }
    const tags = Array.from(new Set(
      editTags
        .split(",")
        .map((tag) => tag.trim().replace(/^#/, ""))
        .filter(Boolean)
    )).slice(0, 8);
    setSavingDetails(true);
    try {
      await updateCollection(collection.id, {
        name,
        description: editDescription.trim() || null,
        tags,
      });
      setCollection({
        ...collection,
        name,
        description: editDescription.trim() || null,
        tags,
      });
      setEditingDetails(false);
      toast.success("Collection details updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update collection");
    } finally {
      setSavingDetails(false);
    }
  }

  async function copyCollection() {
    try {
      const response = await fetch(`/api/collections/${id}/copy`, { method: "POST" });
      const body = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !body.id) throw new Error(body.error ?? "Could not copy collection");
      toast.success("Saved as a private collection", { action: { label: "Open", onClick: () => router.push(`/collections/${body.id}`) } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not copy collection");
    }
  }

  async function setCollectionCover(item: UnifiedSearchResult) {
    if (!collection || !item.posterUrl) return;
    try {
      await updateCollection(collection.id, {
        cover_mode: "item",
        cover_url: item.posterUrl,
        cover_item_id: item.id,
      });
      setCollection({ ...collection, cover_mode: "item", cover_url: item.posterUrl, cover_item_id: item.id });
      toast.success(`${item.title} is now the collection thumbnail`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update collection thumbnail");
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
      <section className="pb-collection-hero relative min-h-[300px] overflow-hidden rounded-[28px] sm:min-h-[360px]">
        {heroImage ? (
          <>
            <Image src={heroImage} alt="" fill priority sizes="(max-width: 1400px) 100vw, 1400px" className="scale-105 object-cover object-center opacity-70 transition duration-700 hover:scale-100" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,8,12,.78)_0%,rgba(8,8,12,.44)_50%,rgba(8,8,12,.16)_100%)]" />
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
              {editingDetails ? (
                <div className="space-y-3 rounded-[22px] border border-white/15 bg-black/25 p-3 backdrop-blur-xl sm:p-4">
                  <input
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    maxLength={80}
                    aria-label="Collection name"
                    className="w-full rounded-xl border border-white/15 bg-black/25 px-3 py-2 font-display text-2xl font-black text-white outline-none placeholder:text-white/35 focus:border-white/35 sm:text-3xl"
                  />
                  <textarea
                    value={editDescription}
                    onChange={(event) => setEditDescription(event.target.value)}
                    maxLength={500}
                    rows={3}
                    aria-label="Collection description"
                    placeholder="Describe this collection"
                    className="w-full resize-none rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/35"
                  />
                  <label className="block">
                    <span className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.13em] text-white/60"><Tags className="size-3" /> Tags</span>
                    <input
                      value={editTags}
                      onChange={(event) => setEditTags(event.target.value)}
                      maxLength={180}
                      placeholder="anime, comfort, favorites"
                      className="w-full rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/35"
                    />
                  </label>
                  <div className="flex flex-wrap justify-end gap-2">
                    <button type="button" onClick={() => setEditingDetails(false)} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/75 transition hover:bg-white/10 hover:text-white"><X className="size-3.5" /> Cancel</button>
                    <button type="button" disabled={savingDetails} onClick={() => void saveDetails()} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-black text-black transition hover:bg-white/90 disabled:opacity-55"><Check className="size-3.5" /> {savingDetails ? "Saving…" : "Save details"}</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-2">
                    <h1 className="pb-collection-title font-display text-4xl font-black leading-[.94] tracking-[-0.04em] sm:text-6xl">{collection.name}</h1>
                    {isOwner && (
                      <button type="button" onClick={beginEditDetails} aria-label="Edit collection details" className="mt-1 rounded-full border border-white/15 bg-black/20 p-2 text-white/65 backdrop-blur-md transition hover:bg-black/40 hover:text-white">
                        <Pencil className="size-3.5" />
                      </button>
                    )}
                  </div>
                  {collection.description && <p className="mt-3 max-w-2xl text-sm leading-6 text-white/78 sm:text-[15px]">{collection.description}</p>}
                </>
              )}
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
        <div className="pb-uiverse-card pb-uiverse-card--compact flex flex-wrap items-center gap-2 rounded-[22px] p-3">
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
          <div className="pb-uiverse-card pb-uiverse-card--compact flex flex-wrap items-center justify-between gap-3 rounded-[22px] p-3">
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
            <details className="pb-uiverse-card pb-uiverse-card--compact rounded-[22px] p-3 text-sm">
              <summary className="cursor-pointer font-semibold text-[var(--text-secondary)]">Manage items</summary>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {resolved.map((r) => (
                  <div key={r.id} className="pb-uiverse-row flex items-center justify-between gap-3 rounded-2xl p-2.5">
                    <span className="min-w-0 truncate font-medium">{r.title}</span>
                    <div className="flex shrink-0 items-center gap-2">
                      {r.posterUrl && (
                        <button
                          onClick={() => void setCollectionCover(r)}
                          className="rounded-full px-2 py-1 text-[11px] font-semibold text-[var(--accent)] transition hover:bg-[rgb(var(--accent-rgb)/0.09)]"
                        >
                          {collection.cover_item_id === r.id ? "Cover set" : "Use as cover"}
                        </button>
                      )}
                      <button
                        onClick={() => void removeItemFromCollection(id, r.id).then(load)}
                        className="rounded-full px-2 py-1 text-[11px] font-semibold text-[var(--dropped)] transition hover:bg-[rgba(239,68,68,0.09)]"
                      >
                        Remove
                      </button>
                    </div>
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
