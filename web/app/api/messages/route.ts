import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { data: rows, error } = await supabase.from("conversations").select("*").order("updated_at", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const conversations = rows ?? [];
  const ids = conversations.map((row) => String(row.id));
  if (!ids.length) return NextResponse.json({ conversations: [], unreadCount: 0 });
  const { data: memberRows } = await supabase.from("conversation_members").select("*").in("conversation_id", ids);
  const members = memberRows ?? [];
  const profileIds = [...new Set(members.map((row) => String(row.user_id)))];
  const { data: profiles } = await supabase.from("profiles").select("id, username, avatar_url").in("id", profileIds);
  const profileMap = new Map((profiles ?? []).map((profile) => [String(profile.id), profile]));

  const enriched = await Promise.all(conversations.map(async (conversation) => {
    const conversationId = String(conversation.id);
    const conversationMembers = members.filter((member) => member.conversation_id === conversationId).map((member) => ({ ...member, profile: profileMap.get(String(member.user_id)) ?? null }));
    const mine = conversationMembers.find((member) => member.user_id === user.id);
    const [{ data: latest }, unread] = await Promise.all([
      supabase.from("messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      mine?.status === "active" ? supabase.from("messages").select("id", { count: "exact", head: true }).eq("conversation_id", conversationId).neq("sender_id", user.id).gt("created_at", mine.last_read_at ?? mine.joined_at ?? conversation.created_at) : Promise.resolve({ count: 0 }),
    ]);
    const other = conversationMembers.find((member) => member.user_id !== user.id)?.profile;
    return { ...conversation, members: conversationMembers, latestMessage: latest ?? null, unreadCount: unread.count ?? 0, title: conversation.type === "group" ? conversation.name : other?.username ?? "PBox friend" };
  }));
  return NextResponse.json({ conversations: enriched, unreadCount: enriched.reduce((sum, conversation) => sum + conversation.unreadCount, 0) });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const limit = rateLimit(request, `create-conversation:${user.id}`, 12, 10 * 60_000);
  if (!limit.ok) return tooManyRequests(limit);
  const body = (await request.json().catch(() => null)) as { type?: string; friendId?: string; friendIds?: string[]; name?: string } | null;
  if (body?.type === "direct" && typeof body.friendId === "string") {
    const { data, error } = await supabase.rpc("create_direct_conversation", { p_friend_id: body.friendId });
    if (error) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ id: data });
  }
  if (body?.type === "group" && typeof body.name === "string" && Array.isArray(body.friendIds) && body.friendIds.length <= 19) {
    const { data, error } = await supabase.rpc("create_group_conversation", { p_name: body.name, p_friend_ids: body.friendIds });
    if (error) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ id: data });
  }
  return NextResponse.json({ error: "Invalid conversation request" }, { status: 400 });
}
