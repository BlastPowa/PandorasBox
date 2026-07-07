"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { fetchProfilesByIds, listMyFriendships, type ProfileSummary } from "@/lib/friends/friends";
import { useLibrary } from "@/lib/library/use-library";

interface ActivityRow {
  id: string;
  user_id: string;
  verb: string;
  title: string | null;
  poster_url: string | null;
  created_at: string;
}

const VERB_LABEL: Record<string, string> = {
  started: "started",
  finished: "finished",
  rated: "rated",
  added: "added",
  created_collection: "created a collection:",
};

export function FriendsActivity() {
  const { signedIn } = useLibrary();
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [profiles, setProfiles] = useState<Map<string, ProfileSummary>>(new Map());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return;

      // Only show activity from people who are actually accepted friends —
      // the "activity" RLS policy also allows reading any public-profile
      // user's activity, which is correct for public profile pages but must
      // NOT leak into a section explicitly labeled "Friends Activity".
      const friendships = await listMyFriendships();
      const friendIds = friendships
        .filter((f) => f.status === "accepted")
        .map((f) => (f.requester === uid ? f.addressee : f.requester));

      if (friendIds.length === 0) {
        if (!cancelled) setLoaded(true);
        return;
      }

      const { data } = await supabase
        .from("activity")
        .select("id, user_id, verb, title, poster_url, created_at")
        .in("user_id", friendIds)
        .order("created_at", { ascending: false })
        .limit(12);
      if (cancelled) return;
      const activityRows = (data as ActivityRow[] | null) ?? [];
      setRows(activityRows);
      setProfiles(await fetchProfilesByIds(Array.from(new Set(activityRows.map((r) => r.user_id)))));
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  if (!signedIn || !loaded || rows.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <Users className="size-5 text-[var(--accent)]" /> Friends Activity
        </h2>
        <Link href="/friends" className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text)]">
          View all
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {rows.map((r) => {
          const p = profiles.get(r.user_id);
          return (
            <Link
              key={r.id}
              href={`/profile/${p?.username ?? ""}`}
              className="glass flex w-56 shrink-0 items-center gap-2.5 rounded-[var(--radius-md)] p-2.5 hover:border-[var(--accent)]"
            >
              {r.poster_url && (
                <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-[6px] bg-[var(--bg-surface)]">
                  <Image src={r.poster_url} alt="" fill sizes="40px" className="object-cover" />
                </div>
              )}
              <p className="min-w-0 text-xs text-[var(--text-secondary)]">
                <span className="font-semibold text-[var(--text)]">{p?.username ?? "Someone"}</span>{" "}
                {VERB_LABEL[r.verb] ?? r.verb}{" "}
                {r.title && <span className="font-semibold text-[var(--text)]">{r.title}</span>}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
