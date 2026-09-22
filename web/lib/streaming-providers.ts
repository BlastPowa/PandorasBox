/** TMDB watch-provider ids for the full streaming row used by Home/Discover. */
export interface StreamingProvider {
  slug: string;
  name: string;
  tmdbId: number;
  /** TMDB `logo_path`, rendered via logoUrl(). Verified against /watch/providers. */
  logoPath: string;
}

export const STREAMING_PROVIDERS: StreamingProvider[] = [
  { slug: "netflix", name: "Netflix", tmdbId: 8, logoPath: "/rK1KljqmbvO9HQa1PBFLILWah72.png" },
  { slug: "prime-video", name: "Amazon Prime Video", tmdbId: 9, logoPath: "/gMZdpavHmxFNnLpMHwVxfqeux2g.png" },
  { slug: "disney-plus", name: "Disney+", tmdbId: 337, logoPath: "/5eZ872CghnHFLB1j8grszbrx0dx.png" },
  { slug: "apple-tv-plus", name: "Apple TV+", tmdbId: 350, logoPath: "/9icYBfYFcwgCbky5VdGUIKJ4C5i.png" },
  { slug: "apple-tv", name: "Apple TV", tmdbId: 2, logoPath: "/qdEGArH3lKfFnAtYXMkSYk5wxuG.png" },
  { slug: "hulu", name: "Hulu", tmdbId: 15, logoPath: "/44uAnmSqvA4yBOdbPWN8YgQHjWm.png" },
  { slug: "max", name: "HBO Max", tmdbId: 1899, logoPath: "/skypuy7SXuugIQeYg0IglmzoKaS.png" },
  { slug: "paramount-plus", name: "Paramount+", tmdbId: 2303, logoPath: "/4N4BMd0Mm0kHAmF7RZgL5lW3cwc.png" },
  { slug: "peacock", name: "Peacock Premium", tmdbId: 386, logoPath: "/a1UIdq5BrkcAxnxcUhFsNbXnxeu.png" },
  { slug: "crunchyroll", name: "Crunchyroll", tmdbId: 283, logoPath: "/uFL3c4Cq8M6WoLymlC5Y8bmGytV.png" },
  { slug: "starz", name: "Starz", tmdbId: 43, logoPath: "/h25xjouKmiSmFiiqw0aDXbxGZo7.png" },
  { slug: "amc-plus", name: "AMC+", tmdbId: 526, logoPath: "/wsCUflcmL4dCkzBUaGP8cj1cTkh.png" },
  { slug: "mgm-plus", name: "MGM Plus", tmdbId: 34, logoPath: "/q63Uzpu7JAs566vA2G23Lk7LcID.png" },
  { slug: "youtube-premium", name: "YouTube Premium", tmdbId: 188, logoPath: "/eWHpKZihdiY617s5LipWJWvN28U.png" },
  { slug: "youtube", name: "YouTube", tmdbId: 192, logoPath: "/5Maob4o5w8oZnNeYpCDyVFD3M7X.png" },
  { slug: "tubi", name: "Tubi TV", tmdbId: 73, logoPath: "/9dEuvA8wg5TSeFBZlPxSVxFdimJ.png" },
  { slug: "pluto-tv", name: "Pluto TV", tmdbId: 300, logoPath: "/fN4czqaMQNLeF6sSSIjGbAWzvwK.png" },
  { slug: "hidive", name: "HiDive", tmdbId: 430, logoPath: "/1743zXk6Hn0afaarNtp6bXVMlsT.png" },
];

/** Provider logos are small square marks — w92 is ample and stays crisp at 20px. */
export function providerLogoUrl(provider: StreamingProvider): string {
  return `https://image.tmdb.org/t/p/w92${provider.logoPath}`;
}

export function getStreamingProvider(slug: string): StreamingProvider | null {
  return STREAMING_PROVIDERS.find((p) => p.slug === slug) ?? null;
}
