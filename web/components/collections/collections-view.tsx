"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { Bookmark, Compass, EyeOff, FolderPlus, Globe, Heart, Library, Lock, Trash2, Users } from "lucide-react";
import {
  listCollections,
  listPublicCollections,
  listSavedCollections,
  getCollectionReactionSummaries,
  getCollectionItems,
  createCollection,
  deleteCollection,
  toggleCollectionReaction,
  type Collection,
  type CollectionReactionKind,
  type CollectionReactionSummary,
  type PublicCollection,
  type CollectionItem,
  type CollectionVisibility,
} from "@/lib/collections/collections";
import { useLibrary } from "@/lib/library/use-library";
import { GlassCard } from "@/components/ui-fx/glass-card";
import { Button } from "@/components/ui-fx/button";
import { Input } from "@/components/ui-fx/input";
import { EmptyState } from "@/components/ui-fx/feedback";

function VisibilityIcon({ visibility }: { visibility: CollectionVisibility }) {
  if (visibility === "public") return <Globe className="size-4 text-[var(--reading)]" />;
  if (visibility === "unlisted") return <EyeOff className="size-4 text-[var(--text-muted)]" />;
  if (visibility === "friends") return <Users className="size-4 text-[var(--watching)]" />;
  return <Lock className="size-4 text-[var(--text-muted)]" />;
}

async function fetchCollectionShelfData() {
  const collections = await listCollections();
  const previewPairs = await Promise.all(collections.map(async (collection) => {
    try {
      const items = await getCollectionItems(collection.id);
      return [collection.id, {
        preview: items.filter((item) => item.poster_url).slice(0, 4),
        count: items.length,
      }] as const;
    } catch {
      return [collection.id, { preview: [], count: 0 }] as const;
    }
  }));
  const shelves = Object.fromEntries(previewPairs) as Record<string, { preview: CollectionItem[]; count: number }>;
  return {
    collections,
    previews: Object.fromEntries(Object.entries(shelves).map(([id, shelf]) => [id, shelf.preview])) as Record<string, CollectionItem[]>,
    counts: Object.fromEntries(Object.entries(shelves).map(([id, shelf]) => [id, shelf.count])) as Record<string, number>,
  };
}

async function fetchPublicCollectionShelfData() {
  const collections = await listPublicCollections();
  const previewPairs = await Promise.all(collections.map(async (collection) => {
    try {
      const items = await getCollectionItems(collection.id);
      return [collection.id, {
        preview: items.filter((item) => item.poster_url).slice(0, 4),
        count: items.length,
      }] as const;
    } catch {
      return [collection.id, { preview: [], count: 0 }] as const;
    }
  }));
  const shelves = Object.fromEntries(previewPairs) as Record<string, { preview: CollectionItem[]; count: number }>;
  const reactions = await getCollectionReactionSummaries(collections.map((collection) => collection.id));
  return {
    collections,
    previews: Object.fromEntries(Object.entries(shelves).map(([id, shelf]) => [id, shelf.preview])) as Record<string, CollectionItem[]>,
    counts: Object.fromEntries(Object.entries(shelves).map(([id, shelf]) => [id, shelf.count])) as Record<string, number>,
    reactions,
  };
}

async function fetchSavedCollectionShelfData() {
  const collections = await listSavedCollections();
  const previewPairs = await Promise.all(collections.map(async (collection) => {
    try {
      const items = await getCollectionItems(collection.id);
      return [collection.id, {
        preview: items.filter((item) => item.poster_url).slice(0, 4),
        count: items.length,
      }] as const;
    } catch {
      return [collection.id, { preview: [], count: 0 }] as const;
    }
  }));
  const shelves = Object.fromEntries(previewPairs) as Record<string, { preview: CollectionItem[]; count: number }>;
  const reactions = await getCollectionReactionSummaries(collections.map((collection) => collection.id));
  return {
    collections,
    previews: Object.fromEntries(Object.entries(shelves).map(([id, shelf]) => [id, shelf.preview])) as Record<string, CollectionItem[]>,
    counts: Object.fromEntries(Object.entries(shelves).map(([id, shelf]) => [id, shelf.count])) as Record<string, number>,
    reactions,
  };
}

