import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { sendIssueEmail } from "@/lib/contact";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

const MAX_USERNAME = 60;
const MAX_MESSAGE = 2000;

export async function POST(request: NextRequest) {
  const limit = rateLimit(request, "contact", 5, 60 * 60_000);
  if (!limit.ok) return tooManyRequests(limit);

  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Contact form is not configured yet." }, { status: 503 });
  }

  let body: { username?: unknown; message?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const username = typeof body.username === "string" ? body.username.trim().slice(0, MAX_USERNAME) : "";
  const message = typeof body.message === "string" ? body.message.trim().slice(0, MAX_MESSAGE) : "";

  if (username.length < 2 || message.length < 10) {
    return NextResponse.json(
      { error: "Please include your username and a message of at least 10 characters." },
      { status: 400 }
    );
  }

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("user_issues")
      .insert({ username, message })
      .select("id")
      .single();
    if (error) throw error;

    const issueId = (data as { id: string }).id;
    await sendIssueEmail(issueId, username, message);

    return NextResponse.json({ id: issueId.slice(0, 8).toUpperCase() });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not submit your issue." },
      { status: 500 }
    );
  }
}
