import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import type { PushPayload } from "@/lib/integrations/sync";

/**
 * POST { mediaKey, payload } → enqueue a push to every connected auto-sync
 * provider. Called fire-and-forget by the library layer whenever the user
 * changes status/progress/rating on a syncable item. The cron route (and
 * manual sync) drains the queue with retries + rate-limit spacing.
 */
export async function POST(request: NextRequest) {
  const limit = rateLimit(request, "sync-queue", 120, 60_000);
  if (!limit.ok) return tooManyRequests(limit);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as
    | { mediaKey?: string; payload?: PushPayload }
    | null;
  if (!body?.mediaKey || !body.payload)
    return NextResponse.json({ error: "mediaKey and payload required" }, { status: 400 });
  if (body.payload.malId == null && body.payload.anilistId == null)
    return NextResponse.json({ ok: true, queued: 0 }); // not a syncable item

  const { data: integrations } = await supabase
    .from("integrations")
    .select("provider")
    .eq("user_id", user.id)
    .eq("auto_sync", true);
  if (!integrations?.length) return NextResponse.json({ ok: true, queued: 0 });

  let queued = 0;
  for (const { provider } of integrations) {
    if (provider === "mal" && body.payload.malId == null) continue;
    if (provider === "anilist" && body.payload.anilistId == null) continue;
    // Coalesce: replace any still-pending job for the same item.
    await supabase.from("sync_queue").delete()
      .eq("user_id", user.id).eq("provider", provider)
      .eq("media_key", body.mediaKey).eq("status", "pending");
    const { error } = await supabase.from("sync_queue").insert({
      user_id: user.id,
      provider,
      direction: "push",
      media_key: body.mediaKey,
      payload: body.payload,
    });
    if (!error) queued += 1;
  }
  return NextResponse.json({ ok: true, queued });
}
