"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { FolderPlus, Trash2, Library, Lock, Globe } from "lucide-react";
import {
  listCollections,
  createCollection,
  deleteCollection,
  type Collection,
} from "@/lib/collections/collections";
import { useLibrary } from "@/lib/library/use-library";
import { GlassCard } from "@/components/ui-fx/glass-card";
import { Button } from "@/components/ui-fx/button";
import { Input } from "@/components/ui-fx/input";
import { EmptyState } from "@/components/ui-fx/feedback";

export function CollectionsView() {
  const { signedIn } = useLibrary();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [isPublic, setIsPublic] = useState(false);

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
      await createCollection(name.trim(), desc.trim(), isPublic);
      setName("");
      setDesc("");
      setIsPublic(false);
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
          <div className="flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-secondary)]">
              <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
              {isPublic ? <Globe className="size-4" /> : <Lock className="size-4" />}
              {isPublic ? "Public" : "Private"}
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
                  {c.is_public ? <Globe className="size-4 text-[var(--reading)]" /> : <Lock className="size-4 text-[var(--text-muted)]" />}
                  <h3 className="font-display text-lg font-bold">{c.name}</h3>
                </div>
                {c.description && <p className="mt-1 line-clamp-2 text-sm text-[var(--text-secondary)]">{c.description}</p>}
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
