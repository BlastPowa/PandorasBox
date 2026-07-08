/** TMDB watch-provider ids (US region) for the major streaming services. */
export interface StreamingProvider {
  slug: string;
  name: string;
  tmdbId: number;
}

export const STREAMING_PROVIDERS: StreamingProvider[] = [
  { slug: "netflix", name: "Netflix", tmdbId: 8 },
  { slug: "hulu", name: "Hulu", tmdbId: 15 },
  { slug: "peacock", name: "Peacock", tmdbId: 386 },
  { slug: "disney-plus", name: "Disney+", tmdbId: 337 },
  { slug: "prime-video", name: "Prime Video", tmdbId: 9 },
  { slug: "max", name: "Max", tmdbId: 1899 },
  { slug: "paramount-plus", name: "Paramount+", tmdbId: 531 },
  { slug: "apple-tv-plus", name: "Apple TV+", tmdbId: 350 },
  { slug: "crunchyroll", name: "Crunchyroll", tmdbId: 283 },
  { slug: "hidive", name: "HiDive", tmdbId: 430 },
];

export function getStreamingProvider(slug: string): StreamingProvider | null {
  return STREAMING_PROVIDERS.find((p) => p.slug === slug) ?? null;
}
