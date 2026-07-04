import { NextResponse, type NextRequest } from "next/server";
import { getSeasonDetails } from "@core/api/tmdb";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const limit = rateLimit(request, "episodes", 60, 60_000);
  if (!limit.ok) return tooManyRequests(limit);

  const { searchParams } = new URL(request.url);
  const id = Number.parseInt(searchParams.get("id") ?? "", 10);
  const season = Number.parseInt(searchParams.get("season") ?? "1", 10);
  const key = process.env.TMDB_API_KEY ?? "";

  if (Number.isNaN(id) || Number.isNaN(season) || !key) return NextResponse.json({ episodes: [] });
  try {
    const data = await getSeasonDetails(id, season, key);
    return NextResponse.json({ episodes: data.episodes });
  } catch {
    return NextResponse.json({ episodes: [] }, { status: 500 });
  }
}
