import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await params;
  const { data, error } = await supabase.rpc("copy_visible_collection", { p_collection_id: id });
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json({ id: data });
}
