import { NextResponse, type NextRequest } from "next/server";
import { discoverTitles } from "@/lib/discover";
import { genresFor, isSortKey, browseYears, type MediaKind } from "@/lib/browse-filters";
import { getStreamingProvider } from "@/lib/streaming-providers";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const limit = rateLimit(request, "discover", 40, 60_000);
  if (!limit.ok) return tooManyRequests(limit);

  const { searchParams } = new URL(request.url);

  const kindParam = searchParams.get("kind");
  const kind: MediaKind = kindParam === "tv" ? "tv" : "movie";

  // Validate every client-supplied value against a server-side allowlist —
  // never interpolate raw query params into the TMDB request.
  const genreParam = searchParams.get("genre");
  const genre = genreParam && genresFor(kind).includes(genreParam) ? genreParam : null;

  const sortParam = searchParams.get("sort") ?? "popular";
  const sort = isSortKey(sortParam) ? sortParam : "popular";

  const yearParam = Number.parseInt(searchParams.get("year") ?? "", 10);
  const year = browseYears().includes(yearParam) ? yearParam : null;

  const providerSlug = searchParams.get("provider");
  const provider = providerSlug ? getStreamingProvider(providerSlug) : null;

  const pageParam = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const page = Number.isFinite(pageParam) ? Math.min(Math.max(pageParam, 1), 500) : 1;

  try {
    const data = await discoverTitles({
      kind,
      genre,
      year,
      sort,
      provider: provider ? String(provider.tmdbId) : null,
      page,
    });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Discover failed", results: [], page: 1, totalPages: 0 },
      { status: 500 }
    );
  }
}
