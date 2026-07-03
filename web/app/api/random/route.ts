import { NextResponse, type NextRequest } from "next/server";
import { getRandomTitles, type RandomType } from "@/lib/random";

const TYPES: RandomType[] = ["any", "movie", "series", "anime", "manga"];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const typeParam = searchParams.get("type") ?? "any";
  const type = (TYPES.includes(typeParam as RandomType) ? typeParam : "any") as RandomType;
  const genre = searchParams.get("genre");

  try {
    const results = await getRandomTitles({ type, genre: genre && genre.length > 0 ? genre : null });
    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to open the box", results: [] },
      { status: 500 }
    );
  }
}
