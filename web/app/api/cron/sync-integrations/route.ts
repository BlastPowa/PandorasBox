import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { runTwoWaySync, type IntegrationRow } from "@/lib/integrations/sync";

export const maxDuration = 300;

const SYNC_INTERVAL_MS = 30 * 60 * 1000; // background sync at most every 30 min per account

/**
 * Background two-way sync for every auto-sync integration.
 * Scheduled by Vercel Cron (add to vercel.json). Protected by CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET ?? "";
  const auth = request.headers.get("authorization");
  const provided = auth?.replace("Bearer ", "") ?? new URL(request.url).searchParams.get("secret");
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const cutoff = new Date(Date.now() - SYNC_INTERVAL_MS).toISOString();
  const { data: rows } = await supabase
    .from("integrations")
    .select("*")
    .eq("auto_sync", true)
    .or(`last_synced_at.is.null,last_synced_at.lt.${cutoff}`)
    .limit(25);

  let synced = 0;
  const errors: string[] = [];
  for (const row of (rows ?? []) as IntegrationRow[]) {
    try {
      await runTwoWaySync(supabase, row);
      synced += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "sync failed";
      errors.push(`${row.provider}/${row.user_id}: ${msg}`);
      await supabase.from("integrations").update({
        last_sync_ok: false,
        last_error: msg,
        last_failed_at: new Date().toISOString(),
      }).eq("id", row.id);
    }
  }
  return NextResponse.json({ ok: true, synced, errors });
}
