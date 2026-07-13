"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { fetchProfilesByIds, type Friendship } from "@/lib/friends/friends";

type FriendshipRow = Friendship & { updated_at?: string };

export function FriendRequestNotifications({ userId }: { userId: string }) {
  useEffect(() => {
    const supabase = createClient();
    const shown = new Set<string>();

    async function usernameFor(id: string) {
      const profiles = await fetchProfilesByIds([id]);
      return profiles.get(id)?.username ?? "Someone";
    }

    function notifyChange() {
      window.dispatchEvent(new CustomEvent("pbox:friendship-change"));
    }

    async function incoming(payload: RealtimePostgresChangesPayload<FriendshipRow>) {
      const row = payload.new as FriendshipRow;
      if (!row.id || row.addressee !== userId || row.status !== "pending") return;
      const key = `${row.id}:pending:${row.updated_at ?? row.created_at}`;
      if (shown.has(key)) return;
      shown.add(key);
      const username = await usernameFor(row.requester);
      toast.info(`${username} has sent you a friend request`, {
        action: { label: "View", onClick: () => { window.location.href = "/friends"; } },
      });
      notifyChange();
    }

    async function accepted(payload: RealtimePostgresChangesPayload<FriendshipRow>) {
      const row = payload.new as FriendshipRow;
      if (!row.id || row.requester !== userId || row.status !== "accepted") return;
      const key = `${row.id}:accepted:${row.updated_at ?? row.created_at}`;
      if (shown.has(key)) return;
      shown.add(key);
      const username = await usernameFor(row.addressee);
      toast.success(`${username} has accepted your friend request`, {
        action: { label: "View", onClick: () => { window.location.href = "/friends"; } },
      });
      notifyChange();
    }

    const incomingChannel = supabase
      .channel(`friend-requests:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships", filter: `addressee=eq.${userId}` }, (payload) => { void incoming(payload as RealtimePostgresChangesPayload<FriendshipRow>); })
      .subscribe();

    const acceptedChannel = supabase
      .channel(`friend-acceptances:${userId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "friendships", filter: `requester=eq.${userId}` }, (payload) => { void accepted(payload as RealtimePostgresChangesPayload<FriendshipRow>); })
      .subscribe();

    return () => {
      void supabase.removeChannel(incomingChannel);
      void supabase.removeChannel(acceptedChannel);
    };
  }, [userId]);

  return null;
}
