/**
 * Two-way sync engine for external list providers (MyAnimeList, AniList).
 *
 * Strategy:
 *  - PULL: fetch the remote list, map to Reel shapes, diff against the local
 *    library. Remote-newer entries update local; local-newer entries are
 *    queued as pushes; both-changed entries become conflict rows the user
 *    resolves in Settings → Integrations.
 *  - PUSH: individual library mutations enqueue rows in sync_queue which are
 *    drained here (manual sync) and by the cron route (background sync),
 *    with retry + exponential-ish backoff via the attempts counter.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReelItem, ReelItemStatus } from "@core/storage/schema";
import {
  getProvider,
  remoteRatingToReel,
  reelRatingToRemote,
  reelStatusToRemote,
  remoteStatusToReel,
  type ProviderId,
} from "./providers";

export interface IntegrationRow {
  id: string;
  user_id: string;
  provider: ProviderId;
  external_user_id: string | null;
  external_username: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  auto_sync: boolean;
  last_synced_at: string | null;
}

export interface RemoteEntry {
  kind: "anime" | "manga";
  malId: number | null;
  anilistId: number | null;
  title: string;
  posterUrl: string | null;
  status: ReelItemStatus;
  progress: number;         // episodes watched / chapters read
  rating: number | null;    // already mapped to Reel 1–5
  remoteUpdatedAt: number;  // epoch ms
  totalUnits: number | null;
}

const MAX_PUSH_ATTEMPTS = 5;
/** Simple politeness delay between remote writes (rate-limit protection). */
const WRITE_DELAY_MS = 350;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------ token refresh ------------------------------ */

export async function ensureFreshToken(
  supabase: SupabaseClient,
  row: IntegrationRow
): Promise<IntegrationRow> {
  const cfg = getProvider(row.provider);
  if (!cfg || !row.refresh_token) return row;
  const expiresAt = row.token_expires_at ? new Date(row.token_expires_at).getTime() : 0;
  if (expiresAt - Date.now() > 5 * 60 * 1000) return row;

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: row.refresh_token,
    client_id: cfg.clientId ?? "",
  });
  if (cfg.clientSecret) body.set("client_secret", cfg.clientSecret);

  const res = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Token refresh failed (${res.status}) — please reconnect ${cfg.name}.`);
  const json = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };
  const updated: Partial<IntegrationRow> = {
    access_token: json.access_token,
    refresh_token: json.refresh_token ?? row.refresh_token,
    token_expires_at: new Date(Date.now() + (json.expires_in ?? 3600) * 1000).toISOString(),
  };
  await supabase.from("integrations").update(updated).eq("id", row.id);
  return { ...row, ...updated } as IntegrationRow;
}

/* ------------------------------ remote fetch ------------------------------ */

async function fetchMalList(token: string, kind: "anime" | "manga"): Promise<RemoteEntry[]> {
  const out: RemoteEntry[] = [];
  let url =
    `https://api.myanimelist.net/v2/users/@me/${kind}list` +
    `?fields=list_status,num_episodes,num_chapters,main_picture&limit=500&nsfw=true`;
  for (let page = 0; page < 20 && url; page += 1) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`MyAnimeList API error ${res.status}`);
    const json = (await res.json()) as {
      data: {
        node: { id: number; title: string; main_picture?: { large?: string; medium?: string }; num_episodes?: number; num_chapters?: number };
        list_status: { status: string; score: number; num_episodes_watched?: number; num_chapters_read?: number; updated_at: string };
      }[];
      paging?: { next?: string };
    };
    for (const { node, list_status: ls } of json.data ?? []) {
      out.push({
        kind,
        malId: node.id,
        anilistId: null,
        title: node.title,
        posterUrl: node.main_picture?.large ?? node.main_picture?.medium ?? null,
        status: remoteStatusToReel("mal", ls.status, kind),
        progress: (kind === "anime" ? ls.num_episodes_watched : ls.num_chapters_read) ?? 0,
        rating: remoteRatingToReel(ls.score),
        remoteUpdatedAt: new Date(ls.updated_at).getTime(),
        totalUnits: (kind === "anime" ? node.num_episodes : node.num_chapters) || null,
      });
    }
    url = json.paging?.next ?? "";
  }
  return out;
}

