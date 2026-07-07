import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pushEntry, ensureFreshToken, type IntegrationRow, type PushPayload } from "@/lib/integrations/sync";
import type { ReelItem, ReelItemStatus } from "@core/storage/schema";

/** GET → unresolved sync conflicts for the current user. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { data } = await supabase
    .from("sync_conflicts")
    .select("id, provider, media_key, local, remote, created_at")
    .eq("user_id", user.id)
    .eq("resolved", false)
    .order("created_at", { ascending: true });
  return NextResponse.json({ conflicts: data ?? [] });
}

/** POST { id, keep: 'local' | 'remote' } → resolve one conflict. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { id?: string; keep?: "local" | "remote" } | null;
  if (!body?.id || (body.keep !== "local" && body.keep !== "remote"))
    return NextResponse.json({ error: "id and keep required" }, { status: 400 });

  const { data: conflict } = await supabase
    .from("sync_conflicts").select("*").eq("id", body.id).eq("user_id", user.id).maybeSingle();
  if (!conflict) return NextResponse.json({ error: "Conflict not found" }, { status: 404 });

  const chosen = (body.keep === "local" ? conflict.local : conflict.remote) as {
    status: ReelItemStatus; progress: number; rating: number | null;
  };

  // Always apply the chosen version locally...
  const { data: libRow } = await supabase
    .from("library").select("data").eq("user_id", user.id).maybeSingle<{ data: ReelItem[] }>();
  const items = Array.isArray(libRow?.data) ? [...libRow.data] : [];
  const item = items.find((i) => i.id === conflict.media_key);
  if (item) {
    item.status = chosen.status;
    if (item.type === "anime" || item.type === "series") item.progress.currentEpisode = chosen.progress || null;
    else item.progress.currentChapter = chosen.progress || null;
    if (chosen.rating != null) item.rating = chosen.rating;
    item.updatedAt = new Date().toISOString();
    await supabase.from("library").upsert(
      { user_id: user.id, data: items, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  }

  // ...and push it to the remote side so both ends agree.
  if (item) {
    const { data: integ } = await supabase
      .from("integrations").select("*")
      .eq("user_id", user.id).eq("provider", conflict.provider)
      .maybeSingle<IntegrationRow>();
    if (integ?.access_token) {
      try {
        const fresh = await ensureFreshToken(supabase, integ);
        const payload: PushPayload = {
          status: chosen.status,
          progress: chosen.progress,
          rating: chosen.rating,
          malId: item.malId,
          anilistId: item.anilistId,
          kind: item.type === "anime" || item.type === "series" ? "anime" : "manga",
        };
        await pushEntry(integ.provider, fresh.access_token!, payload);
      } catch {
        // remote push failed — the next sync will retry via the queue
      }
    }
  }

  await supabase.from("sync_conflicts").update({ resolved: true }).eq("id", body.id);
  return NextResponse.json({ ok: true });
}
