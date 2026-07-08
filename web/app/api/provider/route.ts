import { NextResponse, type NextRequest } from "next/server";
import { getByStreamingProvider } from "@/lib/discovery";
import { getStreamingProvider } from "@/lib/streaming-providers";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const limit = rateLimit(request, "provider", 30, 60_000);
  if (!limit.ok) return tooManyRequests(limit);

  const { searchParams } = new URL(request.url);

  // Only ever resolve a provider through the server-side config table — never
  // pass a client-supplied numeric id straight through to TMDB.
  const provider = getStreamingProvider(searchParams.get("slug") ?? "");
  if (!provider) {
    return NextResponse.json({ error: "Unknown provider", results: [] }, { status: 400 });
  }

  const kind = searchParams.get("kind") === "tv" ? "tv" : "movie";

  try {
    const results = await getByStreamingProvider(provider.tmdbId, kind);
    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load provider", results: [] },
      { status: 500 }
    );
  }
}
