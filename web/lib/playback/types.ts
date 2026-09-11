export type PlaybackSourceKind = "direct" | "hls" | "dash";

export interface PlaybackCaption {
  label: string;
  language: string;
  url: string;
}

export interface PlaybackSource {
  id: string;
  provider: "wikimedia" | "internet-archive" | "peertube";
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
