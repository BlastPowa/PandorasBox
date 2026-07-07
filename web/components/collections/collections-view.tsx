"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { FolderPlus, Trash2, Library, Lock, Globe, Users, EyeOff } from "lucide-react";
import {
  listCollections,
  createCollection,
  deleteCollection,
  type Collection,
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

export function CollectionsView() {
  const { signedIn } = useLibrary();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [visibility, setVisibility] = useState<CollectionVisibility>("public");

  async function load() {
    try {
      setCollections(await listCollections());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load collections");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (signedIn) void load();
    else setLoading(false);
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
      <GlassCard macDots title="New collection">
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((c) => (
            <div key={c.id} className="glass glow-ring group relative rounded-[var(--radius-lg)] p-4">
              <Link href={`/collections/${c.id}`} className="block">
                <div className="flex items-center gap-2">
                  <VisibilityIcon visibility={c.visibility} />
                  <h3 className="font-display text-lg font-bold">{c.name}</h3>
                </div>
                {c.description && <p className="mt-1 line-clamp-2 text-sm text-[var(--text-secondary)]">{c.description}</p>}
                <p className="mt-1 text-xs capitalize text-[var(--text-muted)]">{c.visibility}</p>
              </Link>
              <button
                onClick={() => {
                  if (confirm(`Delete collection "${c.name}"?`)) {
                    void deleteCollection(c.id).then(load).catch(() => toast.error("Delete failed"));
                  }
                }}
                className="absolute right-3 top-3 rounded-md p-1.5 text-[var(--dropped)] opacity-0 transition-opacity hover:bg-[var(--glass)] group-hover:opacity-100"
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
