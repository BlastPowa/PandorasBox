import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendPushToUsers } from "@/lib/push/send";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { kind?: "friend_request" | "friend_accepted"; targetUserId?: string } | null;
  if (!body?.targetUserId || !body.kind || body.targetUserId === user.id) return NextResponse.json({ error: "Invalid notification" }, { status: 400 });
  const { data: friendship } = await supabase.from("friendships").select("requester, addressee, status").or(`and(requester.eq.${user.id},addressee.eq.${body.targetUserId}),and(requester.eq.${body.targetUserId},addressee.eq.${user.id})`).maybeSingle();
  const valid = body.kind === "friend_request" ? friendship?.requester === user.id && friendship.status === "pending" : friendship?.addressee === user.id && friendship?.requester === body.targetUserId && friendship.status === "accepted";
  if (!valid) return NextResponse.json({ error: "Friendship event not found" }, { status: 403 });
  const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).maybeSingle();
  const name = profile?.username ?? "Someone";
  await sendPushToUsers([body.targetUserId], "friend", { title: "PBox friends", body: body.kind === "friend_request" ? `${name} sent you a friend request` : `${name} accepted your friend request`, url: body.kind === "friend_request" ? "/friends?tab=requests" : "/friends", tag: `friend-${user.id}` });
  return NextResponse.json({ ok: true });
}
