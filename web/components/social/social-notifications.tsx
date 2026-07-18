"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface NotificationRow {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: "friend_request" | "friend_accepted" | "share_received" | "group_invitation" | "message_received";
  share_id: string | null;
  conversation_id: string | null;
  message_id: string | null;
}

export function SocialNotifications({ userId }: { userId: string }) {
  const [notice, setNotice] = useState<{ title: string; text: string; href: string } | null>(null);
  const dismissTimer = useRef<number | null>(null);
  useEffect(() => {
    const supabase = createClient();
    const shown = new Set<string>();
    const channel = supabase.channel(`social-notifications:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (payload) => {
        const row = payload.new as NotificationRow;
        const previous = payload.old as Partial<NotificationRow>;
        if (payload.eventType === "UPDATE" && row.message_id === previous.message_id) return;
        if (!row.id || shown.has(row.id)) return;
        shown.add(row.id);
        void (async () => {
          const [{ data: actor }, { data: share }, { data: message }, { data: conversation }] = await Promise.all([
            row.actor_id ? supabase.from("profiles").select("username").eq("id", row.actor_id).maybeSingle() : Promise.resolve({ data: null }),
            row.share_id ? supabase.from("social_shares").select("title, message").eq("id", row.share_id).maybeSingle() : Promise.resolve({ data: null }),
            row.message_id ? supabase.from("messages").select("body, shared_entity, media_attachment").eq("id", row.message_id).maybeSingle() : Promise.resolve({ data: null }),
            row.conversation_id ? supabase.from("conversations").select("name").eq("id", row.conversation_id).maybeSingle() : Promise.resolve({ data: null }),
          ]);
          const name = actor?.username ?? "Someone";
          const text = row.type === "friend_request" ? `${name} has sent you a friend request`
            : row.type === "friend_accepted" ? `${name} has accepted your friend request`
            : row.type === "share_received" ? `${name} shared ${share?.title ?? "something"} with you${share?.message ? ` — “${share.message.slice(0, 100)}”` : ""}`
            : row.type === "group_invitation" ? `${name} invited you to ${conversation?.name ?? "a group"}`
            : `${name}: ${(message?.body ?? (message?.shared_entity as { title?: string } | null)?.title ?? ((message?.media_attachment as { kind?: string } | null)?.kind === "sticker" ? "Sent a sticker" : (message?.media_attachment as { kind?: string } | null)?.kind === "gif" ? "Sent a GIF" : message?.media_attachment ? "Sent an image" : "Sent a message")).slice(0, 100)}`;
          const href = row.type === "share_received" ? "/friends?tab=shared" : row.conversation_id ? `/messages/${row.conversation_id}` : "/notifications";
          setNotice({ title: row.type === "friend_accepted" ? "Friend request accepted" : row.type === "message_received" ? "New message" : "PBox notification", text, href });
          if (dismissTimer.current) window.clearTimeout(dismissTimer.current);
          dismissTimer.current = window.setTimeout(() => setNotice(null), 6500);
          window.dispatchEvent(new CustomEvent("pbox:notifications-change"));
          if (row.type === "friend_request" || row.type === "friend_accepted") window.dispatchEvent(new CustomEvent("pbox:friendship-change"));
          if (row.type === "share_received") window.dispatchEvent(new CustomEvent("pbox:shares-change"));
          if (row.type === "message_received" || row.type === "group_invitation") window.dispatchEvent(new CustomEvent("pbox:messages-change"));
        })();
      }).subscribe();
    return () => {
      void supabase.removeChannel(channel);
      if (dismissTimer.current) window.clearTimeout(dismissTimer.current);
    };
  }, [userId]);
  if (!notice) return null;
  return (
    <aside className="pbox-social-toast" aria-live="polite" aria-label={notice.title}>
      <div className="flex h-8 items-center gap-1.5 border-b border-[var(--border)] px-3" aria-hidden="true"><span className="size-2.5 rounded-full bg-[#ff5f57]" /><span className="size-2.5 rounded-full bg-[#febc2e]" /><span className="size-2.5 rounded-full bg-[#28c840]" /><span className="ml-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">PBox</span></div>
      <div className="flex items-center gap-2 p-2.5">
        <button type="button" onClick={() => { window.location.href = notice.href; }} className="flex min-w-0 flex-1 items-start gap-3 text-left">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[rgb(var(--accent-rgb)/0.16)] text-[var(--accent)]"><Bell className="size-5" /></span>
          <span className="min-w-0 flex-1"><strong className="block text-sm">{notice.title}</strong><span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-[var(--text-secondary)]">{notice.text}</span></span>
        </button>
        <button type="button" onClick={() => setNotice(null)} className="grid size-11 shrink-0 place-items-center rounded-full" aria-label="Dismiss notification"><X className="size-4" /></button>
      </div>
    </aside>
  );
}
