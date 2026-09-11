"use client";

import { createClient } from "@/lib/supabase/client";

export type WatchPartyMedia = {
  mediaKey: string;
  title: string;
  mediaType: "movie" | "series" | "anime";
  season: number | null;
  episode: number | null;
  watchPath: string;
};

export type WatchPartyRoom = {
  id: string;
  code: string;
  host_id: string;
  media_key: string;
  title: string;
  media_type: "movie" | "series" | "anime";
  season: number | null;
  episode: number | null;
  watch_path: string;
  status: "active" | "ended";
  created_at: string;
  updated_at: string;
};

export type WatchPartyMember = {
  room_id: string;
  user_id: string;
  role: "host" | "member";
  joined_at: string;
};

export type WatchPartyInvite = {
  id: string;
  room_id: string;
  sender_id: string;
  recipient_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  updated_at: string;
  room?: WatchPartyRoom | null;
};

function makeCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
}

async function requireUserId(): Promise<string> {
  const { data } = await createClient().auth.getUser();
  if (!data.user) throw new Error("Sign in to use Watch Party.");
  return data.user.id;
}

export async function createWatchParty(media: WatchPartyMedia): Promise<WatchPartyRoom> {
  const supabase = createClient();
  const userId = await requireUserId();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const { data, error } = await supabase
      .from("watch_party_rooms")
      .insert({
        code: makeCode(),
        host_id: userId,
        media_key: media.mediaKey,
        title: media.title,
        media_type: media.mediaType,
        season: media.season,
        episode: media.episode,
        watch_path: media.watchPath,
      })
      .select("*")
      .single();
    if (!error && data) {
      const room = data as WatchPartyRoom;
      const { error: memberError } = await supabase.from("watch_party_members").insert({ room_id: room.id, user_id: userId, role: "host" });
      if (memberError) throw new Error(memberError.message);
      return room;
    }
    lastError = new Error(error?.message ?? "Could not create Watch Party.");
    if (!/duplicate|unique/i.test(error?.message ?? "")) break;
  }
  throw lastError ?? new Error("Could not create Watch Party.");
}

export async function getWatchPartyById(roomId: string): Promise<WatchPartyRoom | null> {
  const { data, error } = await createClient().from("watch_party_rooms").select("*").eq("id", roomId).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as WatchPartyRoom | null) ?? null;
}

export async function joinWatchParty(code: string): Promise<WatchPartyRoom> {
  const supabase = createClient();
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("watch_party_rooms")
    .select("*")
    .eq("code", code.trim().toUpperCase())
    .eq("status", "active")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Room not found. Watch Parties are limited to accepted friends of the host.");
  const room = data as WatchPartyRoom;
  const { error: memberError } = await supabase
    .from("watch_party_members")
    .upsert({ room_id: room.id, user_id: userId, role: room.host_id === userId ? "host" : "member" }, { onConflict: "room_id,user_id" });
  if (memberError) throw new Error(memberError.message);
  return room;
}

export async function listWatchPartyMembers(roomId: string): Promise<WatchPartyMember[]> {
  const { data, error } = await createClient().from("watch_party_members").select("*").eq("room_id", roomId).order("joined_at");
  if (error) throw new Error(error.message);
  return (data as WatchPartyMember[] | null) ?? [];
}

export async function updateWatchPartyMedia(roomId: string, media: WatchPartyMedia): Promise<void> {
  const { error } = await createClient()
    .from("watch_party_rooms")
    .update({
      media_key: media.mediaKey,
      title: media.title,
      media_type: media.mediaType,
      season: media.season,
      episode: media.episode,
      watch_path: media.watchPath,
      updated_at: new Date().toISOString(),
    })
    .eq("id", roomId);
  if (error) throw new Error(error.message);
}

export async function leaveWatchParty(room: WatchPartyRoom): Promise<void> {
  const supabase = createClient();
  const userId = await requireUserId();
  if (room.host_id === userId) {
    const { error } = await supabase.from("watch_party_rooms").update({ status: "ended", updated_at: new Date().toISOString() }).eq("id", room.id);
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await supabase.from("watch_party_members").delete().eq("room_id", room.id).eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function inviteFriendToWatchParty(roomId: string, recipientId: string): Promise<void> {
  const supabase = createClient();
  const senderId = await requireUserId();
  const { error } = await supabase
    .from("watch_party_invites")
    .upsert({ room_id: roomId, sender_id: senderId, recipient_id: recipientId, status: "pending", updated_at: new Date().toISOString() }, { onConflict: "room_id,recipient_id" });
  if (error) throw new Error(error.message);
}

export async function listPendingWatchPartyInvites(): Promise<WatchPartyInvite[]> {
  const supabase = createClient();
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("watch_party_invites")
    .select("*, room:watch_party_rooms(*)")
    .eq("recipient_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data as unknown as WatchPartyInvite[] | null) ?? []).filter((invite) => invite.room?.status === "active");
}

export async function answerWatchPartyInvite(invite: WatchPartyInvite, accept: boolean): Promise<WatchPartyRoom | null> {
  const supabase = createClient();
  const { error } = await supabase.from("watch_party_invites").update({ status: accept ? "accepted" : "declined", updated_at: new Date().toISOString() }).eq("id", invite.id);
  if (error) throw new Error(error.message);
  if (!accept || !invite.room) return null;
  return joinWatchParty(invite.room.code);
}
