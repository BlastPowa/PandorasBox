import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { NotificationFilter } from "@/lib/social/types";

const FILTERS = new Set<NotificationFilter>(["all", "unread", "shares", "friends", "messages"]);

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const url = new URL(request.url);
  const requested = url.searchParams.get("filter") as NotificationFilter | null;
  const filter = requested && FILTERS.has(requested) ? requested : "all";
  const cursor = url.searchParams.get("cursor");
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 25));

  let query = supabase.from("notifications").select("*").eq("user_id", user.id)
    .is("dismissed_at", null).order("created_at", { ascending: false }).limit(limit + 1);
  if (filter === "unread") query = query.is("read_at", null);
  if (filter === "shares") query = query.eq("type", "share_received");
  if (filter === "friends") query = query.in("type", ["friend_request", "friend_accepted"]);
  if (filter === "messages") query = query.in("type", ["group_invitation", "message_received"]);
  if (cursor) query = query.lt("created_at", cursor);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const page = (data ?? []).slice(0, limit) as Record<string, unknown>[];

  const actorIds = [...new Set(page.map((row) => row.actor_id).filter((id): id is string => typeof id === "string"))];
  const shareIds = [...new Set(page.map((row) => row.share_id).filter((id): id is string => typeof id === "string"))];
  const conversationIds = [...new Set(page.map((row) => row.conversation_id).filter((id): id is string => typeof id === "string"))];
  const messageIds = [...new Set(page.map((row) => row.message_id).filter((id): id is string => typeof id === "string"))];
  const [{ data: actors }, { data: shares }, { data: conversations }, { data: messages }, { count: unreadCount }] = await Promise.all([
    actorIds.length ? supabase.from("profiles").select("id, username, avatar_url").in("id", actorIds) : Promise.resolve({ data: [] }),
    shareIds.length ? supabase.from("social_shares").select("*").in("id", shareIds) : Promise.resolve({ data: [] }),
    conversationIds.length ? supabase.from("conversations").select("id, type, name").in("id", conversationIds) : Promise.resolve({ data: [] }),
    messageIds.length ? supabase.from("messages").select("id, body, shared_entity, media_attachment, deleted_at").in("id", messageIds) : Promise.resolve({ data: [] }),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null).is("dismissed_at", null),
  ]);
  const actorMap = new Map((actors ?? []).map((actor) => [String(actor.id), actor]));
  const shareMap = new Map((shares ?? []).map((share) => [String(share.id), share]));
  const conversationMap = new Map((conversations ?? []).map((conversation) => [String(conversation.id), conversation]));
  const messageMap = new Map((messages ?? []).map((message) => [String(message.id), message]));
  return NextResponse.json({
    notifications: page.map((row) => ({ ...row, actor: actorMap.get(String(row.actor_id)) ?? null, share: shareMap.get(String(row.share_id)) ?? null, conversation: conversationMap.get(String(row.conversation_id)) ?? null, message: messageMap.get(String(row.message_id)) ?? null })),
    unreadCount: unreadCount ?? 0,
    nextCursor: (data?.length ?? 0) > limit ? String(page.at(-1)?.created_at ?? "") : null,
  });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { id?: string; action?: "read" | "dismiss" | "read_all" } | null;
  if (!body?.action) return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  const rpc = body.action === "read_all" ? "mark_all_notifications_read"
    : body.action === "read" ? "mark_notification_read" : "dismiss_notification";
  if (body.action !== "read_all" && !body.id) return NextResponse.json({ error: "Notification ID required" }, { status: 400 });
  const args = body.action === "read_all" ? {} : { p_notification_id: body.id };
  const { error } = await supabase.rpc(rpc, args);
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json({ ok: true });
}
