import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const RPC = {
  read: "mark_social_share_read",
  dismiss: "dismiss_social_share",
  revoke: "revoke_social_share",
} as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { action?: keyof typeof RPC } | null;
  if (!body?.action || !RPC[body.action]) return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  const { error } = await supabase.rpc(RPC[body.action], { p_share_id: id });
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json({ ok: true });
}
