export type PlaybackSourceKind = "direct" | "hls" | "dash";

export interface PlaybackCaption {
  label: string;
  language: string;
  url: string;
}

export interface PlaybackSource {
  id: string;
  provider: "configured-feed" | "local-file" | "manual-stream" | "wikimedia" | "internet-archive" | "peertube" | "nasa" | "europeana" | "dvids" | "jellyfin" | "emby";
  providerName: string;
  title: string;
  kind: PlaybackSourceKind;
  url: string;
  mimeType: string | null;
  quality: string | null;
  license: string;
  sourcePageUrl: string;
  captions: PlaybackCaption[];
}
