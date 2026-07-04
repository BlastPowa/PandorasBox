import { NextResponse, type NextRequest } from "next/server";
import { getJikanEpisodeDetail } from "@core/api/jikan";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const limit = rateLimit(request, "anime-episode", 60, 60_000);
  if (!limit.ok) return tooManyRequests(limit);

  const { searchParams } = new URL(request.url);
  const malId = Number.parseInt(searchParams.get("malId") ?? "", 10);
  const episode = Number.parseInt(searchParams.get("ep") ?? "", 10);

  if (Number.isNaN(malId) || Number.isNaN(episode)) {
    return NextResponse.json({ episode: null }, { status: 400 });
  }
  try {
    const detail = await getJikanEpisodeDetail(malId, episode);
    return NextResponse.json({ episode: detail });
  } catch {
    return NextResponse.json({ episode: null }, { status: 500 });
  }
}
