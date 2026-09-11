import "server-only";
import type { PlaybackCaption, PlaybackSource, PlaybackSourceKind } from "./types";
import { discoverMediaServers } from "./media-server";

const OPEN_LICENSE = /(public\s*domain|creative\s*commons|\bcc[- ]?(?:by|zero|0|sa|nc|nd)\b)/i;

function text(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(text).filter(Boolean).join(" ");
  return "";
}

function normaliseTitle(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

type PlaybackMatchContext = {
  title: string;
  type: string;
  year?: number | null;
  season?: number | null;
  episode?: number | null;
  episodeTitle?: string | null;
};

type EpisodeMarker = { season: number | null; episode: number };

const TITLE_DISAMBIGUATORS = new Set(["uk", "us", "usa", "india", "australia"]);
const SAFE_TITLE_QUALIFIERS = new Set([
  "full", "movie", "film", "feature", "complete", "uncut",
  "restored", "restoration", "remastered", "remaster",
  "public", "domain", "hd", "uhd", "4k", "1080p", "720p", "480p", "360p",
  "mp4", "webm", "ogv", "ogg", "m4v", "mkv",
]);

function episodeMarkers(value: string): EpisodeMarker[] {
  const markers: EpisodeMarker[] = [];
  const addMatches = (pattern: RegExp, hasSeason: boolean) => {
    for (const match of value.matchAll(pattern)) {
      const season = hasSeason ? Number(match[1]) : null;
      const episode = Number(match[hasSeason ? 2 : 1]);
      if (Number.isInteger(episode) && episode > 0) {
        markers.push({ season: Number.isInteger(season) && season! > 0 ? season : null, episode });
      }
    }
  };

  addMatches(/\bs(?:eason)?[\s._-]*0*(\d{1,2})[\s._-]*e(?:pisode)?[\s._-]*0*(\d{1,3})\b/gi, true);
  addMatches(/\b0*(\d{1,2})x0*(\d{1,3})\b/gi, true);
  addMatches(/\bseason[\s._-]*0*(\d{1,2})[\s._-]*(?:episode|ep)[\s._-]*0*(\d{1,3})\b/gi, true);
  addMatches(/\b(?:episode|ep|e)[\s._-]*0*(\d{1,3})\b/gi, false);

  return markers;
}

function likelyTitleMatch(context: PlaybackMatchContext, candidate: string, candidateYear?: string | number | null): boolean {
  const wanted = normaliseTitle(context.title);
  const found = normaliseTitle(candidate.replace(/^File:/i, ""));
  if (wanted.length < 2) return false;

  const wantedParts = wanted.split(" ");
  const foundParts = found.split(" ");
  let matchStart = -1;
  for (let index = 0; index <= foundParts.length - wantedParts.length; index += 1) {
    if (wantedParts.every((part, offset) => foundParts[index + offset] === part)) {
      matchStart = index;
      break;
    }
  }
  if (matchStart < 0) return false;

  if (!context.episode) {
    const allowedExtras = new Set(SAFE_TITLE_QUALIFIERS);
    if (context.year) allowedExtras.add(String(context.year));
    const extras = [
      ...foundParts.slice(0, matchStart),
      ...foundParts.slice(matchStart + wantedParts.length),
    ];
    if (extras.some((part) => !allowedExtras.has(part))) return false;
  }

  const wantedTokens = new Set(wanted.split(" "));
  const foundTokens = new Set(found.split(" "));
  for (const token of TITLE_DISAMBIGUATORS) {
    if (foundTokens.has(token) && !wantedTokens.has(token)) return false;
  }

  if (context.type === "movie" && context.year) {
    const metadataYear = Number(candidateYear);
    if (Number.isFinite(metadataYear) && metadataYear > 0 && metadataYear !== context.year) return false;
    const titleYears = [...candidate.matchAll(/\b(19\d{2}|20\d{2})\b/g)].map((match) => Number(match[1]));
    if (titleYears.length > 0 && !titleYears.includes(context.year)) return false;
  }

  if (context.episode) {
    const wantedSeason = context.season ?? 1;
    const markers = episodeMarkers(candidate);
    if (markers.some((marker) => marker.episode !== context.episode)) return false;
    if (markers.some((marker) => marker.season !== null && marker.season !== wantedSeason)) return false;

    const hasMatchingMarker = markers.some((marker) => marker.episode === context.episode && (marker.season === null || marker.season === wantedSeason));
    const episodeTitle = normaliseTitle(context.episodeTitle ?? "");
    const episodeTitleTokens = episodeTitle.split(" ").filter((token) => token.length >= 2 && token !== "episode" && token !== "ep");
    const hasEpisodeTitle = episodeTitleTokens.length > 0 && episodeTitleTokens.every((token) => foundTokens.has(token));
    if (!hasMatchingMarker && !hasEpisodeTitle) return false;
  }

  return true;
}

function sourceKind(url: string, mimeType?: string | null): PlaybackSourceKind {
  const lower = url.toLowerCase();
  if (mimeType?.includes("dash") || lower.includes(".mpd")) return "dash";
  if (mimeType?.includes("mpegurl") || lower.includes(".m3u8")) return "hls";
  return "direct";
}

function qualityLabel(height: unknown): string | null {
  const value = typeof height === "number" ? height : Number(height);
  return Number.isFinite(value) && value > 0 ? `${Math.round(value)}p` : null;
}

function mediaMimeFromUrl(value: string): string | null {
  try {
    const path = new URL(value).pathname.toLowerCase();
    if (path.endsWith(".mp4")) return "video/mp4";
    if (path.endsWith(".webm")) return "video/webm";
    if (path.endsWith(".ogv") || path.endsWith(".ogg")) return "video/ogg";
    if (path.endsWith(".m4v")) return "video/x-m4v";
    if (path.endsWith(".mov")) return "video/quicktime";
    if (path.endsWith(".m3u8")) return "application/vnd.apple.mpegurl";
    if (path.endsWith(".mpd")) return "application/dash+xml";
  } catch {
    return null;
  }
  return null;
}

function qualityFromUrl(value: string): string | null {
  const match = value.match(/(?:^|[^0-9])(2160|1440|1080|720|576|540|480|360|240)p?(?:[^0-9]|$)/i);
  return match ? `${match[1]}p` : null;
}

type ConfiguredFeedCaption = {
  label?: unknown;
  language?: unknown;
  url?: unknown;
};

type ConfiguredFeedSource = {
  id?: unknown;
  providerName?: unknown;
  title?: unknown;
  type?: unknown;
  year?: unknown;
  season?: unknown;
  episode?: unknown;
  kind?: unknown;
  url?: unknown;
  mimeType?: unknown;
  quality?: unknown;
  license?: unknown;
  sourcePageUrl?: unknown;
  captions?: unknown;
};

function safeRemoteUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && url.protocol === "http:")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function configuredFeedUrls(): string[] {
  const configured = process.env.PBOX_PLAYBACK_FEEDS ?? "";
  return configured
    .split(/[\n,;]/)
    .map((value) => safeRemoteUrl(value))
    .filter((value): value is string => Boolean(value))
    .slice(0, 6);
}

