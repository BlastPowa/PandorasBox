import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProvider, redirectUri } from "@/lib/integrations/providers";

function randomString(len = 64): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

/** GET /api/integrations/[provider]/connect → redirect to the provider's OAuth screen. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: providerId } = await params;
  const cfg = getProvider(providerId);
  if (!cfg) return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  if (!cfg.clientId)
    return NextResponse.json(
      { error: `${cfg.name} is not configured. Set ${cfg.id.toUpperCase()}_CLIENT_ID in the environment.` },
      { status: 503 }
    );

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const origin = new URL(request.url).origin;
  const state = randomString(32);
  const verifier = randomString(96); // MAL PKCE "plain": challenge === verifier

  const authorize = new URL(cfg.authorizeUrl);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("client_id", cfg.clientId);
  authorize.searchParams.set("redirect_uri", redirectUri(origin, cfg.id));
  authorize.searchParams.set("state", state);
  if (cfg.pkce === "plain") {
    authorize.searchParams.set("code_challenge", verifier);
    authorize.searchParams.set("code_challenge_method", "plain");
  }

  const res = NextResponse.redirect(authorize.toString());
  const cookieOpts = { httpOnly: true, secure: true, sameSite: "lax" as const, maxAge: 600, path: "/" };
  res.cookies.set(`oauth_state_${cfg.id}`, state, cookieOpts);
  if (cfg.pkce === "plain") res.cookies.set(`oauth_verifier_${cfg.id}`, verifier, cookieOpts);
  return res;
}