export function CollectionsView() {
  const { signedIn } = useLibrary();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [previews, setPreviews] = useState<Record<string, CollectionItem[]>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [publicCollections, setPublicCollections] = useState<PublicCollection[]>([]);
  const [publicPreviews, setPublicPreviews] = useState<Record<string, CollectionItem[]>>({});
  const [publicCounts, setPublicCounts] = useState<Record<string, number>>({});
  const [publicLoading, setPublicLoading] = useState(true);
  const [savedCollections, setSavedCollections] = useState<PublicCollection[]>([]);
  const [savedPreviews, setSavedPreviews] = useState<Record<string, CollectionItem[]>>({});
  const [savedCounts, setSavedCounts] = useState<Record<string, number>>({});
  const [savedLoading, setSavedLoading] = useState(true);
  const [reactions, setReactions] = useState<Record<string, CollectionReactionSummary>>({});
  const [reactionBusy, setReactionBusy] = useState<string | null>(null);
  const [view, setView] = useState<"mine" | "public" | "saved">("mine");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [visibility, setVisibility] = useState<CollectionVisibility>("public");

  async function load() {
    try {
      const data = await fetchCollectionShelfData();
      setCollections(data.collections);
      setPreviews(data.previews);
      setCounts(data.counts);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load collections");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    const minePromise = signedIn ? fetchCollectionShelfData() : Promise.resolve({ collections: [], previews: {}, counts: {} });
    void minePromise
      .then((data) => {
        if (!cancelled) {
          setCollections(data.collections);
          setPreviews(data.previews);
          setCounts(data.counts);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) toast.error(error instanceof Error ? error.message : "Failed to load collections");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [signedIn]);

  useEffect(() => {
    let cancelled = false;
    void fetchPublicCollectionShelfData()
      .then((data) => {
        if (!cancelled) {
          setPublicCollections(data.collections);
          setPublicPreviews(data.previews);
          setPublicCounts(data.counts);
          setReactions((current) => ({ ...current, ...data.reactions }));
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) toast.error(error instanceof Error ? error.message : "Failed to load public collections");
      })
      .finally(() => {
        if (!cancelled) setPublicLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!signedIn) {
      return () => { cancelled = true; };
    }
    void fetchSavedCollectionShelfData()
      .then((data) => {
        if (!cancelled) {
          setSavedCollections(data.collections);
          setSavedPreviews(data.previews);
          setSavedCounts(data.counts);
          setReactions((current) => ({ ...current, ...data.reactions }));
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) toast.error(error instanceof Error ? error.message : "Failed to load saved collections");
      })
      .finally(() => {
        if (!cancelled) setSavedLoading(false);
      });
    return () => { cancelled = true; };
  }, [signedIn]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await createCollection(name.trim(), desc.trim(), visibility);
      setName("");
      setDesc("");
      setVisibility("public");
      toast.success("Collection created");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create");
    } finally {
      setCreating(false);
    }
  }

  async function onReaction(collection: PublicCollection, reaction: CollectionReactionKind) {
    if (!signedIn) {
      toast.info("Sign in to like or save community collections");
      return;
    }
    const current = reactions[collection.id] ?? { likes: 0, saves: 0, liked: false, saved: false };
    const active = reaction === "like" ? current.liked : current.saved;
    const busyKey = `${collection.id}:${reaction}`;
    setReactionBusy(busyKey);
    try {
      const next = await toggleCollectionReaction(collection.id, reaction, active);
      setReactions((all) => {
        const existing = all[collection.id] ?? { likes: 0, saves: 0, liked: false, saved: false };
        return {
          ...all,
          [collection.id]: {
            ...existing,
            liked: reaction === "like" ? next : existing.liked,
            saved: reaction === "save" ? next : existing.saved,
            likes: reaction === "like" ? Math.max(0, existing.likes + (next ? 1 : -1)) : existing.likes,
            saves: reaction === "save" ? Math.max(0, existing.saves + (next ? 1 : -1)) : existing.saves,
          },
        };
      });
      if (reaction === "save") {
        if (next) {
          setSavedCollections((all) => [collection, ...all.filter((item) => item.id !== collection.id)]);
          setSavedPreviews((all) => ({ ...all, [collection.id]: publicPreviews[collection.id] ?? [] }));
          setSavedCounts((all) => ({ ...all, [collection.id]: publicCounts[collection.id] ?? 0 }));
          toast.success("Saved to your collections shelf");
        } else {
          setSavedCollections((all) => all.filter((item) => item.id !== collection.id));
          toast.success("Removed from saved collections");
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update collection");
    } finally {
      setReactionBusy(null);
    }
  }

  const communityCollections = view === "saved" ? savedCollections : publicCollections;
  const communityPreviews = view === "saved" ? savedPreviews : publicPreviews;
  const communityCounts = view === "saved" ? savedCounts : publicCounts;
  const communityLoading = view === "saved" ? savedLoading : publicLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-[var(--border)] bg-[var(--glass)] p-1">
          <button type="button" onClick={() => setView("mine")} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition ${view === "mine" ? "bg-[var(--accent)] text-white" : "text-[var(--text-secondary)] hover:text-[var(--text)]"}`}>
            <Library className="size-3.5" /> My Collections
          </button>
          <button type="button" onClick={() => setView("public")} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition ${view === "public" ? "bg-[var(--accent)] text-white" : "text-[var(--text-secondary)] hover:text-[var(--text)]"}`}>
            <Compass className="size-3.5" /> Public Browse
          </button>
          <button type="button" onClick={() => setView("saved")} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition ${view === "saved" ? "bg-[var(--accent)] text-white" : "text-[var(--text-secondary)] hover:text-[var(--text)]"}`}>
            <Bookmark className="size-3.5" /> Saved
          </button>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          {view === "mine" ? `${collections.length} personal shelves` : view === "saved" ? `${savedCollections.length} saved shelves` : `${publicCollections.length} community shelves`}
        </p>
      </div>

      {view === "mine" && signedIn && <GlassCard macDots title="New collection" className="pb-aura">
        <form onSubmit={onCreate} className="space-y-3 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Name (e.g. Weekend Binge)" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              Visibility
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as CollectionVisibility)}
                className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-sm outline-none"
              >
                <option value="public">Public</option>
                <option value="unlisted">Unlisted (link only)</option>
                <option value="friends">Friends only</option>
                <option value="private">Private</option>
              </select>
            </label>
            <Button type="submit" loading={creating}><FolderPlus className="size-4" /> Create</Button>
          </div>
        </form>
      </GlassCard>}

      {view === "mine" && !signedIn ? (
        <EmptyState
          icon={<Library className="size-10" />}
          title="Organize with collections"
          description="Sign in to build personal shelves, or switch to Public Browse to explore collections from the community."
          action={<Button asChild><Link href="/login?next=/collections">Sign in</Link></Button>}
        />
      ) : view === "mine" && loading ? (
        <div className="skeleton h-40 w-full rounded-[var(--radius-lg)]" />
      ) : view === "mine" && collections.length === 0 ? (
        <EmptyState icon={<FolderPlus className="size-10" />} title="No collections yet" description="Create your first collection above." />
      ) : view === "mine" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {collections.map((c) => (
            <article key={c.id} className="pb-collection-card group relative overflow-hidden rounded-[26px]">
              <Link href={`/collections/${c.id}`} className="relative block aspect-[16/11] overflow-hidden sm:aspect-[16/10]">
                {c.cover_url ? (
                  <Image src={c.cover_url} alt="" fill sizes="(max-width: 640px) 100vw, 50vw" className="object-cover transition duration-700 group-hover:scale-105" />
                ) : previews[c.id]?.length ? (
                  <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                    {previews[c.id].map((item, index) => (
                      <div key={`${item.item_id}-${index}`} className="relative overflow-hidden bg-[var(--bg-elevated)]">
                        {item.poster_url && <Image src={item.poster_url} alt="" fill sizes="20vw" className="object-cover transition duration-700 group-hover:scale-[1.04]" />}
                      </div>
                    ))}
                    {Array.from({ length: Math.max(0, 4 - (previews[c.id]?.length ?? 0)) }).map((_, index) => <div key={`empty-${index}`} className="bg-[linear-gradient(145deg,rgb(var(--accent-rgb)/0.22),rgb(var(--accent-2-rgb)/0.08))]" />)}
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgb(var(--accent-rgb)/0.42),transparent_34%),radial-gradient(circle_at_82%_26%,rgb(var(--accent-2-rgb)/0.34),transparent_40%),linear-gradient(145deg,var(--bg-elevated),var(--bg-surface))]" />
                )}
                <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(7,7,12,.92)_0%,rgba(7,7,12,.44)_44%,rgba(7,7,12,.06)_100%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_86%_12%,rgba(255,255,255,.15),transparent_24%)] opacity-0 transition duration-500 group-hover:opacity-100" />
                <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white/85 backdrop-blur-md">
                  <VisibilityIcon visibility={c.visibility} />
                  {c.visibility}
                </div>
                <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                  <h3 className="pb-collection-title font-display text-[clamp(1.65rem,5vw,2.4rem)] font-black leading-[.92] tracking-[-0.04em]">{c.name}</h3>
                  {c.description && <p className="mt-2 line-clamp-2 max-w-[92%] text-xs leading-5 text-white/78 sm:text-[13px]">{c.description}</p>}
                  <div className="mt-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-white/62">
                    <span>{counts[c.id] ?? 0} {(counts[c.id] ?? 0) === 1 ? "title" : "titles"}</span>
                    <span aria-hidden="true">•</span>
                    <span className="transition group-hover:text-white/90">Open shelf</span>
                  </div>
                </div>
              </Link>
              <button
                onClick={() => {
                  if (confirm(`Delete collection "${c.name}"?`)) {
                    void deleteCollection(c.id).then(load).catch(() => toast.error("Delete failed"));
                  }
                }}
                className="absolute right-3 top-3 rounded-full border border-white/20 bg-black/35 p-2 text-white/75 opacity-100 backdrop-blur-md transition hover:bg-black/60 hover:text-white focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                aria-label="Delete collection"
              >
                <Trash2 className="size-4" />
              </button>
            </article>
          ))}
        </div>
      ) : view === "saved" && !signedIn ? (
        <EmptyState
          icon={<Bookmark className="size-10" />}
          title="Keep community shelves close"
          description="Sign in to save public collections and come back to them from one place."
          action={<Button asChild><Link href="/login?next=/collections">Sign in</Link></Button>}
        />
      ) : communityLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="skeleton aspect-[16/11] rounded-[26px]" />)}</div>
      ) : communityCollections.length === 0 ? (
        <EmptyState
          icon={view === "saved" ? <Bookmark className="size-10" /> : <Compass className="size-10" />}
          title={view === "saved" ? "No saved collections yet" : "No public collections yet"}
          description={view === "saved" ? "Save a community shelf from Public Browse and it will stay here for quick access." : "Public community shelves will appear here as people share them."}
          action={view === "saved" ? <Button onClick={() => setView("public")}><Compass className="size-4" /> Browse public shelves</Button> : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {communityCollections.map((c) => {
            const reaction = reactions[c.id] ?? { likes: 0, saves: 0, liked: false, saved: view === "saved" };
            return (
            <article key={c.id} className="pb-collection-card group relative overflow-hidden rounded-[26px]">
              <Link href={`/collections/${c.id}`} className="relative block aspect-[16/11] overflow-hidden sm:aspect-[16/10]">
                {c.cover_url ? (
                  <Image src={c.cover_url} alt="" fill sizes="(max-width: 640px) 100vw, 50vw" className="object-cover transition duration-700 group-hover:scale-105" />
                ) : communityPreviews[c.id]?.length ? (
                  <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                    {communityPreviews[c.id].map((item, index) => (
                      <div key={`${item.item_id}-${index}`} className="relative overflow-hidden bg-[var(--bg-elevated)]">
                        {item.poster_url && <Image src={item.poster_url} alt="" fill sizes="20vw" className="object-cover transition duration-700 group-hover:scale-[1.04]" />}
                      </div>
                    ))}
                    {Array.from({ length: Math.max(0, 4 - (communityPreviews[c.id]?.length ?? 0)) }).map((_, index) => <div key={`empty-${index}`} className="bg-[linear-gradient(145deg,rgb(var(--accent-rgb)/0.22),rgb(var(--accent-2-rgb)/0.08))]" />)}
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgb(var(--accent-rgb)/0.42),transparent_34%),radial-gradient(circle_at_82%_26%,rgb(var(--accent-2-rgb)/0.34),transparent_40%),linear-gradient(145deg,var(--bg-elevated),var(--bg-surface))]" />
                )}
                <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(7,7,12,.94)_0%,rgba(7,7,12,.46)_46%,rgba(7,7,12,.06)_100%)]" />
                <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full border border-white/20 bg-black/35 px-2.5 py-1 text-[10px] font-bold text-white/88 backdrop-blur-md">
                  {c.owner_avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.owner_avatar_url} alt="" className="size-4 rounded-full object-cover" />
                  ) : <span className="grid size-4 place-items-center rounded-full bg-white/15">{c.owner_username.charAt(0).toUpperCase()}</span>}
                  <span className="max-w-28 truncate">{c.owner_username}</span>
                </div>
                <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                  <h3 className="pb-collection-title font-display text-[clamp(1.65rem,5vw,2.4rem)] font-black leading-[.92] tracking-[-0.04em]">{c.name}</h3>
                  {c.description && <p className="mt-2 line-clamp-2 max-w-[92%] text-xs leading-5 text-white/78 sm:text-[13px]">{c.description}</p>}
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-white/62">
                    <span>{communityCounts[c.id] ?? 0} {(communityCounts[c.id] ?? 0) === 1 ? "title" : "titles"}</span>
                    {c.tags.slice(0, 2).map((tag) => <span key={tag} className="rounded-full bg-white/10 px-2 py-0.5 normal-case tracking-normal text-white/75">#{tag}</span>)}
                  </div>
                </div>
              </Link>
              <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => void onReaction(c, "like")}
                  disabled={reactionBusy === `${c.id}:like`}
                  aria-pressed={reaction.liked}
                  aria-label={reaction.liked ? "Unlike collection" : "Like collection"}
                  className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/20 px-2.5 text-xs font-bold text-white backdrop-blur-md transition disabled:opacity-60 ${reaction.liked ? "bg-[var(--accent)]" : "bg-black/35 hover:bg-black/60"}`}
                >
                  <Heart className={`size-3.5 ${reaction.liked ? "fill-current" : ""}`} />
                  {reaction.likes}
                </button>
                <button
                  type="button"
                  onClick={() => void onReaction(c, "save")}
                  disabled={reactionBusy === `${c.id}:save`}
                  aria-pressed={reaction.saved}
                  aria-label={reaction.saved ? "Remove saved collection" : "Save collection"}
                  className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/20 px-2.5 text-xs font-bold text-white backdrop-blur-md transition disabled:opacity-60 ${reaction.saved ? "bg-[var(--accent)]" : "bg-black/35 hover:bg-black/60"}`}
                >
                  <Bookmark className={`size-3.5 ${reaction.saved ? "fill-current" : ""}`} />
                  {reaction.saves}
                </button>
              </div>
            </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
