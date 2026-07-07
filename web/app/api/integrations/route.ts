import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PROVIDERS, type ProviderId } from "@/lib/integrations/providers";

/** GET → connection state for every provider (never exposes tokens). */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const { data: rows } = await supabase
    .from("integrations")
    .select("provider, external_username, auto_sync, last_synced_at, last_sync_ok, last_error, last_failed_at, token_expires_at")
    .eq("user_id", user.id);

  const { data: log } = await supabase
    .from("sync_log")
    .select("provider, direction, ok, items_synced, message, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const { count: conflictCount } = await supabase
    .from("sync_conflicts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("resolved", false);

  const providers = (Object.keys(PROVIDERS) as ProviderId[]).map((id) => {
    const cfg = PROVIDERS[id];
    const row = rows?.find((r) => r.provider === id) ?? null;
    return {
      id,
      name: cfg.name,
      description: cfg.description,
      color: cfg.color,
      configured: Boolean(cfg.clientId),
      connected: Boolean(row),
      username: row?.external_username ?? null,
      autoSync: row?.auto_sync ?? true,
      lastSyncedAt: row?.last_synced_at ?? null,
      lastSyncOk: row?.last_sync_ok ?? null,
      lastError: row?.last_error ?? null,
      lastFailedAt: row?.last_failed_at ?? null,
      tokenExpiresAt: row?.token_expires_at ?? null,
    };
  });

  return NextResponse.json({ providers, history: log ?? [], pendingConflicts: conflictCount ?? 0 });
}

/** PATCH { provider, autoSync } → toggle background syncing. */
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { provider?: string; autoSync?: boolean } | null;
  if (!body?.provider || typeof body.autoSync !== "boolean")
    return NextResponse.json({ error: "provider and autoSync required" }, { status: 400 });
  await supabase
    .from("integrations")
    .update({ auto_sync: body.autoSync, updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("provider", body.provider);
  return NextResponse.json({ ok: true });
}

/** DELETE ?provider=mal → disconnect (removes tokens + queued jobs). */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const provider = new URL(request.url).searchParams.get("provider");
  if (!provider) return NextResponse.json({ error: "provider required" }, { status: 400 });
  await supabase.from("sync_queue").delete().eq("user_id", user.id).eq("provider", provider);
  await supabase.from("sync_conflicts").delete().eq("user_id", user.id).eq("provider", provider);
  await supabase.from("integrations").delete().eq("user_id", user.id).eq("provider", provider);
  return NextResponse.json({ ok: true });
}
