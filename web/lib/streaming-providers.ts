/** TMDB watch-provider ids (US region) for the major streaming services. */
export interface StreamingProvider {
  slug: string;
  name: string;
  tmdbId: number;
  /** TMDB `logo_path`, rendered via logoUrl(). Verified against /watch/providers. */
  logoPath: string;
}

export const STREAMING_PROVIDERS: StreamingProvider[] = [
  { slug: "netflix", name: "Netflix", tmdbId: 8, logoPath: "/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg" },
  { slug: "hulu", name: "Hulu", tmdbId: 15, logoPath: "/bxBlRPEPpMVDc4jMhSrTf2339DW.jpg" },
  { slug: "peacock", name: "Peacock", tmdbId: 386, logoPath: "/2aGrp1xw3qhwCYvNGAJZPdjfeeX.jpg" },
  { slug: "disney-plus", name: "Disney+", tmdbId: 337, logoPath: "/97yvRBw1GzX7fXprcF80er19ot.jpg" },
  { slug: "prime-video", name: "Prime Video", tmdbId: 9, logoPath: "/pvske1MyAoymrs5bguRfVqYiM9a.jpg" },
  { slug: "max", name: "Max", tmdbId: 1899, logoPath: "/jbe4gVSfRlbPTdESXhEKpornsfu.jpg" },
  // 531 ("Paramount Plus") is not in TMDB's US provider list and yields only a
  // handful of results; 2303 is the live US catalogue (~1,000 titles).
  { slug: "paramount-plus", name: "Paramount+", tmdbId: 2303, logoPath: "/fts6X10Jn4QT0X6ac3udKEn2tJA.jpg" },
  { slug: "apple-tv-plus", name: "Apple TV+", tmdbId: 350, logoPath: "/mcbz1LgtErU9p4UdbZ0rG6RTWHX.jpg" },
  { slug: "crunchyroll", name: "Crunchyroll", tmdbId: 283, logoPath: "/fzN5Jok5Ig1eJ7gyNGoMhnLSCfh.jpg" },
  { slug: "hidive", name: "HiDive", tmdbId: 430, logoPath: "/iCV9oPBeoLDC5okFRZEgQkx7je0.jpg" },
];

/** Provider logos are small square marks — w92 is ample and stays crisp at 20px. */
export function providerLogoUrl(provider: StreamingProvider): string {
  return `https://image.tmdb.org/t/p/w92${provider.logoPath}`;
}

export function getStreamingProvider(slug: string): StreamingProvider | null {
  return STREAMING_PROVIDERS.find((p) => p.slug === slug) ?? null;
}
