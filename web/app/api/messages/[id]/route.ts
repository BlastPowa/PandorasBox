import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { sendPushToUsers } from "@/lib/push/send";
import type { MessageMedia, MessageReplyPreview, MessageShareCard } from "@/lib/messages/types";

function validShare(value: unknown): value is MessageShareCard {
  if (!value || typeof value !== "object") return false;
  const card = value as Record<string, unknown>;
  return (card.kind === "title" || card.kind === "collection")
    && typeof card.title === "string" && card.title.trim().length > 0 && card.title.length <= 200
    && typeof card.href === "string" && card.href.startsWith("/") && card.href.length <= 500
    && (card.posterUrl == null || (typeof card.posterUrl === "string" && card.posterUrl.startsWith("https://")));
}

function validMedia(value: unknown, conversationId: string, userId: string): value is MessageMedia {
  if (!value || typeof value !== "object") return false;
  const media = value as Record<string, unknown>;
  if (!['image', 'gif', 'sticker'].includes(String(media.kind)) || !['upload', 'giphy', 'builtin'].includes(String(media.provider))) return false;
  if (media.provider === "upload") return typeof media.storagePath === "string" && media.storagePath.startsWith(`${conversationId}/${userId}/`);
  if (media.provider === "giphy") return typeof media.url === "string" && /^https:\/\/([a-z0-9-]+\.)?giphy\.com\//i.test(media.url);
  return media.kind === "sticker" && typeof media.sticker === "string" && media.sticker.length >= 1 && media.sticker.length <= 16;
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
  const replyIds = [...new Set(page.map((message) => message.reply_to_id).filter((replyId): replyId is string => Boolean(replyId)))];
  const { data: replyRows } = replyIds.length
    ? await supabase.from("messages").select("id,sender_id,body,shared_entity,media_attachment,deleted_at").in("id", replyIds)
    : { data: [] };
  const storagePaths = [...page, ...(replyRows ?? [])].map((message) => (message.media_attachment as { storagePath?: string } | null)?.storagePath).filter((path): path is string => Boolean(path));
  const { data: signedMedia } = storagePaths.length ? await supabase.storage.from("message-media").createSignedUrls(storagePaths, 60 * 60) : { data: [] };
  const signedByPath = new Map((signedMedia ?? []).map((item) => [item.path, item.signedUrl]));
  const replyMap = new Map((replyRows ?? []).map((reply) => {
    const media = reply.media_attachment as MessageMedia | null;
    const hydratedReply: MessageReplyPreview = {
      ...reply,
      shared_entity: reply.shared_entity as MessageShareCard | null,
      media_attachment: media?.storagePath ? { ...media, url: signedByPath.get(media.storagePath) ?? undefined } : media,
    };
    return [reply.id, hydratedReply];
  }));
  const hydratedPage = page.map((message) => {
    const media = message.media_attachment as MessageMedia | null;
    return {
      ...message,
      media_attachment: media?.storagePath ? { ...media, url: signedByPath.get(media.storagePath) ?? undefined } : media,
      reply: message.reply_to_id ? replyMap.get(message.reply_to_id) ?? null : null,
    };
  });
  const mine = members.find((member) => member.user_id === user.id);
  const other = members.find((member) => member.user_id !== user.id);
  const { data: signedBackground } = mine?.chat_background_path
    ? await supabase.storage.from("chat-backgrounds").createSignedUrl(String(mine.chat_background_path), 60 * 60)
    : { data: null };
  return { supabase, user, value: {
    ...conversation,
    title: conversation.type === "group" ? conversation.name : profileMap.get(String(other?.user_id))?.username ?? "PBox friend",
    members: members.map((member) => ({ ...member, profile: profileMap.get(String(member.user_id)) ?? null })),
    latestMessage: hydratedPage[0] ?? null,
    unreadCount: 0,
    messages: hydratedPage.slice(0, 50).reverse(),
    nextCursor: page.length > 50 ? String(page[49]?.created_at ?? "") : null,
    chatBackgroundUrl: signedBackground?.signedUrl ?? null,
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
  const body = (await request.json().catch(() => null)) as { body?: string; share?: unknown; media?: unknown; replyToId?: unknown } | null;
  const text = typeof body?.body === "string" ? body.body : "";
  const share = body?.share == null ? null : body.share;
  const media = body?.media == null ? null : body.media;
  const replyToId = body?.replyToId == null ? null : body.replyToId;
  if (!text.trim() && !validShare(share) && !validMedia(media, id, user.id)) return NextResponse.json({ error: "Message or attachment required" }, { status: 400 });
  if (share != null && !validShare(share)) return NextResponse.json({ error: "Invalid shared card" }, { status: 400 });
  if (media != null && !validMedia(media, id, user.id)) return NextResponse.json({ error: "Invalid media attachment" }, { status: 400 });
  if (replyToId != null && (typeof replyToId !== "string" || replyToId.length > 100)) return NextResponse.json({ error: "Invalid reply target" }, { status: 400 });
  if (share && media) return NextResponse.json({ error: "Send one attachment at a time" }, { status: 400 });
  const { data, error } = await supabase.rpc("send_message_v2", {
    p_conversation_id: id,
    p_body: text,
    p_shared_entity: share,
    p_media: media,
    p_reply_to_id: replyToId,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  const [{ data: conversation }, { data: memberships }, { data: profile }] = await Promise.all([
    supabase.from("conversations").select("name, type").eq("id", id).maybeSingle(),
    supabase.from("conversation_members").select("user_id, muted_at").eq("conversation_id", id).eq("status", "active").neq("user_id", user.id),
    supabase.from("profiles").select("username").eq("id", user.id).maybeSingle(),
  ]);
  const sender = profile?.username ?? "Someone";
  await sendPushToUsers((memberships ?? []).filter((member) => !member.muted_at).map((member) => String(member.user_id)), "message", {
    title: conversation?.type === "group" ? String(conversation.name ?? "PBox group") : `${sender} on PBox`,
    body: (text.trim() || (media ? media.kind === "sticker" ? "Sent a sticker" : media.kind === "gif" ? "Sent a GIF" : "Sent an image" : `Shared ${share?.title ?? "a card"}`)).slice(0, 160), url: `/messages/${id}`, tag: `conversation-${id}`,
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
    background: { fn: "set_chat_background", args: { p_conversation_id: id, p_storage_path: typeof body?.storagePath === "string" ? body.storagePath : "", p_position: ["top", "center", "bottom"].includes(String(body?.position)) ? body?.position : "center", p_atmosphere: ["midnight", "crimson", "aurora", "ocean", "sunset", "royal"].includes(String(body?.atmosphere)) ? body?.atmosphere : "midnight" } },
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
