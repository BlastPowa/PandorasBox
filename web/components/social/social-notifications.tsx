"use client";

import { useEffect } from "react";
import { toast } from "sonner";
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
  useEffect(() => {
    const supabase = createClient();
    const shown = new Set<string>();
    const channel = supabase.channel(`social-notifications:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (payload) => {
        const row = payload.new as NotificationRow;
        if (!row.id || shown.has(row.id)) return;
        shown.add(row.id);
        void (async () => {
          const [{ data: actor }, { data: share }, { data: message }, { data: conversation }] = await Promise.all([
            row.actor_id ? supabase.from("profiles").select("username").eq("id", row.actor_id).maybeSingle() : Promise.resolve({ data: null }),
            row.share_id ? supabase.from("social_shares").select("title").eq("id", row.share_id).maybeSingle() : Promise.resolve({ data: null }),
            row.message_id ? supabase.from("messages").select("body").eq("id", row.message_id).maybeSingle() : Promise.resolve({ data: null }),
            row.conversation_id ? supabase.from("conversations").select("name").eq("id", row.conversation_id).maybeSingle() : Promise.resolve({ data: null }),
          ]);
          const name = actor?.username ?? "Someone";
          const text = row.type === "friend_request" ? `${name} has sent you a friend request`
            : row.type === "friend_accepted" ? `${name} has accepted your friend request`
            : row.type === "share_received" ? `${name} shared ${share?.title ?? "something"} with you`
            : row.type === "group_invitation" ? `${name} invited you to ${conversation?.name ?? "a group"}`
            : `${name}: ${(message?.body ?? "Sent a message").slice(0, 100)}`;
          const href = row.type === "share_received" ? "/friends?tab=shared" : row.conversation_id ? `/messages/${row.conversation_id}` : "/notifications";
          toast(row.type === "friend_accepted" ? "Friend request accepted" : row.type === "message_received" ? "New message" : "PBox notification", {
            description: text,
            action: { label: "View", onClick: () => { window.location.href = href; } },
          });
          window.dispatchEvent(new CustomEvent("pbox:notifications-change"));
          if (row.type === "friend_request" || row.type === "friend_accepted") window.dispatchEvent(new CustomEvent("pbox:friendship-change"));
          if (row.type === "share_received") window.dispatchEvent(new CustomEvent("pbox:shares-change"));
          if (row.type === "message_received" || row.type === "group_invitation") window.dispatchEvent(new CustomEvent("pbox:messages-change"));
        })();
      }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [userId]);
  return null;
}