function configuredFeedMatches(context: PlaybackMatchContext, source: ConfiguredFeedSource): boolean {
  const candidateTitle = text(source.title).trim();
  if (!candidateTitle) return false;

  const sourceType = text(source.type).trim().toLowerCase();
  if (sourceType) {
    const wantsMovie = context.type.toLowerCase() === "movie";
    const isMovie = sourceType === "movie";
    if (wantsMovie !== isMovie) return false;
  }

  const structuredSeason = Number(source.season);
  const structuredEpisode = Number(source.episode);
  const hasStructuredEpisode = Number.isInteger(structuredEpisode) && structuredEpisode > 0;

  if (context.episode && hasStructuredEpisode) {
    const wantedSeason = context.season ?? 1;
    const candidateSeason = Number.isInteger(structuredSeason) && structuredSeason > 0 ? structuredSeason : 1;
    if (structuredEpisode !== context.episode || candidateSeason !== wantedSeason) return false;
    return likelyTitleMatch({ ...context, season: null, episode: null, episodeTitle: null }, candidateTitle, source.year as string | number | null | undefined);
  }

  return likelyTitleMatch(context, candidateTitle, source.year as string | number | null | undefined);
}

function configuredCaptions(value: unknown): PlaybackCaption[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((caption): PlaybackCaption | null => {
      const item = caption as ConfiguredFeedCaption;
      const url = safeRemoteUrl(item.url);
      if (!url) return null;
      const label = text(item.label).trim() || "Subtitles";
      const language = text(item.language).trim() || "und";
      return { label, language, url };
    })
    .filter((caption): caption is PlaybackCaption => Boolean(caption))
    .slice(0, 12);
}

