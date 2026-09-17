"use client";

import { createClient } from "@/lib/supabase/client";
import type { UnifiedSearchResult } from "@core/utils/search";

export type CollectionVisibility = "public" | "friends" | "private" | "unlisted";
export type CollectionCoverMode = "collage" | "upload" | "item";

export interface Collection {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  cover_mode: CollectionCoverMode;
  cover_item_id: string | null;
  visibility: CollectionVisibility;
  is_public: boolean;
  share_slug: string | null;
  tags: string[];
  created_at: string;
  updated_at: string | null;
}

export interface PublicCollection extends Collection {
  owner_id: string;
  owner_username: string;
  owner_avatar_url: string | null;
}

export type CollectionReactionKind = "like" | "save";

export interface CollectionReactionSummary {
  likes: number;
  saves: number;
  liked: boolean;
  saved: boolean;
}

/** A snapshotted collection item — renders without the owner's library. */
export interface CollectionItem {
  item_id: string;
  item_type: string | null;
  source: string | null;
  title: string | null;
  poster_url: string | null;
  year: number | null;
  score: number | null;
  anilist_id: number | null;
  tmdb_id: number | null;
  mangadex_id: string | null;
  added_at: string;
}

// Select all columns so the code tolerates DBs where migrations 0008/0009 haven't
// been applied yet (missing columns simply come back undefined instead of 400ing).
const COLLECTION_FIELDS = "*";

function normalize(row: Record<string, unknown>): Collection {
  const visibility = (row.visibility as CollectionVisibility | null) ??
    (row.is_public ? "public" : "private");
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    cover_url: (row.cover_url as string | null) ?? null,
    cover_mode: (row.cover_mode as CollectionCoverMode | null) ?? "collage",
    cover_item_id: (row.cover_item_id as string | null) ?? null,
    visibility,
    is_public: visibility === "public" || visibility === "unlisted" || Boolean(row.is_public),
    share_slug: (row.share_slug as string | null) ?? null,
    tags: (row.tags as string[] | null) ?? [],
    created_at: row.created_at as string,
    updated_at: (row.updated_at as string | null) ?? null,
  };
}

async function normalizePublicRows(rows: Record<string, unknown>[]): Promise<PublicCollection[]> {
  const supabase = createClient();
  const ownerIds = [...new Set(rows.map((row) => row.user_id as string).filter(Boolean))];
  const owners = new Map<string, { username: string; avatar_url: string | null }>();

  if (ownerIds.length > 0) {
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", ownerIds);
    for (const profile of (profileRows as { id: string; username: string | null; avatar_url: string | null }[] | null) ?? []) {
      owners.set(profile.id, { username: profile.username ?? "PBox user", avatar_url: profile.avatar_url ?? null });
    }
  }

  return rows.map((row) => {
    const ownerId = row.user_id as string;
    const owner = owners.get(ownerId);
    return {
      ...normalize(row),
      owner_id: ownerId,
      owner_username: owner?.username ?? "PBox user",
      owner_avatar_url: owner?.avatar_url ?? null,
    };
  });
}

export async function listCollections(): Promise<Collection[]> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return [];
  const { data, error } = await supabase
    .from("collections")
    .select(COLLECTION_FIELDS)
    .eq("user_id", uid)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data as Record<string, unknown>[] | null) ?? []).map(normalize);
}

export async function listPublicCollections(limit = 24): Promise<PublicCollection[]> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id ?? null;
  let result = await supabase
    .from("collections")
    .select(COLLECTION_FIELDS)
    .eq("visibility", "public")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (result.error && /column .* does not exist|schema cache/i.test(result.error.message)) {
    result = await supabase
      .from("collections")
      .select(COLLECTION_FIELDS)
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(limit);
  }
  if (result.error) throw new Error(result.error.message);

  const rows = ((result.data as Record<string, unknown>[] | null) ?? [])
    .filter((row) => row.user_id !== uid);
  return normalizePublicRows(rows);
}

