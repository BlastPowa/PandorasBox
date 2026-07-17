import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface Preferences { messages?: boolean; shares?: boolean; friends?: boolean; groups?: boolean; }
interface SubscriptionInput { endpoint?: string; keys?: { p256dh?: string; auth?: string }; preferences?: Preferences; }

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  return NextResponse.json({ configured: Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY), publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as SubscriptionInput | null;
  if (!body?.endpoint?.startsWith("https://") || !body.keys?.p256dh || !body.keys.auth) return NextResponse.json({ error: "Invalid push subscription" }, { status: 400 });
  if (body.endpoint.length > 2000 || body.keys.p256dh.length > 500 || body.keys.auth.length > 500) return NextResponse.json({ error: "Invalid push subscription" }, { status: 400 });
  const preferences = body.preferences ?? {};
  const { error } = await supabase.from("push_subscriptions").upsert({
    user_id: user.id, endpoint: body.endpoint, p256dh: body.keys.p256dh, auth: body.keys.auth,
    messages_enabled: preferences.messages ?? true, shares_enabled: preferences.shares ?? true,
    friends_enabled: preferences.friends ?? true, groups_enabled: preferences.groups ?? true,
    user_agent: request.headers.get("user-agent")?.slice(0, 500) ?? null, updated_at: new Date().toISOString(),
  }, { onConflict: "endpoint" });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { endpoint?: string; preferences?: Preferences } | null;
  if (!body?.endpoint || !body.preferences) return NextResponse.json({ error: "Invalid preferences" }, { status: 400 });
  const { error } = await supabase.from("push_subscriptions").update({
    messages_enabled: body.preferences.messages ?? true, shares_enabled: body.preferences.shares ?? true,
    friends_enabled: body.preferences.friends ?? true, groups_enabled: body.preferences.groups ?? true,
    updated_at: new Date().toISOString(),
  }).eq("user_id", user.id).eq("endpoint", body.endpoint);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const endpoint = new URL(request.url).searchParams.get("endpoint");
  if (!endpoint) return NextResponse.json({ error: "Endpoint required" }, { status: 400 });
  const { error } = await supabase.from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", endpoint);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