async function fetchAnilistList(token: string, kind: "anime" | "manga"): Promise<RemoteEntry[]> {
  const query = `query { MediaListCollection(userId: null, userName: null, type: ${kind.toUpperCase()}) {
    lists { entries {
      status score(format: POINT_10) progress updatedAt
      media { id idMal title { userPreferred } episodes chapters coverImage { large } }
    } } } }`;
  // AniList needs the viewer's list — use Viewer id first.
  const viewerRes = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query: "query { Viewer { id name } }" }),
  });
  if (!viewerRes.ok) throw new Error(`AniList API error ${viewerRes.status}`);
  const viewer = (await viewerRes.json()) as { data?: { Viewer?: { id: number } } };
  const userId = viewer.data?.Viewer?.id;
  if (!userId) throw new Error("AniList session invalid — please reconnect.");

  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      query: query.replace("userId: null, userName: null", `userId: ${userId}`),
    }),
  });
  if (!res.ok) throw new Error(`AniList API error ${res.status}`);
  const json = (await res.json()) as {
    data?: { MediaListCollection?: { lists: { entries: {
      status: string; score: number; progress: number; updatedAt: number;
      media: { id: number; idMal: number | null; title: { userPreferred: string }; episodes: number | null; chapters: number | null; coverImage?: { large?: string } };
    }[] }[] } };
  };
  const out: RemoteEntry[] = [];
  for (const list of json.data?.MediaListCollection?.lists ?? []) {
    for (const e of list.entries) {
      out.push({
        kind,
        malId: e.media.idMal,
        anilistId: e.media.id,
        title: e.media.title.userPreferred,
        posterUrl: e.media.coverImage?.large ?? null,
        status: remoteStatusToReel("anilist", e.status, kind),
        progress: e.progress ?? 0,
        rating: remoteRatingToReel(e.score),
        remoteUpdatedAt: (e.updatedAt ?? 0) * 1000,
        totalUnits: (kind === "anime" ? e.media.episodes : e.media.chapters) || null,
      });
    }
  }
  return out;
}

export async function fetchRemoteList(provider: ProviderId, token: string): Promise<RemoteEntry[]> {
  const fetcher = provider === "mal" ? fetchMalList : fetchAnilistList;
  const [anime, manga] = await Promise.all([fetcher(token, "anime"), fetcher(token, "manga")]);
  return [...anime, ...manga];
}

/* ------------------------------ remote push ------------------------------ */

export interface PushPayload {
  status?: ReelItemStatus;
  progress?: number;
  rating?: number | null;
  malId?: number | null;
  anilistId?: number | null;
  kind?: "anime" | "manga";
}

export async function pushEntry(
  provider: ProviderId,
  token: string,
  payload: PushPayload
): Promise<void> {
  const kind = payload.kind ?? "anime";
  if (provider === "mal") {
    if (!payload.malId) throw new Error("Missing MAL id");
    const body = new URLSearchParams();
    if (payload.status) body.set("status", reelStatusToRemote("mal", payload.status, kind));
    if (payload.progress != null)
      body.set(kind === "anime" ? "num_watched_episodes" : "num_chapters_read", String(payload.progress));
    if (payload.rating !== undefined && payload.rating !== null)
      body.set("score", String(reelRatingToRemote(payload.rating)));
    const res = await fetch(
      `https://api.myanimelist.net/v2/${kind}/${payload.malId}/my_list_status`,
      { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/x-www-form-urlencoded" }, body }
    );
    if (!res.ok) throw new Error(`MyAnimeList update failed (${res.status})`);
  } else {
    if (!payload.anilistId) throw new Error("Missing AniList id");
    const vars: Record<string, unknown> = { mediaId: payload.anilistId };
    if (payload.status) vars.status = reelStatusToRemote("anilist", payload.status, kind);
    if (payload.progress != null) vars.progress = payload.progress;
    if (payload.rating !== undefined && payload.rating !== null)
      vars.score = reelRatingToRemote(payload.rating);
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        query: `mutation ($mediaId: Int, $status: MediaListStatus, $progress: Int, $score: Float) {
          SaveMediaListEntry(mediaId: $mediaId, status: $status, progress: $progress, score: $score) { id }
        }`,
        variables: vars,
      }),
    });
    const json = (await res.json().catch(() => null)) as { errors?: unknown[] } | null;
    if (!res.ok || json?.errors?.length) throw new Error(`AniList update failed (${res.status})`);
  }
}

