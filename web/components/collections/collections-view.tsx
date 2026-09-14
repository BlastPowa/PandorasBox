"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { FolderPlus, Trash2, Library, Lock, Globe, Users, EyeOff } from "lucide-react";
import {
  listCollections,
  getCollectionItems,
  createCollection,
  deleteCollection,
  type Collection,
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
      return [collection.id, items.filter((item) => item.poster_url).slice(0, 4)] as const;
    } catch {
      return [collection.id, []] as const;
    }
  }));
  return { collections, previews: Object.fromEntries(previewPairs) as Record<string, CollectionItem[]> };
}

export function CollectionsView() {
  const { signedIn } = useLibrary();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [previews, setPreviews] = useState<Record<string, CollectionItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [visibility, setVisibility] = useState<CollectionVisibility>("public");

  async function load() {
    try {
      const data = await fetchCollectionShelfData();
      setCollections(data.collections);
      setPreviews(data.previews);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load collections");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    void fetchCollectionShelfData()
      .then((data) => {
        if (!cancelled) {
          setCollections(data.collections);
          setPreviews(data.previews);
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

  if (!signedIn) {
    return (
      <EmptyState
        icon={<Library className="size-10" />}
        title="Organize with collections"
        description="Sign in to build custom folders like 'Weekend binge', 'Comfort rewatches' or 'Finish someday' — beyond the status categories."
        action={<Button asChild><Link href="/login?next=/collections">Sign in</Link></Button>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <GlassCard macDots title="New collection" className="pb-aura">
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
      </GlassCard>

      {loading ? (
        <div className="skeleton h-40 w-full rounded-[var(--radius-lg)]" />
      ) : collections.length === 0 ? (
        <EmptyState icon={<FolderPlus className="size-10" />} title="No collections yet" description="Create your first collection above." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((c) => (
            <div key={c.id} className="group relative overflow-hidden rounded-[24px] border border-[var(--media-border)] bg-[var(--bg-surface)] shadow-[0_16px_40px_rgb(15_23_42/.10)]">
              <Link href={`/collections/${c.id}`} className="relative block aspect-[16/10] overflow-hidden">
                {c.cover_url ? (
                  <Image src={c.cover_url} alt="" fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover transition duration-700 group-hover:scale-105" />
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
                <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(7,7,12,.94)_0%,rgba(7,7,12,.46)_46%,rgba(7,7,12,.08)_100%)]" />
                <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white/85 backdrop-blur-md">
                  <VisibilityIcon visibility={c.visibility} />
                  {c.visibility}
                </div>
                <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                  <h3 className="font-display text-2xl font-black leading-[.95] tracking-[-0.03em] [text-shadow:0_2px_16px_rgba(0,0,0,.75)]">{c.name}</h3>
                  {c.description && <p className="mt-2 line-clamp-2 max-w-[90%] text-xs leading-5 text-white/72">{c.description}</p>}
                  <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/55">{previews[c.id]?.length ? `${previews[c.id].length}${previews[c.id].length === 4 ? "+" : ""} visual preview` : "Open collection"}</p>
                </div>
              </Link>
              <button
                onClick={() => {
                  if (confirm(`Delete collection "${c.name}"?`)) {
                    void deleteCollection(c.id).then(load).catch(() => toast.error("Delete failed"));
                  }
                }}
                className="absolute right-3 top-3 rounded-full border border-white/20 bg-black/35 p-2 text-white/75 opacity-0 backdrop-blur-md transition hover:bg-black/60 hover:text-white group-hover:opacity-100 focus-visible:opacity-100"
                aria-label="Delete collection"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
