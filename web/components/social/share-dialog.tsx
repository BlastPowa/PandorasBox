"use client";

import { useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, Copy, Search, Send, Share2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui-fx/button";
import { useLibrary } from "@/lib/library/use-library";
import { fetchProfilesByIds, listMyFriendships, type ProfileSummary } from "@/lib/friends/friends";
import { createClient } from "@/lib/supabase/client";
import { sendSocialShare } from "@/lib/social/client";
import { shareHref, type ShareEntity } from "@/lib/social/types";
import { cn } from "@/lib/utils";

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const input = document.createElement("textarea");
    input.value = text;
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  }
}

export function ShareDialog({ entity, className, allowDirect = true }: { entity: ShareEntity; className?: string; allowDirect?: boolean }) {
  const { signedIn } = useLibrary();
  const [open, setOpen] = useState(false);
  const [friends, setFriends] = useState<ProfileSummary[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const path = shareHref(entity);

  async function loadFriends() {
    if (loaded || !signedIn || !allowDirect) return;
    try {
      const [{ data }, relationships] = await Promise.all([
        createClient().auth.getUser(),
        listMyFriendships(),
      ]);
      const uid = data.user?.id;
      if (!uid) return;
      const ids = relationships.filter((row) => row.status === "accepted")
        .map((row) => row.requester === uid ? row.addressee : row.requester);
      const profiles = await fetchProfilesByIds(ids);
      setFriends(ids.map((id) => profiles.get(id)).filter((profile): profile is ProfileSummary => Boolean(profile)));
      setLoaded(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load friends");
    }
  }

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? friends.filter((friend) => (friend.username ?? "PBox member").toLowerCase().includes(needle)) : friends;
  }, [friends, query]);

  function toggle(id: string) {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((value) => value !== id);
      if (current.length >= 10) {
        toast.warning("You can share with up to 10 friends at once");
        return current;
      }
      return [...current, id];
    });
  }

  async function send() {
    if (!selected.length) return;
    setLoading(true);
    try {
      const result = await sendSocialShare(entity, selected, message);
      if (result.delivered.length) toast.success(`Shared with ${result.delivered.length} ${result.delivered.length === 1 ? "friend" : "friends"}`);
      if (result.failed.length) {
        toast.error(`${result.failed.length} ${result.failed.length === 1 ? "share" : "shares"} could not be delivered`);
        setSelected(result.failed.map((failure) => failure.recipientId));
      } else {
        setOpen(false);
        setSelected([]);
        setMessage("");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not share");
    } finally {
      setLoading(false);
    }
  }

  async function externalShare() {
    const url = new URL(path, window.location.origin).toString();
    const text = message.trim() || `Take a look at ${entity.title} on PBox.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: entity.title, text, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await copyText(url);
    toast.success("Share link copied");
  }

  return (
    <Dialog.Root open={open} onOpenChange={(next) => {
      setOpen(next);
      if (next) void loadFriends();
    }}>
      <Dialog.Trigger asChild>
        <Button variant="glass" className={cn("min-h-11", className)}>
          <Share2 className="size-4 text-[var(--accent)]" /> Share
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-0 z-[71] flex flex-col overflow-hidden bg-[var(--bg-elevated)] outline-none sm:left-1/2 sm:top-1/2 sm:inset-auto sm:max-h-[88dvh] sm:w-[min(92vw,620px)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[var(--radius-xl)] sm:border sm:border-[var(--border)] sm:shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] p-5">
            <div className="min-w-0">
              <Dialog.Title className="font-display text-xl font-bold">Share {entity.title}</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-[var(--text-muted)]">
                Send privately to friends or share a link outside PBox.
              </Dialog.Description>
            </div>
            <Dialog.Close className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-[var(--glass)]" aria-label="Close share dialog">
              <X className="size-5" />
            </Dialog.Close>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            {entity.kind === "collection" && entity.visibility === "private" && (
              <p className="rounded-xl border border-[rgb(var(--gold-rgb)/0.3)] bg-[rgb(var(--gold-rgb)/0.08)] p-3 text-xs leading-relaxed text-[var(--text-secondary)]">
                This private collection opens only for friends selected below. A copied external link alone does not grant access.
              </p>
            )}

            {signedIn && allowDirect ? (
              <section aria-labelledby="share-friends-label">
                <div className="mb-2 flex items-center justify-between">
                  <h3 id="share-friends-label" className="text-sm font-bold">PBox friends</h3>
                  <span className="text-xs text-[var(--text-muted)]">{selected.length}/10 selected</span>
                </div>
                <label className="flex h-11 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-3 focus-within:border-[var(--accent)]">
                  <Search className="size-4 text-[var(--text-muted)]" />
                  <span className="sr-only">Search friends</span>
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search friends" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
                </label>
                <div className="mt-2 max-h-56 space-y-1 overflow-y-auto">
                  {!loaded && <p className="p-4 text-center text-sm text-[var(--text-muted)]">Loading friends…</p>}
                  {loaded && filtered.length === 0 && <p className="p-4 text-center text-sm text-[var(--text-muted)]">No accepted friends found.</p>}
                  {filtered.map((friend) => {
                    const active = selected.includes(friend.id);
                    const name = friend.username ?? "PBox member";
                    return (
                      <button key={friend.id} type="button" aria-pressed={active} onClick={() => toggle(friend.id)} className={cn("flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 text-left transition", active ? "border-[var(--accent)] bg-[rgb(var(--accent-rgb)/0.1)]" : "border-transparent hover:bg-[var(--glass)]")}>
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--glass-strong)] font-bold text-[var(--accent)]">{name.charAt(0).toUpperCase()}</span>
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{name}</span>
                        <span className={cn("grid size-6 place-items-center rounded-full border", active ? "border-[var(--accent)] bg-[var(--accent)] text-black" : "border-[var(--border-strong)]")}>
                          {active && <Check className="size-3.5" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : !signedIn ? (
              <div className="rounded-xl bg-[var(--glass)] p-4 text-sm text-[var(--text-secondary)]">
                <Users className="mb-2 size-5 text-[var(--accent)]" /> Sign in to send directly to PBox friends. External sharing remains available.
              </div>
            ) : null}

            <label className="block text-sm font-bold">
              Optional message
              <textarea value={message} onChange={(event) => setMessage(event.target.value.slice(0, 500))} rows={3} placeholder="Add a note…" className="mt-2 w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-sm font-normal outline-none focus:border-[var(--accent)]" />
              <span className="mt-1 block text-right text-xs font-normal text-[var(--text-muted)]">{message.length}/500</span>
            </label>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-[var(--border)] p-4 pb-[calc(16px+env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => void externalShare()}><Copy className="size-4" /> Share outside PBox</Button>
            {signedIn && allowDirect && <Button onClick={() => void send()} loading={loading} disabled={!selected.length}><Send className="size-4" /> Send to friends</Button>}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