async function discoverConfiguredFeeds(context: PlaybackMatchContext): Promise<PlaybackSource[]> {
  const feeds = configuredFeedUrls();
  if (feeds.length === 0) return [];

  const token = process.env.PBOX_PLAYBACK_FEED_TOKEN?.trim();
  const results = await Promise.allSettled(feeds.map(async (feedUrl, feedIndex) => {
    const url = new URL(feedUrl);
    url.searchParams.set("title", context.title);
    url.searchParams.set("type", context.type);
    if (context.year) url.searchParams.set("year", String(context.year));
    if (context.season) url.searchParams.set("season", String(context.season));
    if (context.episode) url.searchParams.set("episode", String(context.episode));
    if (context.episodeTitle) url.searchParams.set("episodeTitle", context.episodeTitle);

    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "PandorasBox/1.0 (configured playback discovery)",
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return [] as PlaybackSource[];

    const payload = await response.json() as { sources?: unknown } | unknown[];
    const rows = Array.isArray(payload) ? payload : Array.isArray(payload.sources) ? payload.sources : [];
    const feedOrigin = new URL(feedUrl).origin;

    return rows
      .slice(0, 24)
      .map((raw, sourceIndex): PlaybackSource | null => {
        if (!raw || typeof raw !== "object") return null;
        const source = raw as ConfiguredFeedSource;
        if (!configuredFeedMatches(context, source)) return null;

        const streamUrl = safeRemoteUrl(source.url);
        const license = text(source.license).trim();
        if (!streamUrl || !license) return null;

        const mimeType = text(source.mimeType).trim() || null;
        const requestedKind = text(source.kind).trim().toLowerCase();
        const kind: PlaybackSourceKind = requestedKind === "hls" || requestedKind === "dash" || requestedKind === "direct"
          ? requestedKind
          : sourceKind(streamUrl, mimeType);
        const sourcePageUrl = safeRemoteUrl(source.sourcePageUrl) ?? feedOrigin;
        const providerName = text(source.providerName).trim() || `PBox Source ${feedIndex + 1}`;
        const externalId = text(source.id).trim().replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80);

        return {
          id: `configured-${feedIndex}-${externalId || sourceIndex}`,
          provider: "configured-feed",
          providerName,
          title: text(source.title).trim(),
          kind,
          url: streamUrl,
          mimeType,
          quality: text(source.quality).trim() || null,
          license,
          sourcePageUrl,
          captions: configuredCaptions(source.captions),
        };
      })
      .filter((source): source is PlaybackSource => Boolean(source));
  }));

  return results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
}

type WikimediaPage = {
  pageid?: number;
  title?: string;
  fullurl?: string;
  imageinfo?: Array<{ extmetadata?: Record<string, { value?: string }> }>;
  videoinfo?: Array<{
    url?: string;
    mime?: string;
    height?: number;
    derivatives?: Array<{ src?: string; type?: string; height?: number | string }>;
  }>;
};

