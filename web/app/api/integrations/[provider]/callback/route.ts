import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProvider, redirectUri } from "@/lib/integrations/providers";

/** OAuth callback: exchanges the code for tokens and stores the connection. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: providerId } = await params;
  const cfg = getProvider(providerId);
  const url = new URL(request.url);
  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/settings?integration_error=${encodeURIComponent(reason)}`, url.origin));
  if (!cfg) return fail("Unknown provider");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = request.cookies.get(`oauth_state_${cfg.id}`)?.value;
  const verifier = request.cookies.get(`oauth_verifier_${cfg.id}`)?.value;
  if (!code || !state || state !== cookieState) return fail("OAuth state mismatch — try connecting again");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail("Sign in required");

  try {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: cfg.clientId ?? "",
      redirect_uri: redirectUri(url.origin, cfg.id),
    });
    if (cfg.clientSecret) body.set("client_secret", cfg.clientSecret);
    if (cfg.pkce === "plain" && verifier) body.set("code_verifier", verifier);

    const tokenRes = await fetch(cfg.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!tokenRes.ok) return fail(`${cfg.name} rejected the connection (${tokenRes.status})`);
    const tokens = (await tokenRes.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };

    // Fetch the external username so the card can show who's connected.
    let externalId: string | null = null;
    let externalName: string | null = null;
    if (cfg.id === "mal") {
      const me = await fetch("https://api.myanimelist.net/v2/users/@me", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (me.ok) {
        const j = (await me.json()) as { id?: number; name?: string };
        externalId = j.id != null ? String(j.id) : null;
        externalName = j.name ?? null;
      }
    } else {
      const me = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokens.access_token}` },
        body: JSON.stringify({ query: "query { Viewer { id name } }" }),
      });
      if (me.ok) {
        const j = (await me.json()) as { data?: { Viewer?: { id: number; name: string } } };
        externalId = j.data?.Viewer ? String(j.data.Viewer.id) : null;
        externalName = j.data?.Viewer?.name ?? null;
      }
    }

    await supabase.from("integrations").upsert(
      {
        user_id: user.id,
        provider: cfg.id,
        external_user_id: externalId,
        external_username: externalName,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        token_expires_at: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" }
    );

    const res = NextResponse.redirect(new URL(`/settings?connected=${cfg.id}`, url.origin));
    res.cookies.delete(`oauth_state_${cfg.id}`);
    res.cookies.delete(`oauth_verifier_${cfg.id}`);
    return res;
  } catch {
    return fail("Connection failed — please try again");
  }
}
