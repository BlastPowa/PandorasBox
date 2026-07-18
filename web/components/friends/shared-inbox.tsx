"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CopyPlus, ExternalLink, Inbox, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui-fx/button";
import { listSocialShares, updateSocialShare } from "@/lib/social/client";
import type { ShareBox, ShareFilter, SocialShare } from "@/lib/social/types";

const FILTERS: { value: ShareFilter; label: string }[] = [
  { value: "all", label: "All" }, { value: "unread", label: "Unread" },
  { value: "collections", label: "Collections" }, { value: "titles", label: "Titles" },
];

export function SharedInbox() {
  const [box, setBox] = useState<ShareBox>("received");
  const [filter, setFilter] = useState<ShareFilter>("all");
  const [shares, setShares] = useState<SocialShare[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try { setShares((await listSocialShares(box, filter)).shares); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not load shares"); }
    finally { setLoading(false); }
  }, [box, filter]);
  useEffect(() => { queueMicrotask(() => void load()); }, [load]);
  useEffect(() => {
    const refresh = () => void load();
    window.addEventListener("pbox:shares-change", refresh);
    return () => window.removeEventListener("pbox:shares-change", refresh);
  }, [load]);

  async function act(share: SocialShare, action: "read" | "dismiss" | "revoke") {
    try {
      await updateSocialShare(share.id, action);
      window.dispatchEvent(new CustomEvent("pbox:notifications-change"));
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not update share"); }
  }
  async function copyCollection(share: SocialShare) {
    if (!share.collection_id) return;
    try {
      const response = await fetch(`/api/collections/${share.collection_id}/copy`, { method: "POST" });
      const body = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !body.id) throw new Error(body.error ?? "Could not copy collection");
      toast.success("Saved an independent private copy", { action: { label: "Open", onClick: () => { window.location.href = `/collections/${body.id}`; } } });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not copy collection"); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-[var(--border)] bg-[var(--glass)] p-1">
          {(["received", "sent"] as ShareBox[]).map((value) => <button key={value} onClick={() => setBox(value)} className={`min-h-10 rounded-full px-4 text-sm font-semibold capitalize ${box === value ? "bg-[var(--accent)] text-black" : "text-[var(--text-secondary)]"}`}>{value}</button>)}
        </div>
        <div className="flex max-w-full snap-x gap-2 overflow-x-auto pb-1">
          {FILTERS.map((item) => <button key={item.value} onClick={() => setFilter(item.value)} className={`min-h-10 shrink-0 snap-start rounded-full px-4 text-xs font-semibold ${filter === item.value ? "bg-[rgb(var(--accent-rgb)/0.18)] text-[var(--accent)]" : "glass text-[var(--text-secondary)]"}`}>{item.label}</button>)}
        </div>
      </div>
      {loading ? <div className="skeleton h-40 rounded-[var(--radius-lg)]" /> : shares.length === 0 ? (
        <div className="glass grid min-h-44 place-items-center rounded-[var(--radius-lg)] p-6 text-center"><div><Inbox className="mx-auto mb-2 size-8 text-[var(--accent)]" /><p className="font-display font-bold">No {box} shares</p><p className="mt-1 text-sm text-[var(--text-muted)]">Shared titles and collections will stay organized here.</p></div></div>
      ) : <div className="space-y-3">{shares.map((share) => {
        const person = box === "received" ? share.sender : share.recipient;
        const unavailable = Boolean(share.revoked_at);
        return <article key={share.id} className={`glass flex gap-3 rounded-[var(--radius-lg)] p-3 sm:p-4 ${!share.read_at && box === "received" ? "ring-1 ring-[rgb(var(--accent-rgb)/0.45)]" : ""}`}>
          <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-lg bg-[var(--bg-elevated)] sm:h-24 sm:w-16">
            {share.poster_url ? <Image src={share.poster_url} alt="" fill sizes="(max-width: 639px) 56px, 64px" className="object-cover" /> : <div className="grid size-full place-items-center font-display text-xl text-[var(--text-muted)]">{share.title.charAt(0)}</div>}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs text-[var(--text-muted)]">{box === "received" ? "From" : "To"} {person?.username ?? "PBox member"} · {new Date(share.created_at).toLocaleDateString()}</p><h3 className="line-clamp-2 font-display font-bold">{share.title}</h3><p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">{share.entity_type === "collection" ? "Collection" : share.media_type}</p></div>{unavailable && <span className="rounded-full bg-[rgba(239,68,68,.14)] px-2 py-1 text-[10px] font-bold text-[#fca5a5]">No longer available</span>}</div>
            {share.message && <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--text-secondary)]">{share.message}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {!unavailable && <Button asChild size="sm"><Link href={share.href} onClick={() => box === "received" && !share.read_at && void act(share, "read")}><ExternalLink className="size-3.5" /> Open</Link></Button>}
              {box === "received" && share.entity_type === "collection" && !unavailable && <Button size="sm" variant="outline" onClick={() => void copyCollection(share)}><CopyPlus className="size-3.5" /> Save copy</Button>}
              {box === "received" ? <Button size="sm" variant="ghost" onClick={() => void act(share, "dismiss")}><Trash2 className="size-3.5" /> Dismiss</Button> : !unavailable && <Button size="sm" variant="ghost" onClick={() => void act(share, "revoke")}><Undo2 className="size-3.5" /> Revoke</Button>}
            </div>
          </div>
        </article>;
      })}</div>}
    </div>
  );
}
