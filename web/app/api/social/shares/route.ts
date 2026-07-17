import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { shareHref, type ShareEntity, type ShareFilter } from "@/lib/social/types";
import { sendPushToUsers } from "@/lib/push/send";

const MEDIA_TYPES = new Set(["movie", "series", "anime", "manga", "manhwa", "comic", "game"]);
const FILTERS = new Set<ShareFilter>(["all", "unread", "collections", "titles"]);

function validEntity(value: unknown): value is ShareEntity {
  if (!value || typeof value !== "object") return false;
  const e = value as Record<string, unknown>;
  if (e.kind === "collection") {
    return typeof e.collectionId === "string" && typeof e.title === "string";
  }
  return e.kind === "title" && typeof e.mediaKey === "string" && typeof e.mediaType === "string"
    && MEDIA_TYPES.has(e.mediaType) && typeof e.source === "string" && typeof e.sourceId === "string"
    && typeof e.title === "string";
}

function safeArtwork(value: string | null | undefined) {
  return value && /^https:\/\//i.test(value) ? value.slice(0, 1000) : null;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const limit = rateLimit(request, `social-share:${user.id}`, 12, 10 * 60_000);
  if (!limit.ok) return tooManyRequests(limit);

  const body = (await request.json().catch(() => null)) as {
    entity?: unknown; recipientIds?: unknown; message?: unknown;
  } | null;
  if (!validEntity(body?.entity)) return NextResponse.json({ error: "Invalid share" }, { status: 400 });
  const recipientIds = Array.isArray(body.recipientIds)
    ? [...new Set(body.recipientIds.filter((id): id is string => typeof id === "string"))]
    : [];
  if (recipientIds.length < 1 || recipientIds.length > 10) {
    return NextResponse.json({ error: "Choose between 1 and 10 friends" }, { status: 400 });
  }
  if (recipientIds.includes(user.id)) return NextResponse.json({ error: "You cannot share with yourself" }, { status: 400 });
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (message.length > 500) return NextResponse.json({ error: "Messages are limited to 500 characters" }, { status: 400 });

  const entity = body.entity;
  let snapshot: {
    entityType: "collection" | "title"; collectionId: string | null; mediaKey: string | null;
    mediaType: string | null; source: string | null; title: string; year: number | null;
    posterUrl: string | null; href: string;
  };

  if (entity.kind === "collection") {
    const { data: collection, error } = await supabase.from("collections")
      .select("id, user_id, name, cover_url, share_slug")
      .eq("id", entity.collectionId).eq("user_id", user.id).maybeSingle();
    if (error || !collection) return NextResponse.json({ error: "Collection not found or access denied" }, { status: 404 });
    snapshot = {
      entityType: "collection", collectionId: collection.id as string, mediaKey: null,
      mediaType: null, source: null, title: String(collection.name).slice(0, 200), year: null,
      posterUrl: safeArtwork(collection.cover_url as string | null),
      href: `/c/${encodeURIComponent(String(collection.share_slug))}`,
    };
  } else {
    if (!entity.title.trim() || entity.title.length > 200 || entity.source.length > 32 || entity.sourceId.length > 100) {
      return NextResponse.json({ error: "Invalid title share" }, { status: 400 });
    }
    snapshot = {
      entityType: "title", collectionId: null, mediaKey: entity.mediaKey, mediaType: entity.mediaType,
      source: entity.source, title: entity.title.trim(), year: entity.year ?? null,
      posterUrl: safeArtwork(entity.posterUrl), href: shareHref(entity),
    };
  }

  const delivered: { recipientId: string; shareId: string }[] = [];
  const failed: { recipientId: string; error: string }[] = [];
  for (const recipientId of recipientIds) {
    const { data, error } = await supabase.rpc("deliver_social_share", {
      p_recipient_id: recipientId,
      p_entity_type: snapshot.entityType,
      p_collection_id: snapshot.collectionId,
      p_media_key: snapshot.mediaKey,
      p_media_type: snapshot.mediaType,
      p_source: snapshot.source,
      p_title: snapshot.title,
      p_year: snapshot.year,
      p_poster_url: snapshot.posterUrl,
      p_href: snapshot.href,
      p_message: message || null,
    });
    if (error) failed.push({ recipientId, error: error.message });
    else delivered.push({ recipientId, shareId: String(data) });
  }
  if (delivered.length) {
    const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).maybeSingle();
    const note = message ? ` — ${message}` : "";
    await sendPushToUsers(delivered.map((item) => item.recipientId), "share", {
      title: `${profile?.username ?? "Someone"} shared ${snapshot.title}`,
      body: (`Open it on PBox${note}`).slice(0, 180), url: "/friends?tab=shared", tag: `share-${delivered[0]?.shareId ?? snapshot.mediaKey ?? snapshot.collectionId}`,
    });
  }
  return NextResponse.json({ delivered, failed }, { status: delivered.length ? 200 : 400 });
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const box = request.nextUrl.searchParams.get("box") === "sent" ? "sent" : "received";
  const requestedFilter = request.nextUrl.searchParams.get("filter") as ShareFilter | null;
  const filter = requestedFilter && FILTERS.has(requestedFilter) ? requestedFilter : "all";
  const cursor = request.nextUrl.searchParams.get("cursor");
  let query = supabase.from("social_shares").select("*")
    .eq(box === "received" ? "recipient_id" : "sender_id", user.id)
    .order("created_at", { ascending: false }).limit(26);
  if (box === "received") query = query.is("dismissed_at", null);
  if (filter === "unread") query = query.is("read_at", null).is("revoked_at", null);
  if (filter === "collections") query = query.eq("entity_type", "collection");
  if (filter === "titles") query = query.eq("entity_type", "title");
  if (cursor) query = query.lt("created_at", cursor);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const page = (data ?? []).slice(0, 25) as Record<string, unknown>[];
  const profileIds = [...new Set(page.flatMap((row) => [String(row.sender_id), String(row.recipient_id)]))];
  const { data: profiles } = profileIds.length
    ? await supabase.from("profiles").select("id, username, avatar_url").in("id", profileIds)
    : { data: [] };
  const byId = new Map((profiles ?? []).map((p) => [String(p.id), p]));
  const shares = page.map((row) => ({
    ...row,
    sender: byId.get(String(row.sender_id)) ?? null,
    recipient: byId.get(String(row.recipient_id)) ?? null,
  }));
  return NextResponse.json({
    shares,
    nextCursor: (data?.length ?? 0) > 25 ? String(page.at(-1)?.created_at ?? "") : null,
  });
}
