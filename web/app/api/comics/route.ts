import { NextResponse, type NextRequest } from "next/server";
import { getComics, searchComics, PUBLISHERS, type Publisher } from "@/lib/comics";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const limit = rateLimit(request, "comics", 40, 60_000);
  if (!limit.ok) return tooManyRequests(limit);

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const publisherParam = searchParams.get("publisher");

  try {
    if (q && q.trim().length >= 2) {
      const results = await searchComics(q.slice(0, 100));
      return NextResponse.json({ results });
    }
    const publisher = (PUBLISHERS.includes(publisherParam as Publisher)
      ? publisherParam
      : "marvel") as Publisher;
    const results = await getComics(publisher);
    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load comics", results: [] },
      { status: 500 }
    );
  }
}
