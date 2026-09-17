"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bell, Check, CheckCheck, ChevronDown, MessageCircle, Share2, Trash2, UserCheck, UserPlus, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui-fx/button";
import { respondToRequest } from "@/lib/friends/friends";
import { listNotifications, updateNotification } from "@/lib/social/client";
import type { NotificationFilter, SocialNotification } from "@/lib/social/types";
import { conversationAction } from "@/lib/messages/client";

const FILTERS: { value: NotificationFilter; label: string }[] = [
  { value: "all", label: "All" }, { value: "unread", label: "Unread" },
  { value: "shares", label: "Shares" }, { value: "friends", label: "Friends" },
  { value: "messages", label: "Messages" },
];

const TYPE_META: Record<SocialNotification["type"], { label: string; icon: typeof Bell }> = {
  friend_request: { label: "Friend request", icon: UserPlus },
  friend_accepted: { label: "Friend update", icon: UserCheck },
  share_received: { label: "Shared pick", icon: Share2 },
  group_invitation: { label: "Group invite", icon: Users },
  message_received: { label: "Message", icon: MessageCircle },
};

function dateGroup(value: string) {
  const date = new Date(value);
  const now = new Date();
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const rowDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diff = Math.round((day - rowDay) / 86_400_000);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return "This week";
  return "Earlier";
}

function copy(notification: SocialNotification) {
  const name = notification.actor?.username ?? "Someone";
  if (notification.type === "friend_request") return { text: `${name} sent you a friend request.`, href: "/friends?tab=requests" };
  if (notification.type === "friend_accepted") return { text: `${name} accepted your friend request.`, href: "/friends" };
  if (notification.type === "group_invitation") return { text: `${name} invited you to ${notification.conversation?.name ?? "a group"}.`, href: notification.conversation_id ? `/messages/${notification.conversation_id}` : "/messages" };
  if (notification.type === "message_received") return { text: `${name}: ${(notification.message?.body ?? notification.message?.shared_entity?.title ?? (notification.message?.media_attachment?.kind === "sticker" ? "Sent a sticker" : notification.message?.media_attachment?.kind === "gif" ? "Sent a GIF" : notification.message?.media_attachment ? "Sent an image" : "Sent a message")).slice(0, 120)}`, href: notification.conversation_id ? `/messages/${notification.conversation_id}` : "/messages" };
  return { text: `${name} shared ${notification.share?.title ?? "something"} with you.`, href: notification.share?.href ?? "/friends?tab=shared" };
}

