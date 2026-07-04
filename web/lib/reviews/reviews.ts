"use client";

import { createClient } from "@/lib/supabase/client";

export interface Review {
  id: string;
  media_key: string;
  user_id: string;
  rating: number | null;
  body: string;
  created_at: string;
  updated_at: string;
  username: string;
  avatar_url: string | null;
}

interface ReviewRow {
  id: string;
  media_key: string;
  user_id: string;
  rating: number | null;
  body: string;
  created_at: string;
  updated_at: string;
  profiles: { username: string | null; avatar_url: string | null } | null;
}

/** Builds the review key for a whole title, or a specific episode within it. */
export function episodeMediaKey(itemId: string, episodeNumber: number): string {
  return `${itemId}::ep${episodeNumber}`;
}

export async function listReviews(mediaKey: string): Promise<Review[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("id, media_key, user_id, rating, body, created_at, updated_at, profiles(username, avatar_url)")
    .eq("media_key", mediaKey)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data as unknown as ReviewRow[] | null) ?? []).map((r) => ({
    id: r.id,
    media_key: r.media_key,
    user_id: r.user_id,
    rating: r.rating,
    body: r.body,
    created_at: r.created_at,
    updated_at: r.updated_at,
    username: r.profiles?.username ?? "Anonymous",
    avatar_url: r.profiles?.avatar_url ?? null,
  }));
}

export async function upsertReview(mediaKey: string, body: string, rating: number | null): Promise<void> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Sign in to leave a review");
  const { error } = await supabase
    .from("reviews")
    .upsert({ media_key: mediaKey, user_id: uid, body, rating }, { onConflict: "media_key,user_id" });
  if (error) throw new Error(error.message);
}

export async function deleteReview(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("reviews").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function getCurrentUserId(): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}