export async function listSavedCollections(limit = 48): Promise<PublicCollection[]> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return [];

  const { data: savedRows, error: savedError } = await supabase
    .from("collection_reactions")
    .select("collection_id, created_at")
    .eq("user_id", uid)
    .eq("reaction", "save")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (savedError) throw new Error(savedError.message);

  const savedIds = ((savedRows as { collection_id: string; created_at: string }[] | null) ?? []).map((row) => row.collection_id);
  if (savedIds.length === 0) return [];

  const { data, error } = await supabase
    .from("collections")
    .select(COLLECTION_FIELDS)
    .in("id", savedIds)
    .eq("visibility", "public");
  if (error) throw new Error(error.message);

  const order = new Map(savedIds.map((id, index) => [id, index]));
  const rows = ((data as Record<string, unknown>[] | null) ?? [])
    .filter((row) => row.user_id !== uid)
    .sort((a, b) => (order.get(a.id as string) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.id as string) ?? Number.MAX_SAFE_INTEGER));
  return normalizePublicRows(rows);
}

export async function getCollectionReactionSummaries(collectionIds: string[]): Promise<Record<string, CollectionReactionSummary>> {
  if (collectionIds.length === 0) return {};
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;

  const [countsResult, ownResult] = await Promise.all([
    supabase.rpc("collection_reaction_counts", { p_collection_ids: collectionIds }),
    uid
      ? supabase
          .from("collection_reactions")
          .select("collection_id, reaction")
          .eq("user_id", uid)
          .in("collection_id", collectionIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (countsResult.error) throw new Error(countsResult.error.message);
  if (ownResult.error) throw new Error(ownResult.error.message);

  const summaries: Record<string, CollectionReactionSummary> = Object.fromEntries(
    collectionIds.map((id) => [id, { likes: 0, saves: 0, liked: false, saved: false }])
  );
  for (const row of (countsResult.data as { collection_id: string; like_count: number | string; save_count: number | string }[] | null) ?? []) {
    summaries[row.collection_id] = {
      ...(summaries[row.collection_id] ?? { likes: 0, saves: 0, liked: false, saved: false }),
      likes: Number(row.like_count ?? 0),
      saves: Number(row.save_count ?? 0),
    };
  }
  for (const row of (ownResult.data as { collection_id: string; reaction: CollectionReactionKind }[] | null) ?? []) {
    const current = summaries[row.collection_id] ?? { likes: 0, saves: 0, liked: false, saved: false };
    summaries[row.collection_id] = {
      ...current,
      liked: current.liked || row.reaction === "like",
      saved: current.saved || row.reaction === "save",
    };
  }
  return summaries;
}

export async function toggleCollectionReaction(collectionId: string, reaction: CollectionReactionKind, active: boolean): Promise<boolean> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Sign in required");

  if (active) {
    const { error } = await supabase
      .from("collection_reactions")
      .delete()
      .eq("collection_id", collectionId)
      .eq("user_id", uid)
      .eq("reaction", reaction);
    if (error) throw new Error(error.message);
    return false;
  }

  const { error } = await supabase
    .from("collection_reactions")
    .upsert({ collection_id: collectionId, user_id: uid, reaction }, { onConflict: "collection_id,user_id,reaction" });
  if (error) throw new Error(error.message);
  return true;
}

export async function createCollection(
  name: string,
  description: string,
  visibility: CollectionVisibility = "public"
): Promise<Collection> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Sign in required");
  const isPublic = visibility === "public" || visibility === "unlisted";
  const insert = supabase.from("collections");
  let res = await insert
    .insert({ user_id: uid, name, description: description || null, visibility, is_public: isPublic })
    .select(COLLECTION_FIELDS)
    .single();
  if (res.error && /column .* does not exist|schema cache/i.test(res.error.message)) {
    // visibility column not present yet (migration 0008 not run) — fall back to is_public only.
    res = await insert
      .insert({ user_id: uid, name, description: description || null, is_public: isPublic })
      .select(COLLECTION_FIELDS)
      .single();
  }
  if (res.error) throw new Error(res.error.message);
  try {
    await supabase.from("activity").insert({ user_id: uid, verb: "created_collection", title: name });
  } catch {
    // activity logging must never break collection creation
  }
  return normalize(res.data as Record<string, unknown>);
}

export async function updateCollection(
  id: string,
  patch: Partial<Pick<Collection, "name" | "description" | "visibility" | "cover_mode" | "cover_url" | "cover_item_id">>
): Promise<void> {
  const supabase = createClient();
  const body: Record<string, unknown> = { ...patch };
  if (patch.visibility) body.is_public = patch.visibility === "public" || patch.visibility === "unlisted";
  const { error } = await supabase.from("collections").update(body).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteCollection(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("collections").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function getCollection(id: string): Promise<Collection | null> {
  const supabase = createClient();
  const { data } = await supabase.from("collections").select(COLLECTION_FIELDS).eq("id", id).maybeSingle();
  return data ? normalize(data as Record<string, unknown>) : null;
}

export async function getCollectionItemIds(collectionId: string): Promise<string[]> {
  const items = await getCollectionItems(collectionId);
  return items.map((i) => i.item_id);
}

/** Snapshot rows — usable by any viewer of a visible collection. */
export async function getCollectionItems(collectionId: string): Promise<CollectionItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("collection_items")
    .select("*")
    .eq("collection_id", collectionId)
    .order("added_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data as Record<string, unknown>[] | null) ?? []).map((r) => ({
    item_id: r.item_id as string,
    item_type: (r.item_type as string | null) ?? null,
    source: (r.source as string | null) ?? null,
    title: (r.title as string | null) ?? null,
    poster_url: (r.poster_url as string | null) ?? null,
    year: (r.year as number | null) ?? null,
    score: (r.score as number | null) ?? null,
    anilist_id: (r.anilist_id as number | null) ?? null,
    tmdb_id: (r.tmdb_id as number | null) ?? null,
    mangadex_id: (r.mangadex_id as string | null) ?? null,
    added_at: r.added_at as string,
  }));
}

