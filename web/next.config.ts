import type { NextConfig } from "next";
import path from "path";

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  // React/Next require inline; eval kept for dev/runtime chunk loading
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  // Images are now loaded straight from their source CDNs (see lib/image-loader.ts),
  // not proxied through /_next/image, so every host must be listed here.
  "img-src 'self' data: blob: https://image.tmdb.org https://s4.anilist.co https://uploads.mangadex.org https://mangadex.org https://cdn.myanimelist.net https://comicvine.gamespot.com https://static.comicvine.com https://*.supabase.co",
  "media-src 'self' https:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.themoviedb.org https://graphql.anilist.co https://api.mangadex.org https://uploads.mangadex.org https://api.jikan.moe https://www.omdbapi.com https://openlibrary.org",
  "frame-src https://www.youtube-nocookie.com https://www.youtube.com",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, ".."),
  poweredByHeader: false,
  images: {
    // Serve remote artwork directly from the source CDNs instead of Vercel's
    // Image Optimization. These providers already return correctly-sized,
    // CDN-cached files, so optimizing them re-encoded images for no benefit and
    // consumed the free tier's 5,000 transformations/month. See lib/image-loader.ts.
    loader: "custom",
    loaderFile: "./lib/image-loader.ts",
    // Next's defaults go up to 3840px, so a 128px poster was being offered an
    // "original" candidate (and got one as its src= fallback). Nothing here
    // needs more than ~1200px — the full-bleed hero is a CSS background, not
    // next/image — so cap the candidate set and keep posters on small buckets.
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [64, 96, 128, 256, 384],
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org" },
      { protocol: "https", hostname: "s4.anilist.co" },
      { protocol: "https", hostname: "uploads.mangadex.org" },
      { protocol: "https", hostname: "mangadex.org" },
      { protocol: "https", hostname: "cdn.myanimelist.net" },
      { protocol: "https", hostname: "comicvine.gamespot.com" },
      { protocol: "https", hostname: "static.comicvine.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  // Tree-shakes barrel-style imports from these packages so pages only ship
  // the icons/primitives they actually use instead of the whole library.
  experimental: {
    optimizePackageImports: ["lucide-react", "@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
