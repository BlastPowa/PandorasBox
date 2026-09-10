/**
 * Two-way sync engine for external list providers (MyAnimeList, AniList, Trakt).
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
  kind: "anime" | "manga" | "movie" | "series";
  malId: number | null;
  anilistId: number | null;
  tmdbId: number | null;
  title: string;
  posterUrl: string | null;
  status: ReelItemStatus;
  progress: number;         // episodes watched / chapters read
  rating: number | null;    // already mapped to Reel 1–5
  remoteUpdatedAt: number;  // epoch ms
  totalUnits: number | null;
  season: number | null;
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

  const res = await fetch(cfg.tokenUrl, row.provider === "trakt"
    ? {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(body.entries())),
      }
    : {
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
        tmdbId: null,
        title: node.title,
        posterUrl: node.main_picture?.large ?? node.main_picture?.medium ?? null,
        status: remoteStatusToReel("mal", ls.status, kind),
        progress: (kind === "anime" ? ls.num_episodes_watched : ls.num_chapters_read) ?? 0,
        rating: remoteRatingToReel(ls.score),
        remoteUpdatedAt: new Date(ls.updated_at).getTime(),
        totalUnits: (kind === "anime" ? node.num_episodes : node.num_chapters) || null,
        season: null,
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
        tmdbId: null,
        title: e.media.title.userPreferred,
        posterUrl: e.media.coverImage?.large ?? null,
        status: remoteStatusToReel("anilist", e.status, kind),
        progress: e.progress ?? 0,
        rating: remoteRatingToReel(e.score),
        remoteUpdatedAt: (e.updatedAt ?? 0) * 1000,
        totalUnits: (kind === "anime" ? e.media.episodes : e.media.chapters) || null,
        season: null,
      });
    }
  }
  return out;
}

function traktHeaders(token: string): HeadersInit {
  const cfg = getProvider("trakt");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "trakt-api-version": "2",
    "trakt-api-key": cfg?.clientId ?? "",
  };
}

async function fetchTraktList(token: string): Promise<RemoteEntry[]> {
  type Movie = { title: string; ids: { tmdb?: number } };
  type Show = { title: string; aired_episodes?: number; ids: { tmdb?: number } };
  const get = async <T,>(path: string): Promise<T> => {
    const res = await fetch(`https://api.trakt.tv${path}`, { headers: traktHeaders(token) });
    if (!res.ok) throw new Error(`Trakt API error ${res.status}`);
    return (await res.json()) as T;
  };

  const [watchedMovies, watchedShows, watchlistMovies, watchlistShows, movieRatings, showRatings] = await Promise.all([
    get<Array<{ last_watched_at: string; movie: Movie }>>("/users/me/watched/movies"),
    get<Array<{ last_watched_at: string; show: Show; seasons: Array<{ number: number; episodes: Array<{ number: number; plays?: number; last_watched_at?: string }> }> }>>("/users/me/watched/shows?extended=full"),
    get<Array<{ listed_at: string; movie: Movie }>>("/users/me/watchlist/movies"),
    get<Array<{ listed_at: string; show: Show }>>("/users/me/watchlist/shows"),
    get<Array<{ rated_at: string; rating: number; movie: Movie }>>("/users/me/ratings/movies"),
    get<Array<{ rated_at: string; rating: number; show: Show }>>("/users/me/ratings/shows"),
  ]);

  const out = new Map<string, RemoteEntry>();
  const put = (entry: RemoteEntry) => {
    if (entry.tmdbId == null) return;
    const key = `${entry.kind}:${entry.tmdbId}`;
    const prior = out.get(key);
    if (!prior) {
      out.set(key, entry);
      return;
    }
    if (prior.status !== "planned" && entry.status === "planned") {
      prior.remoteUpdatedAt = Math.max(prior.remoteUpdatedAt, entry.remoteUpdatedAt);
      return;
    }
    if (prior.status === "planned" && entry.status !== "planned") {
      entry.remoteUpdatedAt = Math.max(prior.remoteUpdatedAt, entry.remoteUpdatedAt);
      out.set(key, entry);
      return;
    }
    if (entry.remoteUpdatedAt >= prior.remoteUpdatedAt) out.set(key, entry);
  };

  for (const x of watchlistMovies) put({
    kind: "movie", malId: null, anilistId: null, tmdbId: x.movie.ids.tmdb ?? null,
    title: x.movie.title, posterUrl: null, status: "planned", progress: 0, rating: null,
    remoteUpdatedAt: new Date(x.listed_at).getTime(), totalUnits: 1, season: null,
  });
  for (const x of watchlistShows) put({
    kind: "series", malId: null, anilistId: null, tmdbId: x.show.ids.tmdb ?? null,
    title: x.show.title, posterUrl: null, status: "planned", progress: 0, rating: null,
    remoteUpdatedAt: new Date(x.listed_at).getTime(), totalUnits: x.show.aired_episodes ?? null, season: null,
  });
  for (const x of watchedMovies) put({
    kind: "movie", malId: null, anilistId: null, tmdbId: x.movie.ids.tmdb ?? null,
    title: x.movie.title, posterUrl: null, status: "completed", progress: 1, rating: null,
    remoteUpdatedAt: new Date(x.last_watched_at).getTime(), totalUnits: 1, season: null,
  });
  for (const x of watchedShows) {
    const watched = x.seasons.flatMap((season) => season.episodes
      .filter((ep) => (ep.plays ?? 0) > 0)
      .map((ep) => ({ season: season.number, episode: ep.number, watchedAt: ep.last_watched_at ?? x.last_watched_at })));
    watched.sort((a, b) => new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime());
    const latest = watched[0];
    const total = x.show.aired_episodes ?? null;
    put({
      kind: "series", malId: null, anilistId: null, tmdbId: x.show.ids.tmdb ?? null,
      title: x.show.title, posterUrl: null,
      status: total != null && total > 0 && watched.length >= total ? "completed" : "watching",
      progress: latest?.episode ?? watched.length, rating: null,
      remoteUpdatedAt: new Date(x.last_watched_at).getTime(), totalUnits: total,
      season: latest?.season ?? null,
    });
  }

  const mergeRating = (kind: "movie" | "series", tmdbId: number | undefined, rating: number, ratedAt: string) => {
    if (tmdbId == null) return;
    const key = `${kind}:${tmdbId}`;
    const prior = out.get(key);
    if (!prior) return;
    prior.rating = remoteRatingToReel(rating);
    prior.remoteUpdatedAt = Math.max(prior.remoteUpdatedAt, new Date(ratedAt).getTime());
  };
  for (const x of movieRatings) mergeRating("movie", x.movie.ids.tmdb, x.rating, x.rated_at);
  for (const x of showRatings) mergeRating("series", x.show.ids.tmdb, x.rating, x.rated_at);

  return [...out.values()];
}

export async function fetchRemoteList(provider: ProviderId, token: string): Promise<RemoteEntry[]> {
  if (provider === "trakt") return fetchTraktList(token);
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
  tmdbId?: number | null;
  mediaType?: ReelItem["type"];
  season?: number | null;
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
  } else if (provider === "anilist") {
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
  } else {
    if (!payload.tmdbId) throw new Error("Missing TMDB id");
    const isMovie = payload.mediaType === "movie";
    const mediaBody = isMovie
      ? { movies: [{ ids: { tmdb: payload.tmdbId } }] }
      : { shows: [{ ids: { tmdb: payload.tmdbId } }] };
    if (payload.status === "planned") {
      const res = await fetch("https://api.trakt.tv/sync/watchlist", {
        method: "POST", headers: traktHeaders(token), body: JSON.stringify(mediaBody),
      });
      if (!res.ok) throw new Error(`Trakt watchlist update failed (${res.status})`);
    } else {
      const remove = await fetch("https://api.trakt.tv/sync/watchlist/remove", {
        method: "POST", headers: traktHeaders(token), body: JSON.stringify(mediaBody),
      });
      if (!remove.ok) throw new Error(`Trakt watchlist removal failed (${remove.status})`);
    }
    if (isMovie && payload.status === "completed") {
      const res = await fetch("https://api.trakt.tv/sync/history", {
        method: "POST", headers: traktHeaders(token),
        body: JSON.stringify({ movies: [{ watched_at: new Date().toISOString(), ids: { tmdb: payload.tmdbId } }] }),
      });
      if (!res.ok) throw new Error(`Trakt history update failed (${res.status})`);
    } else if (!isMovie && payload.progress != null && payload.progress > 0) {
      const season = Math.max(1, payload.season ?? 1);
      const res = await fetch("https://api.trakt.tv/sync/history", {
        method: "POST", headers: traktHeaders(token),
        body: JSON.stringify({ shows: [{ ids: { tmdb: payload.tmdbId }, seasons: [{ number: season, episodes: [{ number: payload.progress, watched_at: new Date().toISOString() }] }] }] }),
      });
      if (!res.ok) throw new Error(`Trakt history update failed (${res.status})`);
    }
    if (payload.rating !== undefined && payload.rating !== null) {
      const rating = reelRatingToRemote(payload.rating);
      const body = isMovie
        ? { movies: [{ rating, ids: { tmdb: payload.tmdbId } }] }
        : { shows: [{ rating, ids: { tmdb: payload.tmdbId } }] };
      const res = await fetch("https://api.trakt.tv/sync/ratings", {
        method: "POST", headers: traktHeaders(token), body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Trakt rating update failed (${res.status})`);
    }
  }
}

/* ------------------------------ two-way sync ------------------------------ */