async function discoverWikimedia(title: string, context: PlaybackMatchContext): Promise<PlaybackSource[]> {
  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: `${title} filetype:video`,
    gsrnamespace: "6",
    gsrlimit: "6",
    prop: "videoinfo|imageinfo|info",
    viprop: "url|mime|size|derivatives",
    iiprop: "extmetadata",
    inprop: "url",
    format: "json",
    formatversion: "2",
  });
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params.toString()}`, {
    headers: { "User-Agent": "PandorasBox/1.0 (open-media playback discovery)" },
    next: { revalidate: 3600 },
  });
  if (!response.ok) return [];
  const data = await response.json() as { query?: { pages?: WikimediaPage[] } };
  const sources: PlaybackSource[] = [];

  for (const page of data.query?.pages ?? []) {
    if (!page.title || !likelyTitleMatch(context, page.title)) continue;
    const metadata = page.imageinfo?.[0]?.extmetadata ?? {};
    const license = text(metadata.LicenseShortName?.value) || text(metadata.UsageTerms?.value);
    if (!OPEN_LICENSE.test(license)) continue;
    const sourcePageUrl = page.fullurl ?? `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`;
    const video = page.videoinfo?.[0];
    if (!video) continue;

    const candidates = [
      ...(video.derivatives ?? []).map((item) => ({
        url: item.src,
        mime: item.type,
        height: item.height,
      })),
      { url: video.url, mime: video.mime, height: video.height },
    ]
      .filter((item): item is { url: string; mime: string | undefined; height: number | string | undefined } => Boolean(item.url))
      .filter((item) => !item.mime || item.mime.startsWith("video/") || /mpegurl|dash/i.test(item.mime));

    for (const [index, item] of candidates.slice(0, 5).entries()) {
      sources.push({
        id: `wikimedia-${page.pageid ?? page.title}-${index}`,
        provider: "wikimedia",
        providerName: "Wikimedia Commons",
        title: page.title.replace(/^File:/i, ""),
        kind: sourceKind(item.url, item.mime),
        url: item.url,
        mimeType: item.mime ?? null,
        quality: qualityLabel(item.height),
        license,
        sourcePageUrl,
        captions: [],
      });
    }
  }
  return sources;
}

type ArchiveSearchDoc = { identifier?: string; title?: string; year?: string | number };
type ArchiveFile = { name?: string; format?: string; height?: string | number; source?: string };
type ArchiveMetadata = {
  metadata?: Record<string, unknown>;
  files?: ArchiveFile[];
};

function archiveFileUrl(identifier: string, name: string): string {
  const encodedPath = name.split("/").map((part) => encodeURIComponent(part)).join("/");
  return `https://archive.org/download/${encodeURIComponent(identifier)}/${encodedPath}`;
}

function archiveMime(name: string): string | null {
  const lower = name.toLowerCase();
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".webm")) return "video/webm";
  if (lower.endsWith(".ogv") || lower.endsWith(".ogg")) return "video/ogg";
  if (lower.endsWith(".m3u8")) return "application/vnd.apple.mpegurl";
  if (lower.endsWith(".mpd")) return "application/dash+xml";
  return null;
}

function archiveCaptions(identifier: string, files: ArchiveFile[]): PlaybackCaption[] {
  return files
    .filter((file) => typeof file.name === "string" && file.name.toLowerCase().endsWith(".vtt"))
    .slice(0, 12)
    .map((file) => ({
      label: file.name!.replace(/\.vtt$/i, "").replace(/[._-]+/g, " "),
      language: "en",
      url: archiveFileUrl(identifier, file.name!),
    }));
}

