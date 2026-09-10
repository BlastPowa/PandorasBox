import { NextResponse } from "next/server";
import type { ReelItem } from "@core/storage/schema";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const { data: libraryRow, error } = await supabase
    .from("library")
    .select("data")
    .eq("user_id", user.id)
    .maybeSingle<{ data: ReelItem[] }>();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = (Array.isArray(libraryRow?.data) ? libraryRow.data : [])
    .filter((item) => item.tmdbId != null && (item.type === "movie" || item.type === "series" || item.type === "anime"))
    .map((item) => ({
      id: item.id,
      tmdbId: item.tmdbId as number,
      mediaType: item.type === "movie" ? "movie" as const : "series" as const,
      title: item.title,
      status: item.status,
      updatedAt: item.updatedAt,
    }));

  return NextResponse.json({ items });
}