type LibraryRow = { data: ReelItem[] };

function matchLocal(items: ReelItem[], r: RemoteEntry): ReelItem | undefined {
  return items.find(
    (i) =>
      (r.malId != null && i.malId === r.malId) ||
      (r.anilistId != null && i.anilistId === r.anilistId) ||
      (r.tmdbId != null && i.tmdbId === r.tmdbId)
  );
}

function remoteHasLocal(remote: RemoteEntry[], item: ReelItem): boolean {
  return remote.some(
    (r) =>
      (r.malId != null && item.malId === r.malId) ||
      (r.anilistId != null && item.anilistId === r.anilistId) ||
      (r.tmdbId != null && item.tmdbId === r.tmdbId)
  );
}

function providerCanSyncItem(provider: ProviderId, item: ReelItem): boolean {
  const cfg = getProvider(provider);
  if (!cfg || !cfg.syncTypes.some((type) => type === item.type)) return false;
  if (provider === "mal") return item.malId != null;
  if (provider === "anilist") return item.anilistId != null;
  return item.tmdbId != null && (item.type === "movie" || item.type === "series");
}

function localProgress(i: ReelItem): number {
  if (i.type === "movie") return i.status === "completed" ? 1 : 0;
  if (i.type === "anime" || i.type === "series") {
    const episode = i.progress.currentEpisode ?? 0;
    return i.progress.episodeTimestamp != null ? Math.max(0, episode - 1) : episode;
  }
  return i.progress.currentChapter ?? 0;
}

