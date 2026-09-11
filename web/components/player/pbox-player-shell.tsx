"use client";

import { useEffect, useRef, useState } from "react";
import { FileVideo2, Link2, PlaySquare, Server, Settings2, ShieldCheck, X } from "lucide-react";
import type { PlaybackSource } from "@/lib/playback/types";
import { PBoxPlayer } from "./pbox-player";
import { PlayerQuickSettings } from "./player-quick-settings";

type PlaybackConfiguration = {
  jellyfin: boolean;
  emby: boolean;
  configuredFeed: boolean;
  hasPrivateSource: boolean;
};

function manualStreamKind(url: string): Pick<PlaybackSource, "kind" | "mimeType"> {
  const path = new URL(url).pathname.toLowerCase();
  if (path.endsWith(".m3u8")) return { kind: "hls", mimeType: "application/vnd.apple.mpegurl" };
  if (path.endsWith(".mpd")) return { kind: "dash", mimeType: "application/dash+xml" };
  if (path.endsWith(".webm")) return { kind: "direct", mimeType: "video/webm" };
  if (path.endsWith(".mov")) return { kind: "direct", mimeType: "video/quicktime" };
  return { kind: "direct", mimeType: path.endsWith(".mp4") ? "video/mp4" : null };
}

function authorisedMediaUrl(value: string, label: string): URL {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`Enter a ${label} URL.`);
  const parsed = new URL(trimmed, window.location.href);
  const isSecure = parsed.protocol === "https:";
  const isSameOrigin = parsed.origin === window.location.origin;
  if (!isSecure && !isSameOrigin) throw new Error(`Use an HTTPS ${label} URL.`);
  return parsed;
}

