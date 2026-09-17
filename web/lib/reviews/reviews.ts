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
  is_spoiler: boolean;
  helpful_count: number;
  helpful_by_me: boolean;
  is_friend: boolean;
}

interface ReviewRow {
  id: string;
  media_key: string;
  user_id: string;
  rating: number | null;
  body: string;
  created_at: string;
  updated_at: string;
  is_spoiler: boolean;
  profiles: { username: string | null; avatar_url: string | null } | null;
  review_helpful: { user_id: string }[] | null;
}

/** Builds the review key for a whole title, or a specific episode within it. */
export function episodeMediaKey(itemId: string, episodeNumber: number): string {
  return `${itemId}::ep${episodeNumber}`;
}

export async function listReviews(mediaKey: string): Promise<Review[]> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id ?? null;
  const reviewsQuery = supabase
    .from("reviews")
    .select("id, media_key, user_id, rating, body, created_at, updated_at, is_spoiler, profiles(username, avatar_url), review_helpful(user_id)")
    .eq("media_key", mediaKey)
    .order("created_at", { ascending: false });
  const friendshipsQuery = uid
    ? supabase
        .from("friendships")
        .select("requester, addressee")
        .eq("status", "accepted")
        .or(`requester.eq.${uid},addressee.eq.${uid}`)
    : Promise.resolve({ data: [], error: null });
  const [{ data, error }, { data: friendships, error: friendshipsError }] = await Promise.all([reviewsQuery, friendshipsQuery]);
  if (error) throw new Error(error.message);
  if (friendshipsError) throw new Error(friendshipsError.message);
  const friendIds = new Set(
    ((friendships as { requester: string; addressee: string }[] | null) ?? []).map((friendship) =>
      friendship.requester === uid ? friendship.addressee : friendship.requester
    )
  );
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
    is_spoiler: r.is_spoiler,
    helpful_count: r.review_helpful?.length ?? 0,
    helpful_by_me: uid ? Boolean(r.review_helpful?.some((vote) => vote.user_id === uid)) : false,
    is_friend: friendIds.has(r.user_id),
  }));
}

export async function upsertReview(mediaKey: string, body: string, rating: number | null, isSpoiler = false): Promise<void> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Sign in to leave a review");
  const { error } = await supabase
    .from("reviews")
    .upsert({ media_key: mediaKey, user_id: uid, body, rating, is_spoiler: isSpoiler }, { onConflict: "media_key,user_id" });
  if (error) throw new Error(error.message);
}

export async function setReviewHelpful(reviewId: string, helpful: boolean): Promise<void> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Sign in to mark reviews helpful");
  const request = helpful
    ? supabase.from("review_helpful").upsert({ review_id: reviewId, user_id: uid }, { onConflict: "review_id,user_id", ignoreDuplicates: true })
    : supabase.from("review_helpful").delete().eq("review_id", reviewId).eq("user_id", uid);
  const { error } = await request;
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