/* ------------------------------ two-way sync ------------------------------ */

type LibraryRow = { data: ReelItem[] };

function matchLocal(items: ReelItem[], r: RemoteEntry): ReelItem | undefined {
  return items.find(
    (i) =>
      (r.malId != null && i.malId === r.malId) ||
      (r.anilistId != null && i.anilistId === r.anilistId)
  );
}

function localProgress(i: ReelItem): number {
  return i.type === "anime" || i.type === "series"
    ? i.progress.currentEpisode ?? 0
    : i.progress.currentChapter ?? 0;
}

function entriesDiffer(local: ReelItem, r: RemoteEntry): boolean {
  return local.status !== r.status || localProgress(local) !== r.progress ||
    (r.rating != null && local.rating !== r.rating);
}

export interface SyncResult {
  pulled: number;
  pushed: number;
  conflicts: number;
  errors: string[];
}

/**
 * Runs a full two-way sync for one integration. `supabase` must be a client
 * authorized as the user (RLS) or the service-role client with user_id scoping.
 */
export async function runTwoWaySync(
  supabase: SupabaseClient,
  integration: IntegrationRow
): Promise<SyncResult> {
  const result: SyncResult = { pulled: 0, pushed: 0, conflicts: 0, errors: [] };
  const row = await ensureFreshToken(supabase, integration);
  if (!row.access_token) throw new Error("Not connected");
  const lastSync = row.last_synced_at ? new Date(row.last_synced_at).getTime() : 0;

  const remote = await fetchRemoteList(row.provider, row.access_token);

  const { data: libRow } = await supabase
    .from("library").select("data").eq("user_id", row.user_id).maybeSingle<LibraryRow>();
  const items: ReelItem[] = Array.isArray(libRow?.data) ? [...libRow.data] : [];
  let libraryChanged = false;

  for (const r of remote) {
    const local = matchLocal(items, r);
    if (!local) {
      // New on the remote side → import into the library.
      const nowIso = new Date().toISOString();
      items.push({
        id: r.anilistId ? `anilist-${r.anilistId}` : `mal-${r.malId}`,
        source: "anilist",
        type: r.kind === "anime" ? "anime" : "manga",
        title: r.title,
        posterUrl: r.posterUrl,
        backdropUrl: null,
        synopsis: null,
        status: r.status,
        progress: {
          movieTimestamp: null,
          currentEpisode: r.kind === "anime" ? r.progress || null : null,
          currentSeason: null,
          episodeTimestamp: null,
          currentChapter: r.kind === "manga" ? r.progress || null : null,
          currentVolume: null,
          totalEpisodes: r.kind === "anime" ? r.totalUnits : null,
          totalSeasons: null,
          totalChapters: r.kind === "manga" ? r.totalUnits : null,
          totalVolumes: null,
          percentComplete: r.totalUnits ? Math.min(100, Math.round((r.progress / r.totalUnits) * 100)) : 0,
        },
        rating: r.rating,
        genres: [],
        totalEpisodes: r.kind === "anime" ? r.totalUnits : null,
        totalChapters: r.kind === "manga" ? r.totalUnits : null,
        totalSeasons: null,
        year: null,
        anilistId: r.anilistId,
        tmdbId: null,
        mangadexId: null,
        malId: r.malId,
        addedAt: nowIso,
        updatedAt: nowIso,
        completedAt: r.status === "completed" ? nowIso : null,
        lastWatchedSite: null,
      });
      libraryChanged = true;
      result.pulled += 1;
      continue;
    }
    if (!entriesDiffer(local, r)) continue;

    const localUpdated = new Date(local.updatedAt).getTime();
    const localChanged = localUpdated > lastSync;
    const remoteChanged = r.remoteUpdatedAt > lastSync;

    if (localChanged && remoteChanged) {
      // Both sides changed since last sync → record a conflict for the user.
      await supabase.from("sync_conflicts").upsert(
        {
          user_id: row.user_id,
          provider: row.provider,
          media_key: local.id,
          local: { status: local.status, progress: localProgress(local), rating: local.rating, title: local.title, updatedAt: local.updatedAt },
          remote: { status: r.status, progress: r.progress, rating: r.rating, title: r.title, updatedAt: new Date(r.remoteUpdatedAt).toISOString() },
          resolved: false,
        },
        { onConflict: "user_id,provider,media_key" }
      );
      result.conflicts += 1;
    } else if (remoteChanged || (!localChanged && r.remoteUpdatedAt > localUpdated)) {
      // Remote wins → update local.
      local.status = r.status;
      if (r.kind === "anime") local.progress.currentEpisode = r.progress || local.progress.currentEpisode;
      else local.progress.currentChapter = r.progress || local.progress.currentChapter;
      if (r.rating != null) local.rating = r.rating;
      local.updatedAt = new Date().toISOString();
      if (r.status === "completed" && !local.completedAt) local.completedAt = local.updatedAt;
      libraryChanged = true;
      result.pulled += 1;
    } else {
      // Local wins → push out.
      try {
        await pushEntry(row.provider, row.access_token, {
          status: local.status,
          progress: localProgress(local),
          rating: local.rating,
          malId: local.malId,
          anilistId: local.anilistId,
          kind: local.type === "anime" || local.type === "series" ? "anime" : "manga",
        });
        result.pushed += 1;
        await sleep(WRITE_DELAY_MS);
      } catch (e) {
        result.errors.push(e instanceof Error ? e.message : String(e));
      }
    }
  }

  if (libraryChanged) {
    await supabase.from("library").upsert(
      { user_id: row.user_id, data: items, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  }

  // Drain any queued pushes for this provider.
  const drained = await drainQueue(supabase, row);
  result.pushed += drained.pushed;
  result.errors.push(...drained.errors);

  const ok = result.errors.length === 0;
  await supabase.from("integrations").update({
    last_synced_at: new Date().toISOString(),
    last_sync_ok: ok,
    last_error: ok ? null : result.errors[0],
    last_failed_at: ok ? undefined : new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", row.id);

  await supabase.from("sync_log").insert({
    user_id: row.user_id,
    provider: row.provider,
    direction: "both",
    ok,
    items_synced: result.pulled + result.pushed,
    message: ok
      ? `Pulled ${result.pulled}, pushed ${result.pushed}${result.conflicts ? `, ${result.conflicts} conflict(s) need review` : ""}`
      : result.errors.slice(0, 3).join("; "),
  });

  return result;
}

/** Processes pending sync_queue rows for one integration (push direction). */
export async function drainQueue(
  supabase: SupabaseClient,
  row: IntegrationRow
): Promise<{ pushed: number; errors: string[] }> {
  const out = { pushed: 0, errors: [] as string[] };
  if (!row.access_token) return out;
  const { data: jobs } = await supabase
    .from("sync_queue")
    .select("*")
    .eq("user_id", row.user_id)
    .eq("provider", row.provider)
    .eq("status", "pending")
    .lt("attempts", MAX_PUSH_ATTEMPTS)
    .order("created_at", { ascending: true })
    .limit(50);
  for (const job of jobs ?? []) {
    await supabase.from("sync_queue").update({ status: "processing" }).eq("id", job.id);
    try {
      await pushEntry(row.provider, row.access_token, job.payload as PushPayload);
      await supabase.from("sync_queue").update({ status: "done", updated_at: new Date().toISOString() }).eq("id", job.id);
      out.pushed += 1;
      await sleep(WRITE_DELAY_MS);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      out.errors.push(msg);
      const attempts = (job.attempts as number) + 1;
      await supabase.from("sync_queue").update({
        status: attempts >= MAX_PUSH_ATTEMPTS ? "failed" : "pending",
        attempts,
        last_error: msg,
        updated_at: new Date().toISOString(),
      }).eq("id", job.id);
    }
  }
  return out;
}
