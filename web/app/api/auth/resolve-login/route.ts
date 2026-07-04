import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

/**
 * Lets users sign in with either their email or their username. If the
 * identifier already looks like an email it's returned as-is (no lookup).
 * Otherwise we resolve the username to its account email using the
 * service-role client (auth.users email is never exposed to the client
 * directly). Always responds generically on a miss to avoid username
 * enumeration.
 */
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
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .ilike("username", identifier)
      .maybeSingle();

    if (!profile) return NextResponse.json({ email: null });

    const { data: userData, error } = await supabase.auth.admin.getUserById((profile as { id: string }).id);
    if (error || !userData.user?.email) return NextResponse.json({ email: null });

    return NextResponse.json({ email: userData.user.email });
  } catch {
    return NextResponse.json({ email: null });
  }
}