async function discoverInternetArchive(title: string, context: PlaybackMatchContext): Promise<PlaybackSource[]> {
  const escapedTitle = context.title.replace(/\"/g, "");
  const query = context.episode
    ? [
        `title:(\"${escapedTitle}\")`,
        `(${[
          context.episodeTitle ? `title:(\"${context.episodeTitle.replace(/\"/g, "")}\")` : null,
          `title:(\"S${String(context.season ?? 1).padStart(2, "0")}E${String(context.episode).padStart(2, "0")}\")`,
          `title:(\"${context.season ?? 1}x${String(context.episode).padStart(2, "0")}\")`,
        ].filter(Boolean).join(" OR ")})`,
        "mediatype:movies",
      ]
    : [`title:(\"${title.replace(/\"/g, "")}\")`, "mediatype:movies"];
  if (context.type === "movie" && context.year) query.push(`year:${context.year}`);
  const params = new URLSearchParams({
    q: query.join(" AND "),
    "fl[]": "identifier,title,year",
    rows: context.episode ? "12" : "6",
    page: "1",
    output: "json",
  });
  const search = await fetch(`https://archive.org/advancedsearch.php?${params.toString()}`, {
    headers: { "User-Agent": "PandorasBox/1.0 (open-media playback discovery)" },
    next: { revalidate: 3600 },
  });
  if (!search.ok) return [];
  const searchData = await search.json() as { response?: { docs?: ArchiveSearchDoc[] } };
  const docs = (searchData.response?.docs ?? []).filter((doc) => doc.identifier && doc.title && likelyTitleMatch(context, doc.title, doc.year));
  const sources: PlaybackSource[] = [];

  for (const doc of docs.slice(0, 4)) {
    const identifier = doc.identifier!;
    const response = await fetch(`https://archive.org/metadata/${encodeURIComponent(identifier)}`, {
      headers: { "User-Agent": "PandorasBox/1.0 (open-media playback discovery)" },
      next: { revalidate: 3600 },
    });
    if (!response.ok) continue;
    const item = await response.json() as ArchiveMetadata;
    const metadata = item.metadata ?? {};
    const licenseUrl = text(metadata.licenseurl);
    const rights = text(metadata.rights);
    const license = [text(metadata.license), licenseUrl, rights].filter(Boolean).join(" · ");
    if (!OPEN_LICENSE.test(license)) continue;
    const files = item.files ?? [];
    const captions = archiveCaptions(identifier, files);
    const playable = files
      .map((file) => ({ file, mime: typeof file.name === "string" ? archiveMime(file.name) : null }))
      .filter((entry): entry is { file: ArchiveFile & { name: string }; mime: string } => Boolean(entry.file.name && entry.mime))
      .sort((a, b) => (Number(b.file.height) || 0) - (Number(a.file.height) || 0));

    for (const [index, entry] of playable.slice(0, 5).entries()) {
      const url = archiveFileUrl(identifier, entry.file.name);
      sources.push({
        id: `archive-${identifier}-${index}`,
        provider: "internet-archive",
        providerName: "Internet Archive",
        title: doc.title!,
        kind: sourceKind(url, entry.mime),
        url,
        mimeType: entry.mime,
        quality: qualityLabel(entry.file.height),
        license: license || "Open licence",
        sourcePageUrl: `https://archive.org/details/${encodeURIComponent(identifier)}`,
        captions,
      });
    }
  }
  return sources;
}

type PeerTubeSearchVideo = {
  name?: string;
  uuid?: string;
  url?: string;
  licence?: { id?: number | null; label?: string };
  privacy?: { id?: number | null; label?: string };
};

type PeerTubeVideoFile = {
  fileUrl?: string;
  playlistUrl?: string;
  resolution?: { id?: number; label?: string };
};

type PeerTubeVideo = {
  name?: string;
  licence?: { id?: number | null; label?: string };
  files?: PeerTubeVideoFile[];
  streamingPlaylists?: Array<{
    playlistUrl?: string;
    files?: PeerTubeVideoFile[];
  }>;
};

function peerTubeOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") return null;
    if (/^(10\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(host)) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function peerTubeOpenLicence(licence?: { id?: number | null; label?: string }): string | null {
  const id = licence?.id;
  const label = licence?.label?.trim() ?? "";
  if (typeof id === "number" && id >= 1 && id <= 8) return label || `PeerTube licence ${id}`;
  if (OPEN_LICENSE.test(label)) return label;
  return null;
}

async function discoverPeerTube(title: string, context: PlaybackMatchContext): Promise<PlaybackSource[]> {
  const searchParams = new URLSearchParams({
    search: title,
    count: "8",
    sort: "-match",
    nsfw: "false",
  });
  const response = await fetch(`https://sepiasearch.org/api/v1/search/videos?${searchParams.toString()}`, {
    headers: { "User-Agent": "PandorasBox/1.0 (open-media playback discovery)" },
    next: { revalidate: 900 },
  });
  if (!response.ok) return [];
  const search = await response.json() as { data?: PeerTubeSearchVideo[] };
  const matches = (search.data ?? [])
    .filter((item) => Boolean(item.uuid && item.url && item.name))
    .filter((item) => likelyTitleMatch(context, item.name!))
    .filter((item) => item.privacy?.id === 1)
    .filter((item) => Boolean(peerTubeOpenLicence(item.licence)))
    .slice(0, 4);

  const results = await Promise.allSettled(matches.map(async (match) => {
    const origin = peerTubeOrigin(match.url!);
    if (!origin) return [] as PlaybackSource[];
    const detailResponse = await fetch(`${origin}/api/v1/videos/${encodeURIComponent(match.uuid!)}`, {
      headers: { "User-Agent": "PandorasBox/1.0 (open-media playback discovery)" },
      next: { revalidate: 1800 },
    });
    if (!detailResponse.ok) return [] as PlaybackSource[];
    const video = await detailResponse.json() as PeerTubeVideo;
    const licence = peerTubeOpenLicence(video.licence ?? match.licence);
    if (!licence) return [] as PlaybackSource[];

    const candidates: Array<{ url: string; quality: string | null; mime: string | null }> = [];
    for (const file of video.files ?? []) {
      if (!file.fileUrl) continue;
      candidates.push({
        url: file.fileUrl,
        quality: file.resolution?.label ?? qualityLabel(file.resolution?.id),
        mime: "video/mp4",
      });
    }
    for (const playlist of video.streamingPlaylists ?? []) {
      if (playlist.playlistUrl) {
        candidates.push({ url: playlist.playlistUrl, quality: "Auto", mime: "application/vnd.apple.mpegurl" });
      }
      for (const file of playlist.files ?? []) {
        const url = file.fileUrl ?? file.playlistUrl;
        if (!url) continue;
        candidates.push({
          url,
          quality: file.resolution?.label ?? qualityLabel(file.resolution?.id),
          mime: file.playlistUrl ? "application/vnd.apple.mpegurl" : "video/mp4",
        });
      }
    }

    const seen = new Set<string>();
    return candidates
      .filter((item) => {
        if (seen.has(item.url)) return false;
        seen.add(item.url);
        return true;
      })
      .slice(0, 5)
      .map((item, index): PlaybackSource => ({
        id: `peertube-${match.uuid}-${index}`,
        provider: "peertube",
        providerName: "PeerTube",
        title: video.name ?? match.name!,
        kind: sourceKind(item.url, item.mime),
        url: item.url,
        mimeType: item.mime,
        quality: item.quality,
        license: licence,
        sourcePageUrl: match.url!,
        captions: [],
      }));
  }));

  return results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
}

type NasaSearchItem = {
  href?: string;
  data?: Array<{
    title?: string;
    nasa_id?: string;
    date_created?: string;
  }>;
};

function nasaAssetUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.hostname.toLowerCase() !== "images-assets.nasa.gov") return null;
    url.protocol = "https:";
    return url.toString();
  } catch {
    return null;
  }
}