function entriesDiffer(local: ReelItem, r: RemoteEntry): boolean {
  return local.status !== r.status || localProgress(local) !== r.progress ||
    (r.kind === "series" && r.season != null && local.progress.currentSeason !== r.season) ||
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
      const isTmdb = r.kind === "movie" || r.kind === "series";
      const percentComplete = r.status === "completed"
        ? 100
        : !isTmdb && r.totalUnits
          ? Math.min(100, Math.round((r.progress / r.totalUnits) * 100))
          : 0;
      items.push({
        id: isTmdb ? `tmdb-${r.tmdbId}` : r.anilistId ? `anilist-${r.anilistId}` : `mal-${r.malId}`,
        source: isTmdb ? "tmdb" : "anilist",
        type: r.kind,
        title: r.title,
        posterUrl: r.posterUrl,
        backdropUrl: null,
        synopsis: null,
        status: r.status,
        progress: {
          movieTimestamp: null,
          currentEpisode: r.kind === "anime" || r.kind === "series" ? r.progress || null : null,
          currentSeason: r.kind === "series" ? r.season : null,
          episodeTimestamp: null,
          currentChapter: r.kind === "manga" ? r.progress || null : null,
          currentVolume: null,
          totalEpisodes: r.kind === "anime" || r.kind === "series" ? r.totalUnits : null,
          totalSeasons: null,
          totalChapters: r.kind === "manga" ? r.totalUnits : null,
          totalVolumes: null,
          percentComplete,
        },
        rating: r.rating,
        genres: [],
        totalEpisodes: r.kind === "anime" || r.kind === "series" ? r.totalUnits : null,
        totalChapters: r.kind === "manga" ? r.totalUnits : null,
        totalSeasons: null,
        year: null,
        anilistId: r.anilistId,
        tmdbId: r.tmdbId,
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
          local: { status: local.status, progress: localProgress(local), season: local.progress.currentSeason, rating: local.rating, title: local.title, updatedAt: local.updatedAt },
          remote: { status: r.status, progress: r.progress, season: r.season, rating: r.rating, title: r.title, updatedAt: new Date(r.remoteUpdatedAt).toISOString() },
          resolved: false,
        },
        { onConflict: "user_id,provider,media_key" }
      );
      result.conflicts += 1;
    } else if (remoteChanged || (!localChanged && r.remoteUpdatedAt > localUpdated)) {
      // Remote wins → update local.
      local.status = r.status;
      if (r.kind === "anime") {
        local.progress.currentEpisode = r.progress || null;
      } else if (r.kind === "series") {
        local.progress.currentSeason = r.season;
        local.progress.currentEpisode = r.progress || null;
      } else if (r.kind === "manga") {
        local.progress.currentChapter = r.progress || null;
      }
      if (r.status === "completed") local.progress.percentComplete = 100;
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
          tmdbId: local.tmdbId,
          mediaType: local.type,
          season: local.progress.currentSeason,
          kind: local.type === "anime" || local.type === "series" ? "anime" : "manga",
        });
        result.pushed += 1;
        await sleep(WRITE_DELAY_MS);
      } catch (e) {
        result.errors.push(e instanceof Error ? e.message : String(e));
      }
    }
  }

  for (const local of items) {
    if (!providerCanSyncItem(row.provider, local) || remoteHasLocal(remote, local)) continue;
    const localUpdated = new Date(local.updatedAt).getTime();
    if (lastSync > 0 && localUpdated <= lastSync) continue;
    try {
      await pushEntry(row.provider, row.access_token, {
        status: local.status,
        progress: localProgress(local),
        rating: local.rating,
        malId: local.malId,
        anilistId: local.anilistId,
        tmdbId: local.tmdbId,
        mediaType: local.type,
        season: local.progress.currentSeason,
        kind: local.type === "anime" || local.type === "series" ? "anime" : "manga",
      });
      result.pushed += 1;
      await sleep(WRITE_DELAY_MS);
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : String(e));
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
