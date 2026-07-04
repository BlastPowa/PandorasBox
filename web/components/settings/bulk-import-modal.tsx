"use client";

import { useState } from "react";
import Image from "next/image";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Check } from "lucide-react";
import type { UnifiedSearchResult } from "@core/utils/search";
import type { ReelItemStatus } from "@core/storage/schema";
import { getStatusLabel } from "@core/utils/formatters";
import { Button } from "@/components/ui-fx/button";
import { TypeBadge } from "@/components/ui-fx/badge";

const STATUSES: ReelItemStatus[] = ["watching", "reading", "completed", "on_hold", "planned", "dropped"];

function defaultStatusFor(item: UnifiedSearchResult): ReelItemStatus {
  return item.type === "manga" || item.type === "manhwa" ? "reading" : "watching";
}

export function BulkImportModal({
  items,
  open,
  onCancel,
  onConfirm,
}: {
  items: UnifiedSearchResult[];
  open: boolean;
  onCancel: () => void;
  onConfirm: (statuses: Map<string, ReelItemStatus>) => void;
}) {
  const [statuses, setStatuses] = useState<Map<string, ReelItemStatus>>(
    () => new Map(items.map((i) => [i.id, defaultStatusFor(i)]))
  );

  function setOne(id: string, status: ReelItemStatus) {
    setStatuses((prev) => new Map(prev).set(id, status));
  }

  function setAll(status: ReelItemStatus) {
    setStatuses(new Map(items.map((i) => [i.id, status])));
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[92vw] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] shadow-2xl">
          <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
            <div>
              <Dialog.Title className="font-display text-lg font-bold">
                Found {items.length} title{items.length === 1 ? "" : "s"}
              </Dialog.Title>
              <Dialog.Description className="text-xs text-[var(--text-muted)]">
                Set a status for each — or set them all at once below.
              </Dialog.Description>
            </div>
            <Dialog.Close className="grid size-8 shrink-0 place-items-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--glass)]">
              <X className="size-4" />
            </Dialog.Close>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] px-4 py-3">
            <span className="text-xs font-semibold text-[var(--text-muted)]">Set all to:</span>
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setAll(s)}
                className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--text)]"
              >
                {getStatusLabel(s)}
              </button>
            ))}
          </div>

          <div className="max-h-[45vh] space-y-2 overflow-y-auto p-4">
            {items.map((item) => (
              <div key={item.id} className="glass flex items-center gap-3 rounded-[var(--radius-md)] p-2">
                <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-[6px] bg-[var(--bg-surface)]">
                  {item.posterUrl && <Image src={item.posterUrl} alt="" fill sizes="40px" className="object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{item.title}</p>
                  <div className="mt-0.5"><TypeBadge type={item.type} /></div>
                </div>
                <select
                  value={statuses.get(item.id) ?? defaultStatusFor(item)}
                  onChange={(e) => setOne(item.id, e.target.value as ReelItemStatus)}
                  className="h-9 shrink-0 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-2 text-xs"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{getStatusLabel(s)}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] p-4">
            <Button variant="glass" onClick={onCancel}>Cancel</Button>
            <Button onClick={() => onConfirm(statuses)}>
              <Check className="size-4" /> Add {items.length} title{items.length === 1 ? "" : "s"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
