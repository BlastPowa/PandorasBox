"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Activity, ArrowUpDown, Ban, Check, Clock3, MessageCircle, Search, UserMinus, UserPlus, Users, X } from "lucide-react";
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
import { SharedInbox } from "@/components/friends/shared-inbox";
import { MessagesView } from "@/components/messages/messages-view";
import { createConversation } from "@/lib/messages/client";
import { profileActivityHref } from "@/lib/profile/activity-href";

type Tab = "friends" | "activity" | "requests" | "find" | "shared" | "messages";
type FriendSort = "recent" | "name";

export function FriendsView() {
  const router = useRouter();
  const { signedIn } = useLibrary();
  const [tab, setTab] = useState<Tab>("friends");
  const [myId, setMyId] = useState<string | null>(null);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [profiles, setProfiles] = useState<Map<string, ProfileSummary>>(new Map());
  const [query, setQuery] = useState("");
  const [friendQuery, setFriendQuery] = useState("");
  const [friendSort, setFriendSort] = useState<FriendSort>("recent");
  const [results, setResults] = useState<ProfileSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const { data } = await createClient().auth.getUser();
    setMyId(data.user?.id ?? null);
    const rows = await listMyFriendships();
    setFriendships(rows);
    const otherIds = rows.map((r) => (r.requester === data.user?.id ? r.addressee : r.requester));
    setProfiles(await fetchProfilesByIds(otherIds));
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (signedIn) queueMicrotask(() => void load());
    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    if (requestedTab === "shared" || requestedTab === "requests" || requestedTab === "messages" || requestedTab === "activity") queueMicrotask(() => setTab(requestedTab));
  }, [signedIn, load]);

  useEffect(() => {
    const reload = () => { void load(); };
    window.addEventListener("pbox:friendship-change", reload);
    return () => window.removeEventListener("pbox:friendship-change", reload);
  }, [load]);

  const accepted = useMemo(() => friendships.filter((f) => f.status === "accepted"), [friendships]);
  const incoming = useMemo(() => friendships.filter((f) => f.status === "pending" && f.addressee === myId), [friendships, myId]);
  const outgoing = useMemo(() => friendships.filter((f) => f.status === "pending" && f.requester === myId), [friendships, myId]);
  const acceptedIds = useMemo(() => accepted.map((f) => (f.requester === myId ? f.addressee : f.requester)), [accepted, myId]);
  const latestConnection = useMemo(
    () => accepted.reduce<string | undefined>((latest, friendship) => !latest || friendship.created_at > latest ? friendship.created_at : latest, undefined),
    [accepted],
  );
  const visibleFriends = useMemo(() => {
    const needle = friendQuery.trim().toLowerCase();
    return accepted
      .filter((friendship) => {
        if (!needle) return true;
        const otherId = friendship.requester === myId ? friendship.addressee : friendship.requester;
        const profile = profiles.get(otherId);
        return `${profile?.username ?? ""} ${profile?.bio ?? ""}`.toLowerCase().includes(needle);
      })
      .sort((a, b) => {
        if (friendSort === "recent") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        const aId = a.requester === myId ? a.addressee : a.requester;
        const bId = b.requester === myId ? b.addressee : b.requester;
        return (profiles.get(aId)?.username ?? "").localeCompare(profiles.get(bId)?.username ?? "");
      });
  }, [accepted, friendQuery, friendSort, myId, profiles]);

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

  async function message(userId: string) {
    try {
      const conversation = await createConversation({ type: "direct", friendId: userId });
      router.push(`/messages/${conversation.id}`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not start conversation"); }
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

  if (!loaded) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading friends">
        <div className="skeleton h-9 w-64 rounded-full" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-[var(--radius-lg)]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <SocialMetric label="Friends" value={accepted.length} note={accepted.length === 1 ? "person in your circle" : "people in your circle"} />
        <SocialMetric label="Requests" value={incoming.length} note={incoming.length ? "waiting for your reply" : "nothing waiting"} />
        <SocialMetric label="Recent" value={formatRelativeConnection(latestConnection)} note="latest connection" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {(["friends", "activity", "requests", "messages", "shared", "find"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`min-h-10 shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition ${tab === t ? "border-transparent bg-[var(--accent)] text-white shadow-[0_10px_24px_rgb(var(--accent-rgb)/0.22)]" : "border-[var(--border)] bg-[var(--glass)] text-[var(--text-secondary)] hover:-translate-y-0.5 hover:border-[rgb(var(--accent-rgb)/0.35)]"}`}
          >
            {t === "friends" ? `Friends (${accepted.length})` : t === "activity" ? "Activity" : t === "requests" ? `Requests (${incoming.length})` : t === "messages" ? "Messages" : t === "shared" ? "Shared" : "Find people"}
          </button>
        ))}
      </div>

      {tab === "friends" && (
        accepted.length === 0 ? (
          <EmptyState icon={<Users className="size-10" />} title="No friends yet" description="Search for people in the Find tab." />
        ) : (
          <div className="space-y-4">
            <GlassCard className="pb-aura p-3 sm:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-3">
                  <Search className="size-4 shrink-0 text-[var(--text-muted)]" />
                  <span className="sr-only">Search your friends</span>
                  <input value={friendQuery} onChange={(event) => setFriendQuery(event.target.value)} placeholder="Search your friends" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
                </label>
                <button type="button" onClick={() => setFriendSort((current) => current === "recent" ? "name" : "recent")} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--glass)] px-4 text-sm font-semibold text-[var(--text-secondary)] transition hover:border-[rgb(var(--accent-rgb)/0.35)] hover:text-[var(--text)]">
                  <ArrowUpDown className="size-4" /> {friendSort === "recent" ? "Newest first" : "A–Z"}
                </button>
              </div>
            </GlassCard>
            {visibleFriends.length === 0 ? <EmptyState icon={<Search className="size-9" />} title="No matching friends" description="Try a different name or bio keyword." /> : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {visibleFriends.map((f) => {
                  const otherId = f.requester === myId ? f.addressee : f.requester;
                  const p = profiles.get(otherId);
                  return (
                    <article key={f.id} className="pb-uiverse-card group relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--glass)] p-4 transition hover:-translate-y-0.5 hover:border-[rgb(var(--accent-rgb)/0.34)] hover:shadow-[0_18px_38px_rgba(0,0,0,.12)]">
                      <div className="absolute inset-x-0 top-0 h-16 bg-[linear-gradient(110deg,rgb(var(--accent-rgb)/0.14),transparent_65%)]" aria-hidden="true" />
                      <div className="relative flex items-start gap-3">
                        <Avatar url={p?.avatar_url ?? null} size="lg" />
                        <div className="min-w-0 flex-1">
                          <Link href={`/profile/${p?.username ?? ""}`} className="block truncate font-display text-base font-bold hover:text-[var(--accent)]">{p?.username ?? "Unknown"}</Link>
                          <p className="mt-1 line-clamp-2 min-h-8 text-xs leading-relaxed text-[var(--text-secondary)]">{p?.bio?.trim() || "No bio yet — open their profile to see collections and recent activity."}</p>
                          <p className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]"><Clock3 className="size-3" /> Friends since {new Date(f.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</p>
                        </div>
                      </div>
                      <div className="relative mt-4 flex gap-2">
                        <Button size="sm" className="flex-1" onClick={() => void message(otherId)}><MessageCircle className="size-4" /> Message</Button>
                        <button onClick={() => void remove(f.id)} title="Remove friend" aria-label={`Remove ${p?.username ?? "friend"}`} className="grid size-10 place-items-center rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-muted)] transition hover:border-[rgb(var(--dropped-rgb)/0.4)] hover:text-[var(--dropped)]"><UserMinus className="size-4" /></button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )
      )}

      {tab === "activity" && <FriendActivityPanel friendIds={acceptedIds} />}

      {tab === "requests" && (
        <div className="space-y-4">
          {incoming.length === 0 && outgoing.length === 0 && (
            <EmptyState icon={<UserPlus className="size-10" />} title="No pending requests" description="" />
          )}
          {incoming.length > 0 && (
            <GlassCard macDots title="Incoming" className="pb-aura">
              <div className="space-y-2 p-3">
                {incoming.map((f) => {
                  const p = profiles.get(f.requester);
                  return (
                    <div key={f.id} className="pb-uiverse-row flex items-center gap-3 rounded-[var(--radius-md)] p-2">
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
            <GlassCard macDots title="Sent" className="pb-aura">
              <div className="space-y-2 p-3">
                {outgoing.map((f) => {
                  const p = profiles.get(f.addressee);
                  return (
                    <div key={f.id} className="pb-uiverse-row flex items-center gap-3 rounded-[var(--radius-md)] p-2">
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
                <div key={p.id} className="pb-uiverse-row flex items-center gap-3 rounded-[var(--radius-md)] p-2.5">
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
      {tab === "shared" && <SharedInbox />}
      {tab === "messages" && <MessagesView embedded />}
    </div>
  );
}

type FriendshipStatusLabel = "none" | "sent" | "incoming" | "friends" | "blocked";

function Avatar({ url, size = "md" }: { url: string | null; size?: "md" | "lg" }) {
  const pixels = size === "lg" ? 52 : 40;
  return (
    <div className={`${size === "lg" ? "size-[52px]" : "size-10"} relative shrink-0 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] shadow-sm`}>
      {url ? <Image src={url} alt="" fill sizes={`${pixels}px`} className="object-cover" /> : <div className="grid size-full place-items-center text-xs font-bold text-[var(--text-muted)]">?</div>}
    </div>
  );
}

function SocialMetric({ label, value, note }: { label: string; value: string | number; note: string }) {
  return (
    <div className="pb-uiverse-card rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--glass)] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</p>
      <div className="mt-1 flex items-end justify-between gap-3"><strong className="font-display text-2xl font-black text-[var(--text)]">{value}</strong><Users className="size-4 text-[var(--accent)]" /></div>
      <p className="mt-1 text-xs text-[var(--text-secondary)]">{note}</p>
    </div>
  );
}

function formatRelativeConnection(value?: string) {
  if (!value) return "—";
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000));
  if (days === 0) return "Today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return months < 12 ? `${months}mo ago` : `${Math.floor(months / 12)}y ago`;
}

interface FriendActivityRow {
  id: string;
  user_id: string;
  verb: string;
  title: string | null;
  poster_url: string | null;
  media_type: string | null;
  media_key: string | null;
  created_at: string;
}

const ACTIVITY_LABELS: Record<string, string> = {
  added: "added",
  started: "started",
  finished: "finished",
  rated: "rated",
  created_collection: "made a collection",
};

function FriendActivityPanel({ friendIds }: { friendIds: string[] }) {
  const [rows, setRows] = useState<FriendActivityRow[]>([]);
  const [people, setPeople] = useState<Map<string, ProfileSummary>>(new Map());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "screen" | "reading">("all");

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (friendIds.length === 0) {
        setRows([]);
        setPeople(new Map());
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data } = await createClient().from("activity").select("id, user_id, verb, title, poster_url, media_type, media_key, created_at").in("user_id", friendIds).order("created_at", { ascending: false }).limit(36);
      if (cancelled) return;
      const activityRows = (data as FriendActivityRow[] | null) ?? [];
      setRows(activityRows);
      setPeople(await fetchProfilesByIds(Array.from(new Set(activityRows.map((row) => row.user_id)))));
      if (!cancelled) setLoading(false);
    }
    void run();
    return () => { cancelled = true; };
  }, [friendIds]);

  const visible = rows.filter((row) => {
    if (filter === "all") return true;
    const type = row.media_type?.toLowerCase();
    return filter === "screen" ? ["movie", "series", "anime"].includes(type ?? "") : ["manga", "manhwa", "comic"].includes(type ?? "");
  });

  if (friendIds.length === 0) return <EmptyState icon={<Activity className="size-10" />} title="Activity starts with friends" description="Add people to see what they are starting, finishing and adding." />;
  if (loading) return <div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="skeleton h-24 rounded-[var(--radius-lg)]" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Your circle</p><h2 className="font-display text-xl font-black">What friends are into</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">A privacy-aware timeline from people you have accepted.</p></div>
        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{(["all", "screen", "reading"] as const).map((value) => <button key={value} type="button" onClick={() => setFilter(value)} className={`min-h-10 shrink-0 rounded-full border px-4 text-xs font-bold capitalize transition ${filter === value ? "border-transparent bg-[var(--accent)] text-white" : "border-[var(--border)] bg-[var(--glass)] text-[var(--text-secondary)] hover:text-[var(--text)]"}`}>{value === "screen" ? "Movies & shows" : value === "reading" ? "Reading" : "All"}</button>)}</div>
      </div>
      {visible.length === 0 ? <EmptyState icon={<Activity className="size-9" />} title="Nothing here yet" description="Try another activity filter or check back after your friends update their libraries." /> : (
        <div className="grid gap-3 lg:grid-cols-2">
          {visible.map((row) => {
            const profile = people.get(row.user_id);
            const href = profileActivityHref(row.media_type, row.media_key, row.title);
            const content = <>
              <div className="relative h-[84px] w-[58px] shrink-0 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]">{row.poster_url ? <Image src={row.poster_url} alt="" fill sizes="58px" className="object-cover transition duration-500 group-hover:scale-105" /> : <div className="grid size-full place-items-center"><Activity className="size-4 text-[var(--text-muted)]" /></div>}</div>
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold text-[var(--accent)]">{profile?.username ?? "Someone"}</span><span className="rounded-full bg-[rgb(var(--accent-rgb)/0.08)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{ACTIVITY_LABELS[row.verb] ?? row.verb}</span></div><p className="mt-1.5 line-clamp-2 font-display text-base font-bold">{row.title ?? "their library"}</p><p className="mt-2 flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]"><Clock3 className="size-3" /> {new Date(row.created_at).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p></div>
            </>;
            const className = "group flex min-h-28 items-center gap-3 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--glass)] p-3 transition hover:-translate-y-0.5 hover:border-[rgb(var(--accent-rgb)/0.32)]";
            return href ? <Link key={row.id} href={href} className={className}>{content}</Link> : <div key={row.id} className={className}>{content}</div>;
          })}
        </div>
      )}
    </div>
  );
}
