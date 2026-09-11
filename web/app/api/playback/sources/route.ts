import { NextResponse } from "next/server";
import { discoverPlaybackSources } from "@/lib/playback/discovery";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title")?.trim() ?? "";
  const type = searchParams.get("type")?.trim() ?? "movie";
  const rawYear = Number(searchParams.get("year"));
  const year = Number.isInteger(rawYear) && rawYear > 1800 && rawYear < 2200 ? rawYear : null;

  if (title.length < 2 || title.length > 180) {
    return NextResponse.json({ error: "Invalid title" }, { status: 400 });
  }

  const sources = await discoverPlaybackSources({ title, type, year });
  return NextResponse.json(
    { sources },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } }
  );
}
