import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { action?: "edit" | "delete"; body?: string } | null;
  const fn = body?.action === "edit" ? "edit_message" : body?.action === "delete" ? "delete_message" : null;
  if (!fn) return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  const args = fn === "edit_message" ? { p_message_id: id, p_body: body?.body } : { p_message_id: id };
  const { data: existing } = fn === "delete_message"
    ? await supabase.from("messages").select("media_attachment").eq("id", id).eq("sender_id", user.id).maybeSingle()
    : { data: null };
  const { error } = await supabase.rpc(fn, args);
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  const storagePath = (existing?.media_attachment as { storagePath?: string } | null)?.storagePath;
  if (storagePath) await supabase.storage.from("message-media").remove([storagePath]);
  return NextResponse.json({ ok: true });
}
