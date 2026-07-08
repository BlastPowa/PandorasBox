/**
 * Custom next/image loader.
 *
 * TMDB, AniList, MangaDex, MAL and Comic Vine all serve their artwork from
 * their own CDNs, already resized and cached. Routing those through Vercel's
 * Image Optimization re-encodes images that are *already* the correct size, and
 * bills one transformation per unique (src, width, quality) — which is what
 * pushed this project to 75% of the free tier's 5,000/month.
 *
 * So: for TMDB we swap in the nearest official size bucket (a plain CDN URL, no
 * transformation), and for every other remote host we pass the URL through
 * untouched. Result: zero Vercel transformations, and bytes served from CDNs
 * that are geographically closer and already warm.
 *
 * Trade-off: we forgo Vercel's AVIF/WebP re-encoding. For poster-sized JPEGs
 * that TMDB already compresses hard, the saving was marginal — and it is not
 * worth breaking every image on the site once the quota runs out.
 */

/** Sizes TMDB actually publishes under /t/p/. Anything else 404s. */
const TMDB_WIDTHS = [92, 154, 185, 342, 500, 780, 1280] as const;

function tmdbBucket(width: number): string {
  const match = TMDB_WIDTHS.find((w) => w >= width);
  return match ? `w${match}` : "original";
}

export default function imageLoader({ src, width }: { src: string; width: number; quality?: number }): string {
  // TMDB paths look like https://image.tmdb.org/t/p/<size>/<hash>.jpg — rewrite
  // <size> to the smallest bucket that still covers the requested width so we
  // never upscale a thumbnail or ship a 1280px file into a 150px slot.
  if (src.includes("image.tmdb.org/t/p/")) {
    return src.replace(/\/t\/p\/[^/]+\//, `/t/p/${tmdbBucket(width)}/`);
  }

  // Everything else (AniList, MangaDex, MAL, Comic Vine, Supabase avatars) has
  // no size-in-path convention we can safely rewrite. Serve as-is.
  return src;
}
