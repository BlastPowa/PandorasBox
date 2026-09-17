import { NextResponse, type NextRequest } from "next/server";
import { getBooksByGenre, isBookGenre, searchBooks } from "@/lib/books";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const limit = rateLimit(request, "books", 60, 60_000);
  if (!limit.ok) return tooManyRequests(limit);

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const genreParam = searchParams.get("genre");

  try {
    if (query.length >= 2) {
      return NextResponse.json({ results: await searchBooks(query) });
    }
    const genre = isBookGenre(genreParam) ? genreParam : "featured";
    return NextResponse.json({ results: await getBooksByGenre(genre) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load books", results: [] },
      { status: 502 }
    );
  }
}
