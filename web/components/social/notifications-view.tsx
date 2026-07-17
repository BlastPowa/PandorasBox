"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Check, CheckCheck, Share2, Trash2, UserPlus, X } from "lucide-react";
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
  const load = useCallback(async () => {
    setLoading(true);
    try { setRows((await listNotifications(filter)).notifications); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not load notifications"); }
    finally { setLoading(false); }
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

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex max-w-full gap-2 overflow-x-auto pb-1">{FILTERS.map((item) => <button key={item.value} onClick={() => setFilter(item.value)} className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold ${filter === item.value ? "bg-[var(--accent)] text-black" : "glass text-[var(--text-secondary)]"}`}>{item.label}</button>)}</div>
      <Button variant="ghost" size="sm" onClick={() => void update("read_all")}><CheckCheck className="size-4" /> Mark all read</Button>
    </div>
    {loading ? <div className="skeleton h-36 rounded-[var(--radius-lg)]" /> : rows.length === 0 ? <div className="glass grid min-h-48 place-items-center rounded-[var(--radius-lg)] text-center"><div><Bell className="mx-auto mb-2 size-9 text-[var(--accent)]" /><h2 className="font-display font-bold">All caught up</h2><p className="mt-1 text-sm text-[var(--text-muted)]">Social notifications will appear here.</p></div></div> : <div className="space-y-2">{rows.map((row) => {
      const content = copy(row); const unread = !row.read_at;
      return <article key={row.id} className={`glass flex items-start gap-3 rounded-[var(--radius-lg)] p-4 ${unread ? "ring-1 ring-[rgb(var(--accent-rgb)/0.45)]" : ""}`}>
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[rgb(var(--accent-rgb)/0.12)] text-[var(--accent)]">{row.type === "share_received" ? <Share2 className="size-5" /> : row.type === "message_received" || row.type === "group_invitation" ? <Bell className="size-5" /> : <UserPlus className="size-5" />}</span>
        <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{content.text}</p>{row.type === "share_received" && row.share?.message && <blockquote className="mt-2 whitespace-pre-wrap rounded-xl border-l-2 border-[var(--accent)] bg-[rgb(var(--accent-rgb)/0.08)] px-3 py-2 text-sm leading-relaxed text-[var(--text-secondary)]">{row.share.message}</blockquote>}<p className="mt-1 text-xs text-[var(--text-muted)]">{new Date(row.created_at).toLocaleString()}</p><div className="mt-3 flex flex-wrap gap-2">
          {row.type === "friend_request" && unread && <><Button size="sm" onClick={() => void respond(row, true)}><Check className="size-4" /> Accept</Button><Button size="sm" variant="outline" onClick={() => void respond(row, false)}><X className="size-4" /> Decline</Button></>}
          {row.type === "group_invitation" && unread && <><Button size="sm" onClick={() => void respondGroup(row, true)}><Check className="size-4" /> Join</Button><Button size="sm" variant="outline" onClick={() => void respondGroup(row, false)}><X className="size-4" /> Decline</Button></>}
          <Button asChild size="sm" variant={row.type === "friend_request" && unread ? "ghost" : "primary"}><Link href={content.href} onClick={() => unread && void update("read", row.id)}>Open</Link></Button>
          <Button size="sm" variant="ghost" aria-label="Dismiss notification" onClick={() => void update("dismiss", row.id)}><Trash2 className="size-4" /></Button>
        </div></div>
      </article>;
    })}</div>}
  </div>;
}