export function NotificationsView() {
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [rows, setRows] = useState<SocialNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const load = useCallback(async (cursor?: string) => {
    if (cursor) setLoadingMore(true);
    else setLoading(true);
    try {
      const result = await listNotifications(filter, cursor);
      setRows((current) => cursor ? [...current, ...result.notifications] : result.notifications);
      setUnreadCount(result.unreadCount);
      setNextCursor(result.nextCursor);
    }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not load notifications"); }
    finally {
      if (cursor) setLoadingMore(false);
      else setLoading(false);
    }
  }, [filter]);
  useEffect(() => { queueMicrotask(() => void load()); }, [load]);
  useEffect(() => { const refresh = () => void load(); window.addEventListener("pbox:notifications-change", refresh); return () => window.removeEventListener("pbox:notifications-change", refresh); }, [load]);

  async function update(action: "read" | "dismiss" | "read_all", id?: string) {
    try { await updateNotification(action, id); await load(); window.dispatchEvent(new CustomEvent("pbox:notifications-change")); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not update notification"); }
  }
  async function respond(row: SocialNotification, accept: boolean) {
    if (!row.friendship_id) return;
    try {
      await respondToRequest(row.friendship_id, accept);
      await update("read", row.id);
      toast.success(accept ? "Friend added" : "Request declined");
      window.dispatchEvent(new CustomEvent("pbox:friendship-change"));
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not respond"); }
  }
  async function respondGroup(row: SocialNotification, accept: boolean) {
    if (!row.conversation_id) return;
    try {
      await conversationAction(row.conversation_id, accept ? "accept" : "decline");
      await update("read", row.id);
      toast.success(accept ? "Group joined" : "Invitation declined");
      window.dispatchEvent(new CustomEvent("pbox:messages-change"));
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not respond"); }
  }

  const actionCount = rows.filter((row) => !row.read_at && (row.type === "friend_request" || row.type === "group_invitation")).length;
  const groups = rows.reduce<Array<{ label: string; rows: SocialNotification[] }>>((acc, row) => {
    const label = dateGroup(row.created_at);
    const current = acc.at(-1);
    if (current?.label === label) current.rows.push(row);
    else acc.push({ label, rows: [row] });
    return acc;
  }, []);

  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="pb-uiverse-card rounded-[var(--radius-lg)] p-4"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Unread</p><div className="mt-2 flex items-end justify-between gap-2"><span className="font-mono text-3xl font-bold">{unreadCount}</span><Bell className="size-5 text-[var(--accent)]" /></div></div>
      <div className="pb-uiverse-card rounded-[var(--radius-lg)] p-4"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Loaded now</p><div className="mt-2 flex items-end justify-between gap-2"><span className="font-mono text-3xl font-bold">{rows.length}{nextCursor ? "+" : ""}</span><CheckCheck className="size-5 text-[var(--accent)]" /></div></div>
      <div className="pb-uiverse-card rounded-[var(--radius-lg)] p-4"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Needs response</p><div className="mt-2 flex items-end justify-between gap-2"><span className="font-mono text-3xl font-bold">{actionCount}</span><UserPlus className="size-5 text-[var(--accent)]" /></div></div>
    </div>

    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex max-w-full gap-2 overflow-x-auto pb-1">{FILTERS.map((item) => <button key={item.value} onClick={() => setFilter(item.value)} className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold transition ${filter === item.value ? "border-transparent bg-[var(--accent)] text-black shadow-[0_10px_24px_rgb(var(--accent-rgb)/0.22)]" : "border-[var(--border)] bg-[var(--glass)] text-[var(--text-secondary)] hover:-translate-y-0.5 hover:border-[rgb(var(--accent-rgb)/0.35)]"}`}>{item.label}{item.value === "unread" && unreadCount > 0 ? ` · ${unreadCount}` : ""}</button>)}</div>
      <Button variant="ghost" size="sm" disabled={unreadCount === 0} onClick={() => void update("read_all")}><CheckCheck className="size-4" /> Mark all read</Button>
    </div>

    {loading ? <div className="skeleton h-44 rounded-[var(--radius-lg)]" /> : rows.length === 0 ? <div className="pb-uiverse-card pb-uiverse-card--feature grid min-h-52 place-items-center rounded-[var(--radius-lg)] p-6 text-center"><div><Bell className="mx-auto mb-2 size-9 text-[var(--accent)]" /><h2 className="font-display font-bold">{filter === "all" ? "All caught up" : `No ${FILTERS.find((item) => item.value === filter)?.label.toLowerCase() ?? "matching"} notifications`}</h2><p className="mt-1 text-sm text-[var(--text-muted)]">Friend activity, shared picks and message updates will stay organized here.</p></div></div> : <div className="space-y-6">{groups.map((group) => <section key={group.label} className="space-y-2">
      <div className="flex items-center gap-3 px-1"><h2 className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--text-muted)]">{group.label}</h2><span className="h-px flex-1 bg-[var(--border)]" /><span className="font-mono text-[10px] text-[var(--text-muted)]">{group.rows.length}</span></div>
      {group.rows.map((row) => {
        const content = copy(row);
        const unread = !row.read_at;
        const meta = TYPE_META[row.type];
        const Icon = meta.icon;
        const profileHref = row.actor?.username ? `/profile/${encodeURIComponent(row.actor.username)}` : null;
        return <article key={row.id} className={`pb-uiverse-row flex items-start gap-3 rounded-[var(--radius-lg)] p-4 transition ${unread ? "ring-1 ring-[rgb(var(--accent-rgb)/0.45)]" : "opacity-90"}`}>
          <div className="relative size-12 shrink-0 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--glass)]">
            {row.actor?.avatar_url ? <Image src={row.actor.avatar_url} alt="" fill sizes="48px" className="object-cover" /> : <span className="grid size-full place-items-center text-[var(--accent)]"><Icon className="size-5" /></span>}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2"><span className="rounded-full bg-[rgb(var(--accent-rgb)/0.12)] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[var(--accent)]">{meta.label}</span>{unread && <span className="size-2 rounded-full bg-[var(--accent)]" aria-label="Unread" />}</div>
                <p className="text-sm font-semibold leading-relaxed">{content.text}</p>
              </div>
              <p className="shrink-0 text-[11px] text-[var(--text-muted)]">{new Date(row.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
            </div>
            {row.type === "share_received" && row.share && <div className="mt-3 flex gap-3 rounded-xl border border-[var(--border)] bg-[var(--glass)] p-2.5">
              {row.share.poster_url && <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-md"><Image src={row.share.poster_url} alt="" fill sizes="44px" className="object-cover" /></div>}
              <div className="min-w-0"><p className="line-clamp-1 text-xs font-bold">{row.share.title}</p><p className="mt-0.5 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{row.share.entity_type === "collection" ? "Collection" : row.share.media_type}</p>{row.share.message && <blockquote className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[var(--text-secondary)]">“{row.share.message}”</blockquote>}</div>
            </div>}
            <div className="mt-3 flex flex-wrap gap-2">
              {row.type === "friend_request" && unread && <><Button size="sm" onClick={() => void respond(row, true)}><Check className="size-4" /> Accept</Button><Button size="sm" variant="outline" onClick={() => void respond(row, false)}><X className="size-4" /> Decline</Button></>}
              {row.type === "group_invitation" && unread && <><Button size="sm" onClick={() => void respondGroup(row, true)}><Check className="size-4" /> Join</Button><Button size="sm" variant="outline" onClick={() => void respondGroup(row, false)}><X className="size-4" /> Decline</Button></>}
              <Button asChild size="sm" variant={row.type === "friend_request" && unread ? "ghost" : "primary"}><Link href={content.href} onClick={() => unread && void update("read", row.id)}>Open</Link></Button>
              {profileHref && <Button asChild size="sm" variant="ghost"><Link href={profileHref}>Profile</Link></Button>}
              <Button size="sm" variant="ghost" aria-label="Dismiss notification" onClick={() => void update("dismiss", row.id)}><Trash2 className="size-4" /></Button>
            </div>
          </div>
        </article>;
      })}
    </section>)}</div>}

    {!loading && nextCursor && <div className="flex justify-center"><Button variant="glass" loading={loadingMore} onClick={() => void load(nextCursor)}><ChevronDown className="size-4" /> Load more notifications</Button></div>}
  </div>;
}
