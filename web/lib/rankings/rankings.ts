"use client";

import { createClient } from "@/lib/supabase/client";
import type { ReelItemType } from "@core/storage/schema";

export type RankingCategory = ReelItemType;

export interface RankingEntry {
  id: string;
  item_id: string;
  category: RankingCategory;
  title: string;
  poster_url: string | null;
  position: number;
}

export async function listRankings(category: RankingCategory): Promise<RankingEntry[]> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return [];
  const { data, error } = await supabase
    .from("user_rankings")
    .select("id, item_id, category, title, poster_url, position")
    .eq("user_id", uid)
    .eq("category", category)
    .order("position", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as RankingEntry[] | null) ?? [];
}

export async function addToRanking(
  category: RankingCategory,
  itemId: string,
  title: string,
  posterUrl: string | null
): Promise<void> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Sign in required");

  const { data: existing } = await supabase
    .from("user_rankings")
    .select("position")
    .eq("user_id", uid)
    .eq("category", category)
    .order("position", { ascending: false })
    .limit(1);
  const maxPos = ((existing as { position: number }[] | null) ?? [])[0]?.position ?? 0;

  const { error } = await supabase.from("user_rankings").upsert(
    { user_id: uid, category, item_id: itemId, title, poster_url: posterUrl, position: maxPos + 1 },
    { onConflict: "user_id,category,item_id" }
  );
  if (error) throw new Error(error.message);
}

export async function removeFromRanking(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("user_rankings").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Swaps the ordering position between two ranking rows (used for up/down reorder). */
export async function swapRankingPositions(a: RankingEntry, b: RankingEntry): Promise<void> {
  const supabase = createClient();
  const { error: e1 } = await supabase.from("user_rankings").update({ position: b.position }).eq("id", a.id);
  if (e1) throw new Error(e1.message);
  const { error: e2 } = await supabase.from("user_rankings").update({ position: a.position }).eq("id", b.id);
  if (e2) throw new Error(e2.message);
}
