export type PlaybackSourceKind = "direct" | "hls" | "dash";

export interface PlaybackCaption {
  label: string;
  language: string;
  url: string;
}

export interface PlaybackSource {
  id: string;
  provider: "configured-feed" | "wikimedia" | "internet-archive" | "peertube" | "nasa";
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
