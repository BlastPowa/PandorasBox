import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProvider } from "@/lib/integrations/providers";
import { runTwoWaySync, type IntegrationRow } from "@/lib/integrations/sync";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

/** POST → run a manual two-way sync for one provider. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const limit = rateLimit(request, "integration-sync", 6, 60_000);
  if (!limit.ok) return tooManyRequests(limit);

  const { provider: providerId } = await params;
  if (!getProvider(providerId)) return NextResponse.json({ error: "Unknown provider" }, { status: 404 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const { data: row } = await supabase
    .from("integrations")
    .select("*")
    .eq("user_id", user.id)
    .eq("provider", providerId)
    .maybeSingle<IntegrationRow>();
  if (!row) return NextResponse.json({ error: "Not connected" }, { status: 400 });

  try {
    const result = await runTwoWaySync(supabase, row);
    return NextResponse.json({ ok: result.errors.length === 0, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sync failed";
    await supabase.from("integrations").update({
      last_sync_ok: false,
      last_error: msg,
      last_failed_at: new Date().toISOString(),
    }).eq("id", row.id);
    await supabase.from("sync_log").insert({
      user_id: user.id, provider: providerId, direction: "both", ok: false, items_synced: 0, message: msg,
    });
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
