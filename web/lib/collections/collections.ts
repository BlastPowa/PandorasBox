"use client";

import { createClient } from "@/lib/supabase/client";

export interface Collection {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  is_public: boolean;
  created_at: string;
}

export async function listCollections(): Promise<Collection[]> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return [];
  const { data, error } = await supabase
    .from("collections")
    .select("id, name, description, cover_url, is_public, created_at")
    .eq("user_id", uid)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as Collection[] | null) ?? [];
}

export async function createCollection(name: string, description: string, isPublic: boolean): Promise<Collection> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Sign in required");
  const { data, error } = await supabase
    .from("collections")
    .insert({ user_id: uid, name, description: description || null, is_public: isPublic })
    .select("id, name, description, cover_url, is_public, created_at")
    .single();
  if (error) throw new Error(error.message);
  return data as Collection;
}

export async function deleteCollection(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("collections").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function getCollection(id: string): Promise<Collection | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("collections")
    .select("id, name, description, cover_url, is_public, created_at")
    .eq("id", id)
    .maybeSingle();
  return (data as Collection | null) ?? null;
}

export async function getCollectionItemIds(collectionId: string): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("collection_items")
    .select("item_id, added_at")
    .eq("collection_id", collectionId)
    .order("added_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data as { item_id: string }[] | null) ?? []).map((r) => r.item_id);
}

export async function addItemToCollection(collectionId: string, itemId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("collection_items")
    .upsert({ collection_id: collectionId, item_id: itemId }, { onConflict: "collection_id,item_id" });
  if (error) throw new Error(error.message);
}

export async function removeItemFromCollection(collectionId: string, itemId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("collection_items")
    .delete()
    .eq("collection_id", collectionId)
    .eq("item_id", itemId);
  if (error) throw new Error(error.message);
}
