import "server-only";
import type { PlaybackCaption, PlaybackSource, PlaybackSourceKind } from "./types";

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

function likelyTitleMatch(query: string, candidate: string): boolean {
  const wanted = normaliseTitle(query);
  const found = normaliseTitle(candidate.replace(/^File:/i, ""));
  return wanted.length >= 3 && (found.includes(wanted) || wanted.includes(found));
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

async function discoverWikimedia(title: string): Promise<PlaybackSource[]> {
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
    if (!page.title || !likelyTitleMatch(title, page.title)) continue;
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

async function discoverInternetArchive(title: string, year?: number | null): Promise<PlaybackSource[]> {
  const query = [`title:(\"${title.replace(/\"/g, "")}\")`, "mediatype:movies"];
  if (year) query.push(`year:${year}`);
  const params = new URLSearchParams({
    q: query.join(" AND "),
    "fl[]": "identifier,title,year",
    rows: "6",
    page: "1",
    output: "json",
  });
  const search = await fetch(`https://archive.org/advancedsearch.php?${params.toString()}`, {
    headers: { "User-Agent": "PandorasBox/1.0 (open-media playback discovery)" },
    next: { revalidate: 3600 },
  });
  if (!search.ok) return [];
  const searchData = await search.json() as { response?: { docs?: ArchiveSearchDoc[] } };
  const docs = (searchData.response?.docs ?? []).filter((doc) => doc.identifier && doc.title && likelyTitleMatch(title, doc.title));
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

async function discoverPeerTube(title: string): Promise<PlaybackSource[]> {
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
    .filter((item) => likelyTitleMatch(title, item.name!))
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

export async function discoverPlaybackSources(params: {
  title: string;
  type: string;
  year?: number | null;
  season?: number | null;
  episode?: number | null;
  episodeTitle?: string | null;
}): Promise<PlaybackSource[]> {
  const episodeSuffix = params.episode
    ? params.episodeTitle
      ? ` ${params.episodeTitle}`
      : ` S${params.season ?? 1}E${params.episode}`
    : "";
  const searchTitle = `${params.title}${episodeSuffix}`.trim();
  const results = await Promise.allSettled([
    discoverWikimedia(searchTitle),
    discoverInternetArchive(searchTitle, params.type === "movie" ? params.year : null),
    discoverPeerTube(searchTitle),
  ]);
  return results
    .flatMap((result) => result.status === "fulfilled" ? result.value : [])
    .slice(0, 18);
}
