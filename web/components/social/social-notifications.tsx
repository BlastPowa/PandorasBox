"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface NotificationRow {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: "friend_request" | "friend_accepted" | "share_received";
  share_id: string | null;
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
          const [{ data: actor }, { data: share }] = await Promise.all([
            row.actor_id ? supabase.from("profiles").select("username").eq("id", row.actor_id).maybeSingle() : Promise.resolve({ data: null }),
            row.share_id ? supabase.from("social_shares").select("title").eq("id", row.share_id).maybeSingle() : Promise.resolve({ data: null }),
          ]);
          const name = actor?.username ?? "Someone";
          const message = row.type === "friend_request" ? `${name} has sent you a friend request`
            : row.type === "friend_accepted" ? `${name} has accepted your friend request`
            : `${name} shared ${share?.title ?? "something"} with you`;
          const href = row.type === "share_received" ? "/friends?tab=shared" : "/notifications";
          toast(row.type === "friend_accepted" ? "Friend request accepted" : "PBox notification", {
            description: message,
            action: { label: "View", onClick: () => { window.location.href = href; } },
          });
          window.dispatchEvent(new CustomEvent("pbox:notifications-change"));
          if (row.type !== "share_received") window.dispatchEvent(new CustomEvent("pbox:friendship-change"));
          else window.dispatchEvent(new CustomEvent("pbox:shares-change"));
        })();
      }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [userId]);
  return null;
}
