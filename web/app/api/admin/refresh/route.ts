import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { refreshAvailability } from "@/lib/availability-refresh";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const limit = rateLimit(request, "admin-refresh", 6, 60_000);
  if (!limit.ok) return tooManyRequests(limit);

  const isAdmin = await requireAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const result = await refreshAvailability();
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Refresh failed" },
      { status: 500 }
    );
  }
}
