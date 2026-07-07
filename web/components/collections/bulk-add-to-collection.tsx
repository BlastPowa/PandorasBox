"use client";

import { useState } from "react";
import { toast } from "sonner";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { FolderPlus, Plus } from "lucide-react";
import {
  listCollections,
  createCollection,
  addItemToCollection,
  type Collection,
} from "@/lib/collections/collections";
import type { AddToCollectionItem } from "@/components/collections/add-to-collection";

/** Adds many library items to a chosen collection at once. */
export function BulkAddToCollection({
  items,
  onDone,
}: {
  items: AddToCollectionItem[];
  onDone?: () => void;
}) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [newName, setNewName] = useState("");

  async function ensureLoaded() {
    if (loaded) return;
    try {
      setCollections(await listCollections());
    } finally {
      setLoaded(true);
    }
  }

  async function addAll(collectionId: string, name: string) {
    let ok = 0;
    for (const it of items) {
      try {
        await addItemToCollection(collectionId, it);
        ok += 1;
      } catch {
        // continue; report the count below
      }
    }
    toast.success(`Added ${ok} title${ok === 1 ? "" : "s"} to "${name}"`);
    onDone?.();
  }

  async function createAndAdd() {
    if (!newName.trim()) return;
    try {
      const c = await createCollection(newName.trim(), "", "public");
      setNewName("");
      setCollections((prev) => [c, ...prev]);
      await addAll(c.id, c.name);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create");
    }
  }

  return (
    <DropdownMenu.Root onOpenChange={(o) => o && void ensureLoaded()}>
      <DropdownMenu.Trigger asChild>
        <button className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[linear-gradient(120deg,var(--accent),var(--accent-2))] px-3 py-2 text-xs font-bold text-[#0a0a0f]">
          <FolderPlus className="size-4" /> Add {items.length} to collection
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 w-64 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-elevated)] p-1 shadow-2xl"
        >
          <div className="max-h-56 overflow-y-auto">
            {collections.length === 0 && (
              <p className="px-3 py-2 text-xs text-[var(--text-muted)]">No collections yet — create one below.</p>
            )}
            {collections.map((c) => (
              <DropdownMenu.Item
                key={c.id}
                onSelect={(e) => {
                  e.preventDefault();
                  void addAll(c.id, c.name);
                }}
                className="cursor-pointer rounded-[8px] px-3 py-2 text-sm text-[var(--text-secondary)] outline-none focus:bg-[var(--glass)] focus:text-[var(--text)]"
              >
                {c.name}
              </DropdownMenu.Item>
            ))}
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-[var(--border)]" />
          <div className="flex items-center gap-1 p-1">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void createAndAdd();
                }
              }}
              placeholder="New collection…"
              className="h-8 flex-1 rounded-[8px] border border-[var(--border)] bg-[var(--bg-surface)] px-2 text-xs outline-none"
            />
            <button
              onClick={() => void createAndAdd()}
              className="grid size-8 shrink-0 place-items-center rounded-[8px] bg-[linear-gradient(120deg,var(--accent),var(--accent-2))] text-[#0a0a0f]"
              aria-label="Create and add"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
