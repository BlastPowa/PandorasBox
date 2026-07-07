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
  const { error } = await supabase
    .from("friendships")
    .insert({ requester: uid, addressee: addresseeId, status: "pending" });
  if (error) throw new Error(error.message);
}

export async function respondToRequest(id: string, accept: boolean): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("friendships")
    .update({ status: accept ? "accepted" : "declined", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
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
