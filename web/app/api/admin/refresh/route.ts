import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { refreshAvailability } from "@/lib/availability-refresh";

export async function POST() {
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
