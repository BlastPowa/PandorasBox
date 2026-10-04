import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

/** Resolve an exact, case-insensitive username for password sign-in. */
export async function POST(request: NextRequest) {
  const limit = rateLimit(request, "resolve-login", 15, 60_000);
  if (!limit.ok) return tooManyRequests(limit);

  let body: { identifier?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ email: null });
  }

  const identifier = typeof body.identifier === "string" ? body.identifier.trim().slice(0, 120) : "";
  if (!identifier) return NextResponse.json({ email: null });

  if (identifier.includes("@")) {
    return NextResponse.json({ email: identifier });
  }

  try {
    const supabase = createServiceClient();
    const { data: profile, error: lookupError } = await supabase
      .from("profiles")
      .select("id")
      .ilike("username", identifier.replace(/[\\%_]/g, "\\$&"))
      .maybeSingle();

    if (lookupError) return NextResponse.json({ email: null }, { status: 503 });
    if (!profile) return NextResponse.json({ email: null });

    const { data: userData, error } = await supabase.auth.admin.getUserById((profile as { id: string }).id);
    if (error || !userData.user?.email) return NextResponse.json({ email: null });

    return NextResponse.json({ email: userData.user.email });
  } catch {
    return NextResponse.json({ email: null }, { status: 503 });
  }
}
