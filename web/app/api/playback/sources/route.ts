import { NextResponse } from "next/server";
import { discoverPlaybackSources } from "@/lib/playback/discovery";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title")?.trim() ?? "";
  const type = searchParams.get("type")?.trim() ?? "movie";
  const rawSeason = Number(searchParams.get("season"));
  const rawEpisode = Number(searchParams.get("episode"));
  const season = Number.isInteger(rawSeason) && rawSeason > 0 ? rawSeason : null;
  const episode = Number.isInteger(rawEpisode) && rawEpisode > 0 ? rawEpisode : null;
  const episodeTitle = searchParams.get("episodeTitle")?.trim() || null;
  const rawYear = Number(searchParams.get("year"));
  const year = Number.isInteger(rawYear) && rawYear > 1800 && rawYear < 2200 ? rawYear : null;

  if (title.length < 2 || title.length > 180) {
    return NextResponse.json({ error: "Invalid title" }, { status: 400 });
  }

  const sources = await discoverPlaybackSources({ title, type, year, season, episode, episodeTitle });
  return NextResponse.json(
    { sources },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
  );
}
