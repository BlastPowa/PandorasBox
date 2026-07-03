import { NextResponse, type NextRequest } from "next/server";
import { refreshAvailability } from "@/lib/availability-refresh";

export const maxDuration = 60;

/** Scheduled by Vercel Cron. Protected by CRON_SECRET (Bearer or ?secret=). */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET ?? "";
  const auth = request.headers.get("authorization");
  const provided = auth?.replace("Bearer ", "") ?? new URL(request.url).searchParams.get("secret");

  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await refreshAvailability();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Refresh failed" },
      { status: 500 }
    );
  }
}
