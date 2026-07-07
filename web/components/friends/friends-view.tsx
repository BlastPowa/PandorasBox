"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { Search, UserPlus, Check, X, UserMinus, Ban, Users } from "lucide-react";
import {
  searchUsers,
  listMyFriendships,
  sendFriendRequest,
  respondToRequest,
  removeFriendship,
  blockUser,
  fetchProfilesByIds,
  type Friendship,
  type ProfileSummary,
} from "@/lib/friends/friends";
import { useLibrary } from "@/lib/library/use-library";
import { createClient } from "@/lib/supabase/client";
import { GlassCard } from "@/components/ui-fx/glass-card";
import { Button } from "@/components/ui-fx/button";
import { Input } from "@/components/ui-fx/input";
import { EmptyState } from "@/components/ui-fx/feedback";

type Tab = "friends" | "requests" | "find";

export function FriendsView() {
  const { signedIn } = useLibrary();
  const [tab, setTab] = useState<Tab>("friends");
  const [myId, setMyId] = useState<string | null>(null);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [profiles, setProfiles] = useState<Map<string, ProfileSummary>>(new Map());
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProfileSummary[]>([]);
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    const { data } = await createClient().auth.getUser();
    setMyId(data.user?.id ?? null);
    const rows = await listMyFriendships();
    setFriendships(rows);
    const otherIds = rows.map((r) => (r.requester === data.user?.id ? r.addressee : r.requester));
    setProfiles(await fetchProfilesByIds(otherIds));
  }, []);

  useEffect(() => {
    if (signedIn) void load();
  }, [signedIn, load]);

  const accepted = useMemo(() => friendships.filter((f) => f.status === "accepted"), [friendships]);
  const incoming = useMemo(() => friendships.filter((f) => f.status === "pending" && f.addressee === myId), [friendships, myId]);
  const outgoing = useMemo(() => friendships.filter((f) => f.status === "pending" && f.requester === myId), [friendships, myId]);

  async function search() {
    if (!query.trim()) return;
    setSearching(true);
    try {
      setResults(await searchUsers(query.trim()));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  function statusWith(userId: string): FriendshipStatusLabel {
    const f = friendships.find((r) => r.requester === userId || r.addressee === userId);
    if (!f) return "none";
    if (f.status === "accepted") return "friends";
    if (f.status === "pending") return f.requester === myId ? "sent" : "incoming";
    if (f.status === "blocked") return "blocked";
    return "none";
  }

  async function request(userId: string) {
    try {
      await sendFriendRequest(userId);
      toast.success("Request sent");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send request");
    }
  }

  async function respond(id: string, accept: boolean) {
    try {
      await respondToRequest(id, accept);
      toast.success(accept ? "Friend added" : "Request declined");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update");
    }
  }

  async function remove(id: string) {
    try {
      await removeFriendship(id);
      toast.success("Removed");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove");
    }
  }

  async function block(userId: string) {
    try {
      await blockUser(userId);
      toast.success("Blocked");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not block");
    }
  }

  if (!signedIn) {
    return (
      <EmptyState
        icon={<Users className="size-10" />}
        title="Connect with other collectors"
        description="Sign in to add friends, see their activity, and view public profiles & collections."
        action={<Button asChild><Link href="/login?next=/friends">Sign in</Link></Button>}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        {(["friends", "requests", "find"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${tab === t ? "bg-[var(--accent)] text-[#0a0a0f]" : "glass text-[var(--text-secondary)]"}`}
          >
            {t === "friends" ? `Friends (${accepted.length})` : t === "requests" ? `Requests (${incoming.length})` : "Find people"}
          </button>
        ))}
      </div>

      {tab === "friends" && (
        accepted.length === 0 ? (
          <EmptyState icon={<Users className="size-10" />} title="No friends yet" description="Search for people in the Find tab." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {accepted.map((f) => {
              const otherId = f.requester === myId ? f.addressee : f.requester;
              const p = profiles.get(otherId);
              return (
                <div key={f.id} className="glass flex items-center gap-3 rounded-[var(--radius-lg)] p-3">
                  <Avatar url={p?.avatar_url ?? null} />
                  <Link href={`/profile/${p?.username ?? ""}`} className="min-w-0 flex-1 font-semibold hover:text-[var(--accent)]">
                    {p?.username ?? "Unknown"}
                  </Link>
                  <button onClick={() => void remove(f.id)} title="Remove friend" className="rounded-md p-1.5 text-[var(--dropped)] hover:bg-[var(--glass)]">
                    <UserMinus className="size-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )
      )}

      {tab === "requests" && (
        <div className="space-y-4">
          {incoming.length === 0 && outgoing.length === 0 && (
            <EmptyState icon={<UserPlus className="size-10" />} title="No pending requests" description="" />
          )}
          {incoming.length > 0 && (
            <GlassCard macDots title="Incoming">
              <div className="space-y-2 p-3">
                {incoming.map((f) => {
                  const p = profiles.get(f.requester);
                  return (
                    <div key={f.id} className="flex items-center gap-3 rounded-[var(--radius-md)] p-2">
                      <Avatar url={p?.avatar_url ?? null} />
                      <span className="min-w-0 flex-1 font-semibold">{p?.username ?? "Unknown"}</span>
                      <button onClick={() => void respond(f.id, true)} className="rounded-md p-1.5 text-[var(--completed)] hover:bg-[var(--glass)]"><Check className="size-4" /></button>
                      <button onClick={() => void respond(f.id, false)} className="rounded-md p-1.5 text-[var(--dropped)] hover:bg-[var(--glass)]"><X className="size-4" /></button>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          )}
          {outgoing.length > 0 && (
            <GlassCard macDots title="Sent">
              <div className="space-y-2 p-3">
                {outgoing.map((f) => {
                  const p = profiles.get(f.addressee);
                  return (
                    <div key={f.id} className="flex items-center gap-3 rounded-[var(--radius-md)] p-2">
                      <Avatar url={p?.avatar_url ?? null} />
                      <span className="min-w-0 flex-1 text-[var(--text-secondary)]">{p?.username ?? "Unknown"}</span>
                      <span className="text-xs text-[var(--text-muted)]">Pending</span>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          )}
        </div>
      )}

      {tab === "find" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Input placeholder="Search by username…" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void search()} />
            <Button onClick={() => void search()} loading={searching}><Search className="size-4" /></Button>
          </div>
          <div className="space-y-2">
            {results.map((p) => {
              const status = statusWith(p.id);
              return (
                <div key={p.id} className="glass flex items-center gap-3 rounded-[var(--radius-md)] p-2.5">
                  <Avatar url={p.avatar_url} />
                  <Link href={`/profile/${p.username ?? ""}`} className="min-w-0 flex-1 font-semibold hover:text-[var(--accent)]">
                    {p.username}
                  </Link>
                  {status === "none" && (
                    <Button size="sm" onClick={() => void request(p.id)}><UserPlus className="size-4" /> Add</Button>
                  )}
                  {status === "sent" && <span className="text-xs text-[var(--text-muted)]">Request sent</span>}
                  {status === "incoming" && <span className="text-xs text-[var(--gold)]">Sent you a request</span>}
                  {status === "friends" && <span className="text-xs text-[var(--completed)]">Friends</span>}
                  {status !== "blocked" && (
                    <button onClick={() => void block(p.id)} title="Block" className="rounded-md p-1.5 text-[var(--text-muted)] hover:bg-[var(--glass)]">
                      <Ban className="size-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

type FriendshipStatusLabel = "none" | "sent" | "incoming" | "friends" | "blocked";

function Avatar({ url }: { url: string | null }) {
  return (
    <div className="relative size-10 shrink-0 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
      {url ? <Image src={url} alt="" fill sizes="40px" className="object-cover" /> : <div className="grid size-full place-items-center text-xs font-bold text-[var(--text-muted)]">?</div>}
    </div>
  );
}