/** Which of the given collection ids already contain itemId. */
export async function collectionsContaining(itemId: string, collectionIds: string[]): Promise<Set<string>> {
  const supabase = createClient();
  if (collectionIds.length === 0) return new Set();
  const { data } = await supabase
    .from("collection_items")
    .select("collection_id")
    .eq("item_id", itemId)
    .in("collection_id", collectionIds);
  return new Set(((data as { collection_id: string }[] | null) ?? []).map((r) => r.collection_id));
}

/** Snapshot for storage — accepts a library item or a search result. */
interface ItemSnapshot {
  id: string;
  type: string;
  source: string;
  title: string;
  posterUrl: string | null;
  year: number | null;
  score?: number | null;
  rating?: number | null;
  anilistId: number | null;
  tmdbId: number | null;
  mangadexId: string | null;
}

export async function addItemToCollection(collectionId: string, item: ItemSnapshot | string): Promise<void> {
  const supabase = createClient();
  const row: Record<string, unknown> = { collection_id: collectionId };
  if (typeof item === "string") {
    row.item_id = item;
  } else {
    row.item_id = item.id;
    row.item_type = item.type;
    row.source = item.source;
    row.title = item.title;
    row.poster_url = item.posterUrl;
    row.year = item.year;
    row.score = item.score ?? item.rating ?? null;
    row.anilist_id = item.anilistId;
    row.tmdb_id = item.tmdbId;
    row.mangadex_id = item.mangadexId;
  }
  const { error } = await supabase
    .from("collection_items")
    .upsert(row, { onConflict: "collection_id,item_id" });
  if (error) {
    // Fall back to id-only if snapshot columns aren't present yet (migration 0009 not run).
    if (/column .* does not exist|schema cache/i.test(error.message) && typeof item !== "string") {
      const { error: e2 } = await supabase
        .from("collection_items")
        .upsert({ collection_id: collectionId, item_id: item.id }, { onConflict: "collection_id,item_id" });
      if (e2) throw new Error(e2.message);
      return;
    }
    throw new Error(error.message);
  }
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

/** Convert a snapshot row to the UnifiedSearchResult shape used by PosterGrid. */
export function snapshotToResult(i: CollectionItem): UnifiedSearchResult {
  return {
    id: i.item_id,
    source: (i.source as UnifiedSearchResult["source"]) ?? "tmdb",
    type: (i.item_type as UnifiedSearchResult["type"]) ?? "movie",
    title: i.title ?? "Untitled",
    posterUrl: i.poster_url,
    year: i.year,
    synopsis: null,
    score: i.score,
    totalEpisodes: null,
    totalChapters: null,
    anilistId: i.anilist_id,
    tmdbId: i.tmdb_id,
    mangadexId: i.mangadex_id,
    malId: null,
  };
}