function ManualStreamDialog({
  open,
  mediaLabel,
  onClose,
  onSelect,
}: {
  open: boolean;
  mediaLabel: string;
  onClose: () => void;
  onSelect: (source: PlaybackSource) => void;
}) {
  const [streamUrl, setStreamUrl] = useState("");
  const [subtitleUrl, setSubtitleUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setStreamUrl("");
      setSubtitleUrl("");
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const submit = () => {
    try {
      const parsedStream = authorisedMediaUrl(streamUrl, "stream");

      const captions = [] as PlaybackSource["captions"];
      if (subtitleUrl.trim()) {
        const parsedSubtitle = authorisedMediaUrl(subtitleUrl, "subtitle");
        captions.push({ label: "External subtitles", language: "en", url: parsedSubtitle.toString() });
      }

      const stream = parsedStream.toString();
      const inferred = manualStreamKind(stream);
      onSelect({
        id: `manual-${Date.now()}`,
        provider: "manual-stream",
        providerName: "Authorised stream",
        title: mediaLabel,
        kind: inferred.kind,
        url: stream,
        mimeType: inferred.mimeType,
        quality: "Auto",
        license: "User-authorised stream",
        sourcePageUrl: stream,
        captions,
      });
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Enter a valid HTTPS media URL.");
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add authorised stream"
        className="w-full max-w-lg rounded-[24px] border border-white/10 bg-[#0d0d12] p-5 text-left shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">PBox source</p>
            <h3 className="mt-1 font-display text-xl font-extrabold text-white">Add authorised stream</h3>
            <p className="mt-1 text-xs text-white/45">{mediaLabel}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-white/45 transition hover:bg-white/10 hover:text-white" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>

        <label className="mt-5 block text-xs font-bold text-white/70">
          Video stream URL
          <input
            value={streamUrl}
            onChange={(event) => setStreamUrl(event.target.value)}
            placeholder="https://…/stream.m3u8, .mpd or .mp4"
            inputMode="url"
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/45 px-3 py-3 text-sm font-normal text-white outline-none transition placeholder:text-white/25 focus:border-[var(--accent)]"
          />
        </label>
        <label className="mt-3 block text-xs font-bold text-white/70">
          Subtitle URL <span className="font-normal text-white/35">(optional WebVTT)</span>
          <input
            value={subtitleUrl}
            onChange={(event) => setSubtitleUrl(event.target.value)}
            placeholder="https://…/subtitles.vtt"
            inputMode="url"
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/45 px-3 py-3 text-sm font-normal text-white outline-none transition placeholder:text-white/25 focus:border-[var(--accent)]"
          />
        </label>
        <p className="mt-3 text-[11px] leading-relaxed text-white/40">Paste a direct HLS, DASH or video URL you are authorised to use. The source is attached only to the selected title or episode and is cleared when you switch media.</p>
        {error && <p className="mt-3 rounded-xl border border-red-400/15 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full border border-white/10 px-4 py-2 text-xs font-bold text-white/60 transition hover:bg-white/8 hover:text-white">Cancel</button>
          <button type="button" onClick={submit} className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-extrabold text-black transition hover:brightness-110">
            <PlaySquare className="size-3.5" /> Load in PBox
          </button>
        </div>
      </div>
    </div>
  );
}

export function PBoxPlayerShell({
  itemId,
  title,
  titleAliases = [],
  type,
  year,
  season = null,
  episode = null,
  episodeTitle = null,
  isFinalEpisode = false,
  showUnavailable = false,
  onAutoNext,
  nextLabel,
  onOpenEpisodes,
  onWatchPartyMediaChange,
}: {
  itemId: string;
  title: string;
  titleAliases?: string[];
  type: string;
  year: number | null;
  season?: number | null;
  episode?: number | null;
  episodeTitle?: string | null;
  isFinalEpisode?: boolean;
  showUnavailable?: boolean;
  onAutoNext?: () => void;
  nextLabel?: string;
  onOpenEpisodes?: () => void;
  onWatchPartyMediaChange?: (media: { season: number | null; episode: number | null }) => void;
}) {
  const [sources, setSources] = useState<PlaybackSource[] | null>(null);
  const [configuration, setConfiguration] = useState<PlaybackConfiguration | null>(null);
  const [quickSettingsOpen, setQuickSettingsOpen] = useState(false);
  const [localSource, setLocalSource] = useState<PlaybackSource | null>(null);
  const [manualSource, setManualSource] = useState<PlaybackSource | null>(null);
  const [manualStreamOpen, setManualStreamOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => () => {
    if (localSource?.url.startsWith("blob:")) URL.revokeObjectURL(localSource.url);
  }, [localSource]);

  useEffect(() => {
    setLocalSource(null);
    setManualSource(null);
    setManualStreamOpen(false);
  }, [episode, itemId, season, type]);

  useEffect(() => {
    if (type !== "movie" && type !== "series" && type !== "anime") return;
    const controller = new AbortController();
    const params = new URLSearchParams({ title, type });
    for (const alias of titleAliases) {
      const value = alias.trim();
      if (value && value.toLowerCase() !== title.toLowerCase()) params.append("alias", value);
    }
    if (year) params.set("year", String(year));
    if (season) params.set("season", String(season));
    if (episode) params.set("episode", String(episode));
    if (episodeTitle) params.set("episodeTitle", episodeTitle);
    queueMicrotask(() => setSources(null));
    void fetch(`/api/playback/sources?${params.toString()}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Playback discovery failed");
        const data = await response.json() as { sources?: PlaybackSource[]; configuration?: PlaybackConfiguration };
        setSources(data.sources ?? []);
        setConfiguration(data.configuration ?? null);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSources([]);
        setConfiguration(null);
      });
    return () => controller.abort();
  }, [episode, episodeTitle, season, title, titleAliases, type, year]);

  if (type !== "movie" && type !== "series" && type !== "anime") return null;
  const activeUserSource = manualSource ?? localSource;
  const mediaLabel = episode ? `${title} · S${season ?? 1}E${episode}` : title;
  if (activeUserSource) {
    const isManualStream = activeUserSource.provider === "manual-stream";
    return (
      <section id="pbox-player" className="scroll-mt-24 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <PlaySquare className="size-5 text-[var(--accent)]" />
          <h2 className="font-display text-xl font-bold">PBox Player</h2>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-300"><ShieldCheck className="size-3" /> {isManualStream ? "Authorised stream" : "Local media"}</span>
          <span className="max-w-[min(60vw,520px)] truncate text-xs text-[var(--text-muted)]">{activeUserSource.title}</span>
        </div>
        <PBoxPlayer
          key={`${itemId}:${type}:${season ?? 0}:${episode ?? 0}:user:${activeUserSource.id}`}
          itemId={itemId}
          title={title}
          mediaType={type as "movie" | "series" | "anime"}
          episodeContext={episode ? { season, episode, isFinalEpisode } : undefined}
          sources={[activeUserSource]}
          onAutoNext={onAutoNext}
          nextLabel={nextLabel}
          onOpenEpisodes={onOpenEpisodes}
          onWatchPartyMediaChange={onWatchPartyMediaChange}
        />
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => setManualStreamOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 py-2 text-xs font-semibold text-white/65 transition hover:bg-white/[0.07] hover:text-white"
          >
            <Link2 className="size-3.5" /> {isManualStream ? "Change stream" : "Use stream URL"}
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 py-2 text-xs font-semibold text-white/65 transition hover:bg-white/[0.07] hover:text-white"
          >
            <FileVideo2 className="size-3.5" /> Change local video
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,.mkv,.m4v,.mov,.webm,.ogv"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const url = URL.createObjectURL(file);
            setLocalSource((current) => {
              if (current?.url.startsWith("blob:")) URL.revokeObjectURL(current.url);
              return {
                id: `local-${file.name}-${file.lastModified}`,
                provider: "local-file",
                providerName: "Local file",
                title: file.name,
                kind: "direct",
                url,
                mimeType: file.type || null,
                quality: null,
                license: "User-selected local media",
                sourcePageUrl: "",
                captions: [],
              };
            });
            setManualSource(null);
            event.currentTarget.value = "";
          }}
        />
        <ManualStreamDialog
          open={manualStreamOpen}
          mediaLabel={mediaLabel}
          onClose={() => setManualStreamOpen(false)}
          onSelect={(source) => {
            setLocalSource(null);
            setManualSource(source);
          }}
        />
      </section>
    );
  }
  if (sources !== null && sources.length === 0) {
    if (!showUnavailable) return null;
    const providerMissing = configuration?.hasPrivateSource === false;
    return (
      <section id="pbox-player" className="scroll-mt-24">
        <div className="rounded-[var(--radius-lg)] border border-white/10 bg-black/55 px-6 py-14 text-center shadow-2xl backdrop-blur-xl">
          {providerMissing ? <Server className="mx-auto size-9 text-[var(--accent)]" /> : <PlaySquare className="mx-auto size-9 text-[var(--accent)]" />}
          <h2 className="mt-4 font-display text-2xl font-bold text-white">
            {providerMissing ? "Connect a playback source" : "No stream found for this title"}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-white/55">
            {providerMissing
              ? `This PBox deployment has no Jellyfin, Emby, or authorised playback feed configured, so ${episode ? "this episode" : "this title"} has nowhere to load video from inside the site.`
              : `A playback source is connected, but ${episode ? "this episode" : "this title"} was not found in it and no matching verified open source was available.`}
          </p>
          <div className="mx-auto mt-5 flex max-w-md flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setManualStreamOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-extrabold text-black shadow-lg shadow-black/30 transition hover:brightness-110"
            >
              <Link2 className="size-4" /> Add stream URL
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-5 py-2.5 text-sm font-bold text-white/70 transition hover:bg-white/[0.08] hover:text-white"
            >
              <FileVideo2 className="size-4" /> Open local video
            </button>
            <button
              type="button"
              onClick={() => setQuickSettingsOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-5 py-2.5 text-sm font-bold text-white/70 transition hover:bg-white/[0.08] hover:text-white"
            >
              <Settings2 className="size-4" /> Playback settings
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,.mkv,.m4v,.mov,.webm,.ogv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const url = URL.createObjectURL(file);
              setLocalSource({
                id: `local-${file.name}-${file.lastModified}`,
                provider: "local-file",
                providerName: "Local file",
                title: file.name,
                kind: "direct",
                url,
                mimeType: file.type || null,
                quality: null,
                license: "User-selected local media",
                sourcePageUrl: "",
                captions: [],
              });
              setManualSource(null);
              event.currentTarget.value = "";
            }}
          />
        </div>
        <PlayerQuickSettings open={quickSettingsOpen} onClose={() => setQuickSettingsOpen(false)} configuration={configuration} />
        <ManualStreamDialog
          open={manualStreamOpen}
          mediaLabel={mediaLabel}
          onClose={() => setManualStreamOpen(false)}
          onSelect={(source) => {
            setLocalSource(null);
            setManualSource(source);
          }}
        />
      </section>
    );
  }
  if (sources === null) {
    return (
      <section id="pbox-player" className="scroll-mt-24 space-y-3">
        <div className="flex items-center gap-2">
          <PlaySquare className="size-5 text-[var(--accent)]" />
          <h2 className="font-display text-xl font-bold">PBox Player</h2>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white/55"><ShieldCheck className="size-3" /> Checking sources</span>
        </div>
        <div className="skeleton aspect-video w-full rounded-[var(--radius-lg)]" />
      </section>
    );
  }

  const providerNames = Array.from(new Set(sources.map((source) => source.providerName)));
  const hasPrivateSource = sources.some((source) => source.provider === "jellyfin" || source.provider === "emby" || source.provider === "configured-feed");

  return (
    <section id="pbox-player" className="scroll-mt-24 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <PlaySquare className="size-5 text-[var(--accent)]" />
        <h2 className="font-display text-xl font-bold">PBox Player</h2>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-300"><ShieldCheck className="size-3" /> {hasPrivateSource ? "Connected source" : "Verified open source"}</span>
        <span className="text-xs text-[var(--text-muted)]">{providerNames.join(" / ")}</span>
      </div>
      <PBoxPlayer
        key={`${itemId}:${type}:${season ?? 0}:${episode ?? 0}`}
        itemId={itemId}
        title={title}
        mediaType={type as "movie" | "series" | "anime"}
        episodeContext={episode ? { season, episode, isFinalEpisode } : undefined}
        sources={sources}
        onAutoNext={onAutoNext}
        nextLabel={nextLabel}
        onOpenEpisodes={onOpenEpisodes}
        onWatchPartyMediaChange={onWatchPartyMediaChange}
      />
    </section>
  );
}
