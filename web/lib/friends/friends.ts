"use client";

import { createClient } from "@/lib/supabase/client";

export type FriendshipStatus = "pending" | "accepted" | "declined" | "blocked";

export interface Friendship {
  id: string;
  requester: string;
  addressee: string;
  status: FriendshipStatus;
  created_at: string;
}

export interface ProfileSummary {
  id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  privacy: "public" | "friends" | "private";
}

async function currentUserId(): Promise<string | null> {
  const { data } = await createClient().auth.getUser();
  return data.user?.id ?? null;
}

export async function searchUsers(query: string): Promise<ProfileSummary[]> {
  const supabase = createClient();
  const uid = await currentUserId();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, bio, privacy")
    .ilike("username", `%${query}%`)
    .neq("id", uid ?? "")
    .limit(20);
  if (error) throw new Error(error.message);
  return (data as ProfileSummary[] | null) ?? [];
}

export async function getProfileByUsername(username: string): Promise<ProfileSummary | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, bio, privacy")
    .eq("username", username)
    .maybeSingle();
  return (data as ProfileSummary | null) ?? null;
}

/** All friendship rows involving the current user. */
export async function listMyFriendships(): Promise<Friendship[]> {
  const supabase = createClient();
  const uid = await currentUserId();
  if (!uid) return [];
  const { data, error } = await supabase
    .from("friendships")
    .select("id, requester, addressee, status, created_at")
    .or(`requester.eq.${uid},addressee.eq.${uid}`);
  if (error) throw new Error(error.message);
  return (data as Friendship[] | null) ?? [];
}

export async function sendFriendRequest(addresseeId: string): Promise<void> {
  const supabase = createClient();
  const uid = await currentUserId();
  if (!uid) throw new Error("Sign in required");
  if (uid === addresseeId) throw new Error("You can't friend yourself.");

  // Check both directions first so this is idempotent instead of hitting the
  // unique constraint (which previously surfaced as a raw Postgres error to the user).
  const { data: existingRows } = await supabase
    .from("friendships")
    .select("id, requester, addressee, status")
    .or(
      `and(requester.eq.${uid},addressee.eq.${addresseeId}),and(requester.eq.${addresseeId},addressee.eq.${uid})`
    );
  const existing = (existingRows as Friendship[] | null)?.[0];

  if (existing) {
    if (existing.status === "accepted") throw new Error("You're already friends.");
    if (existing.status === "pending") throw new Error("A request is already pending.");
    if (existing.status === "blocked") throw new Error("Can't send a request to this user.");
    // status === "declined" — allow re-requesting by reviving the same row.
    const { error } = await supabase
      .from("friendships")
      .update({ requester: uid, addressee: addresseeId, status: "pending", updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    void fetch("/api/push/social", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "friend_request", targetUserId: addresseeId }) }).catch(() => undefined);
    return;
  }

  const { error } = await supabase
    .from("friendships")
    .insert({ requester: uid, addressee: addresseeId, status: "pending" });
  if (error) {
    if (/duplicate key|unique constraint/i.test(error.message)) {
      throw new Error("A request already exists with this user.");
    }
    throw new Error(error.message);
  }
  void fetch("/api/push/social", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "friend_request", targetUserId: addresseeId }) }).catch(() => undefined);
}

export async function respondToRequest(id: string, accept: boolean): Promise<void> {
  const supabase = createClient();
  const { data: friendship } = await supabase.from("friendships").select("requester").eq("id", id).maybeSingle();
  const { error } = await supabase
    .from("friendships")
    .update({ status: accept ? "accepted" : "declined", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  if (accept && friendship?.requester) {
    void fetch("/api/push/social", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "friend_accepted", targetUserId: friendship.requester }) }).catch(() => undefined);
  }
}

export async function removeFriendship(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("friendships").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function blockUser(otherUserId: string): Promise<void> {
  const supabase = createClient();
  const uid = await currentUserId();
  if (!uid) throw new Error("Sign in required");
  // Remove any existing row between the two, then insert a blocked row.
  await supabase
    .from("friendships")
    .delete()
    .or(`and(requester.eq.${uid},addressee.eq.${otherUserId}),and(requester.eq.${otherUserId},addressee.eq.${uid})`);
  const { error } = await supabase
    .from("friendships")
    .insert({ requester: uid, addressee: otherUserId, status: "blocked" });
  if (error) throw new Error(error.message);
}

export async function fetchProfilesByIds(ids: string[]): Promise<Map<string, ProfileSummary>> {
  if (ids.length === 0) return new Map();
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, bio, privacy")
    .in("id", ids);
  return new Map(((data as ProfileSummary[] | null) ?? []).map((p) => [p.id, p]));
}