function nasaQuality(url: string): string | null {
  const lower = url.toLowerCase();
  if (lower.includes("~orig.")) return "Original";
  if (lower.includes("~mobile.")) return "Mobile";
  if (lower.includes("~preview.")) return "Preview";
  if (lower.includes("~small.")) return "Small";
  return null;
}

async function discoverNasa(title: string, context: PlaybackMatchContext): Promise<PlaybackSource[]> {
  const params = new URLSearchParams({
    q: title,
    media_type: "video",
    page_size: "8",
  });
  const response = await fetch(`https://images-api.nasa.gov/search?${params.toString()}`, {
    headers: { "User-Agent": "PandorasBox/1.0 (open-media playback discovery)" },
    next: { revalidate: 1800 },
  });
  if (!response.ok) return [];

  const payload = await response.json() as { collection?: { items?: NasaSearchItem[] } };
  const matches = (payload.collection?.items ?? [])
    .map((item) => ({ item, metadata: item.data?.[0] }))
    .filter(({ item, metadata }) => Boolean(item.href && metadata?.title && metadata.nasa_id))
    .filter(({ metadata }) => {
      const year = metadata?.date_created ? new Date(metadata.date_created).getUTCFullYear() : null;
      return likelyTitleMatch(context, metadata!.title!, Number.isFinite(year) ? year : null);
    })
    .slice(0, 4);

  const results = await Promise.allSettled(matches.map(async ({ item, metadata }) => {
    const collectionUrl = safeRemoteUrl(item.href);
    if (!collectionUrl || new URL(collectionUrl).hostname.toLowerCase() !== "images-assets.nasa.gov") return [] as PlaybackSource[];

    const collectionResponse = await fetch(collectionUrl, {
      headers: { "User-Agent": "PandorasBox/1.0 (open-media playback discovery)" },
      next: { revalidate: 3600 },
    });
    if (!collectionResponse.ok) return [] as PlaybackSource[];
    const assets = await collectionResponse.json() as unknown;
    if (!Array.isArray(assets)) return [] as PlaybackSource[];

    const urls = assets
      .filter((value): value is string => typeof value === "string")
      .map(nasaAssetUrl)
      .filter((value): value is string => Boolean(value));
    const captionUrl = urls.find((url) => url.toLowerCase().endsWith(".vtt"));
    const captions: PlaybackCaption[] = captionUrl
      ? [{ label: "English", language: "en", url: captionUrl }]
      : [];
    const playable = urls
      .filter((url) => url.toLowerCase().endsWith(".mp4"))
      .sort((a, b) => {
        const rank = (url: string) => url.includes("~orig.") ? 0 : url.includes("~mobile.") ? 1 : url.includes("~small.") ? 2 : url.includes("~preview.") ? 3 : 4;
        return rank(a.toLowerCase()) - rank(b.toLowerCase());
      });

    return playable.slice(0, 4).map((url, index): PlaybackSource => ({
      id: `nasa-${metadata!.nasa_id}-${index}`,
      provider: "nasa",
      providerName: "NASA Video Library",
      title: metadata!.title!,
      kind: "direct",
      url,
      mimeType: "video/mp4",
      quality: nasaQuality(url),
      license: "NASA media usage guidelines",
      sourcePageUrl: `https://images.nasa.gov/details/${encodeURIComponent(metadata!.nasa_id!)}`,
      captions,
    }));
  }));

  return results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
}

