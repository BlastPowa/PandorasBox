import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { sendPushToUsers } from "@/lib/push/send";
import type { MessageShareCard } from "@/lib/messages/types";

function validShare(value: unknown): value is MessageShareCard {
  if (!value || typeof value !== "object") return false;
  const card = value as Record<string, unknown>;
  return (card.kind === "title" || card.kind === "collection")
    && typeof card.title === "string" && card.title.trim().length > 0 && card.title.length <= 200
    && typeof card.href === "string" && card.href.startsWith("/") && card.href.length <= 500
    && (card.posterUrl == null || (typeof card.posterUrl === "string" && card.posterUrl.startsWith("https://")));
}

async function detail(id: string, cursor?: string | null) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { response: NextResponse.json({ error: "Sign in required" }, { status: 401 }) };
  const { data: conversation, error } = await supabase.from("conversations").select("*").eq("id", id).maybeSingle();
  if (error || !conversation) return { response: NextResponse.json({ error: "Conversation not found" }, { status: 404 }) };
  const { data: memberRows } = await supabase.from("conversation_members").select("*").eq("conversation_id", id);
  const members = memberRows ?? [];
  const ids = members.map((member) => String(member.user_id));
  const { data: profiles } = ids.length ? await supabase.from("profiles").select("id, username, avatar_url").in("id", ids) : { data: [] };
  const profileMap = new Map((profiles ?? []).map((profile) => [String(profile.id), profile]));
  let query = supabase.from("messages").select("*").eq("conversation_id", id).order("created_at", { ascending: false }).limit(51);
  if (cursor) query = query.lt("created_at", cursor);
  const { data: messageRows } = await query;
  const page = messageRows ?? [];
  const mine = members.find((member) => member.user_id === user.id);
  const other = members.find((member) => member.user_id !== user.id);
  return { supabase, user, value: {
    ...conversation,
    title: conversation.type === "group" ? conversation.name : profileMap.get(String(other?.user_id))?.username ?? "PBox friend",
    members: members.map((member) => ({ ...member, profile: profileMap.get(String(member.user_id)) ?? null })),
    latestMessage: page[0] ?? null,
    unreadCount: 0,
    messages: page.slice(0, 50).reverse(),
    nextCursor: page.length > 50 ? String(page[49]?.created_at ?? "") : null,
    mine,
  } };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await detail(id, request.nextUrl.searchParams.get("cursor"));
  return result.response ?? NextResponse.json(result.value);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const limit = rateLimit(request, `send-message:${user.id}`, 30, 60_000);
  if (!limit.ok) return tooManyRequests(limit);
  const body = (await request.json().catch(() => null)) as { body?: string; share?: unknown } | null;
  const text = typeof body?.body === "string" ? body.body : "";
  const share = body?.share == null ? null : body.share;
  if (!text.trim() && !validShare(share)) return NextResponse.json({ error: "Message or shared card required" }, { status: 400 });
  if (share != null && !validShare(share)) return NextResponse.json({ error: "Invalid shared card" }, { status: 400 });
  const { data, error } = share
    ? await supabase.rpc("send_shared_message", { p_conversation_id: id, p_body: text, p_shared_entity: share })
    : await supabase.rpc("send_message", { p_conversation_id: id, p_body: text });
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  const [{ data: conversation }, { data: memberships }, { data: profile }] = await Promise.all([
    supabase.from("conversations").select("name, type").eq("id", id).maybeSingle(),
    supabase.from("conversation_members").select("user_id, muted_at").eq("conversation_id", id).eq("status", "active").neq("user_id", user.id),
    supabase.from("profiles").select("username").eq("id", user.id).maybeSingle(),
  ]);
  const sender = profile?.username ?? "Someone";
  await sendPushToUsers((memberships ?? []).filter((member) => !member.muted_at).map((member) => String(member.user_id)), "message", {
    title: conversation?.type === "group" ? String(conversation.name ?? "PBox group") : `${sender} on PBox`,
    body: (text.trim() || `Shared ${share?.title ?? "a card"}`).slice(0, 160), url: `/messages/${id}`, tag: `conversation-${id}`,
  });
  return NextResponse.json({ id: data });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const action = body?.action;
  const calls: Record<string, { fn: string; args: Record<string, unknown> }> = {
    read: { fn: "mark_conversation_read", args: { p_conversation_id: id } },
    mute: { fn: "set_conversation_muted", args: { p_conversation_id: id, p_muted: Boolean(body?.muted) } },
    accept: { fn: "respond_group_invitation", args: { p_conversation_id: id, p_accept: true } },
    decline: { fn: "respond_group_invitation", args: { p_conversation_id: id, p_accept: false } },
    invite: { fn: "invite_group_members", args: { p_conversation_id: id, p_friend_ids: Array.isArray(body?.friendIds) ? body.friendIds : [] } },
    transfer: { fn: "transfer_group_ownership", args: { p_conversation_id: id, p_new_owner: body?.userId } },
    leave: { fn: "leave_group_conversation", args: { p_conversation_id: id } },
    remove: { fn: "remove_group_member", args: { p_conversation_id: id, p_member_id: body?.userId } },
    archive: { fn: "archive_group_conversation", args: { p_conversation_id: id } },
    avatar: { fn: "set_group_avatar", args: { p_conversation_id: id, p_avatar_url: typeof body?.avatarUrl === "string" ? body.avatarUrl : "" } },
  };
  if (typeof action !== "string" || !calls[action]) return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  const call = calls[action];
  const { error } = await supabase.rpc(call.fn, call.args);
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  if (action === "invite" && Array.isArray(body?.friendIds)) {
    const [{ data: conversation }, { data: profile }] = await Promise.all([
      supabase.from("conversations").select("name").eq("id", id).maybeSingle(),
      supabase.from("profiles").select("username").eq("id", user.id).maybeSingle(),
    ]);
    await sendPushToUsers(body.friendIds.filter((value): value is string => typeof value === "string"), "group", {
      title: "PBox group invitation", body: `${profile?.username ?? "Someone"} invited you to ${conversation?.name ?? "a group"}`,
      url: `/messages/${id}`, tag: `group-invite-${id}`,
    });
  }
  return NextResponse.json({ ok: true });
}
