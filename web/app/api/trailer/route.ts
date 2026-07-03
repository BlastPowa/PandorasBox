import { NextResponse, type NextRequest } from "next/server";
import type { ReelItemType } from "@core/storage/schema";
import { getTrailerKey } from "@/lib/trailers";

const TYPES: ReelItemType[] = ["movie", "series", "anime", "manga", "manhwa"];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "";
  const source = searchParams.get("source") ?? "";
  const id = searchParams.get("id") ?? "";
  const seasonParam = searchParams.get("season");
  const season = seasonParam ? Number.parseInt(seasonParam, 10) : undefined;

  if (!TYPES.includes(type as ReelItemType) || !id) {
    return NextResponse.json({ key: null }, { status: 400 });
  }
  try {
    const key = await getTrailerKey(type as ReelItemType, source, id, season);
    return NextResponse.json({ key });
  } catch {
    return NextResponse.json({ key: null }, { status: 500 });
  }
}