type EuropeanaItem = {
  id?: string;
  title?: string[] | string;
  year?: string[] | string;
  type?: string[] | string;
  rights?: string[] | string;
  edmIsShownBy?: string[] | string;
  edmHasView?: string[] | string;
};

function stringValues(value: unknown): string[] {
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim());
}

async function discoverEuropeana(title: string, context: PlaybackMatchContext): Promise<PlaybackSource[]> {
  const apiKey = process.env.EUROPEANA_API_KEY?.trim() || "api2demo";
  const params = new URLSearchParams({
    wskey: apiKey,
    query: title,
    qf: "TYPE:VIDEO",
    media: "true",
    reusability: "open",
    profile: "rich",
    rows: "8",
  });
  const response = await fetch(`https://api.europeana.eu/record/v2/search.json?${params.toString()}`, {
    headers: { "User-Agent": "PandorasBox/1.0 (open-media playback discovery)" },
    next: { revalidate: 1800 },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) return [];

  const payload = await response.json() as { success?: boolean; items?: EuropeanaItem[] };
  if (payload.success === false) return [];
  const sources: PlaybackSource[] = [];

  for (const item of payload.items ?? []) {
    const itemTitle = stringValues(item.title)[0];
    const itemYear = stringValues(item.year)[0];
    const itemType = stringValues(item.type).join(" ");
    const rights = stringValues(item.rights);
    const license = rights.join(" · ");
    if (!item.id || !itemTitle || !/video/i.test(itemType) || !OPEN_LICENSE.test(license)) continue;
    if (!likelyTitleMatch(context, itemTitle, itemYear)) continue;

    const rawUrls = [...stringValues(item.edmIsShownBy), ...stringValues(item.edmHasView)];
    const captions = rawUrls
      .map((value) => safeRemoteUrl(value))
      .filter((value): value is string => Boolean(value))
      .filter((value) => new URL(value).pathname.toLowerCase().endsWith(".vtt"))
      .slice(0, 8)
      .map((url): PlaybackCaption => ({ label: "Subtitles", language: "und", url }));

    const seenUrls = new Set<string>();
    const playable = rawUrls
      .map((value) => safeRemoteUrl(value))
      .filter((value): value is string => Boolean(value))
      .map((url) => ({ url, mime: mediaMimeFromUrl(url) }))
      .filter((entry): entry is { url: string; mime: string } => Boolean(entry.mime))
      .filter((entry) => {
        if (seenUrls.has(entry.url)) return false;
        seenUrls.add(entry.url);
        return true;
      });

    for (const [index, entry] of playable.slice(0, 5).entries()) {
      sources.push({
        id: `europeana-${item.id.replace(/[^a-zA-Z0-9._-]+/g, "-")}-${index}`,
        provider: "europeana",
        providerName: "Europeana",
        title: itemTitle,
        kind: sourceKind(entry.url, entry.mime),
        url: entry.url,
        mimeType: entry.mime,
        quality: qualityFromUrl(entry.url),
        license,
        sourcePageUrl: `https://www.europeana.eu/item${item.id}`,
        captions,
      });
    }
  }

  return sources;
}

type DvidsSearchResult = {
  id?: string;
  type?: string;
  title?: string;
  date?: string;
  hd?: boolean;
  hls_url?: string;
  url?: string;
};

async function discoverDvids(title: string, context: PlaybackMatchContext): Promise<PlaybackSource[]> {
  const apiKey = process.env.DVIDS_API_KEY?.trim();
  if (!apiKey) return [];

  const params = new URLSearchParams({
    api_key: apiKey,
    q: title,
    type: "video",
    hd: "1",
    max_results: "8",
    sort: "score",
  });
  const response = await fetch(`https://api.dvidshub.net/search?${params.toString()}`, {
    headers: { "Accept": "application/json", "User-Agent": "PandorasBox/1.0 (open-media playback discovery)" },
    next: { revalidate: 1800 },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) return [];

  const payload = await response.json() as { results?: DvidsSearchResult[] };
  return (payload.results ?? [])
    .filter((item) => item.type === "video" && Boolean(item.id && item.title && item.hls_url && item.url))
    .filter((item) => {
      const year = item.date ? new Date(item.date).getUTCFullYear() : null;
      return likelyTitleMatch(context, item.title!, Number.isFinite(year) ? year : null);
    })
    .slice(0, 5)
    .map((item, index): PlaybackSource | null => {
      const streamUrl = safeRemoteUrl(item.hls_url);
      const sourcePageUrl = safeRemoteUrl(item.url);
      if (!streamUrl || !sourcePageUrl) return null;
      return {
        id: `dvids-${item.id!.replace(/[^a-zA-Z0-9._-]+/g, "-")}-${index}`,
        provider: "dvids",
        providerName: "DVIDS",
        title: item.title!,
        kind: "hls",
        url: streamUrl,
        mimeType: "application/vnd.apple.mpegurl",
        quality: item.hd ? "HD" : null,
        license: "DVIDS U.S. Government public media; item-specific restrictions may apply",
        sourcePageUrl,
        captions: [],
      };
    })
    .filter((source): source is PlaybackSource => Boolean(source));
}

export async function discoverPlaybackSources(params: {
  title: string;
  type: string;
  year?: number | null;
  season?: number | null;
  episode?: number | null;
  episodeTitle?: string | null;
}): Promise<PlaybackSource[]> {
  const episodeSuffix = params.episode
    ? ` S${String(params.season ?? 1).padStart(2, "0")}E${String(params.episode).padStart(2, "0")}${params.episodeTitle ? ` ${params.episodeTitle}` : ""}`
    : "";
  const searchTitle = `${params.title}${episodeSuffix}`.trim();
  const results = await Promise.allSettled([
    discoverMediaServers(params),
    discoverConfiguredFeeds(params),
    discoverWikimedia(searchTitle, params),
    discoverInternetArchive(searchTitle, params),
    discoverPeerTube(searchTitle, params),
    discoverNasa(searchTitle, params),
    discoverEuropeana(searchTitle, params),
    discoverDvids(searchTitle, params),
  ]);
  const seen = new Set<string>();
  return results
    .flatMap((result) => result.status === "fulfilled" ? result.value : [])
    .filter((source) => {
      if (seen.has(source.url)) return false;
      seen.add(source.url);
      return true;
    })
    .slice(0, 24);
}
