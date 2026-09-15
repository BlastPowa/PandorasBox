import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseUrl, supabaseAnonKey, isSupabaseConfigured } from "@/lib/supabase/env";

const PROTECTED = ["/library", "/collections", "/stats", "/settings", "/admin", "/rankings"];

function createNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

function createContentSecurityPolicy(nonce: string) {
  const scriptSrc = process.env.NODE_ENV === "production"
    ? `script-src 'self' 'nonce-${nonce}'`
    : `script-src 'self' 'nonce-${nonce}' 'unsafe-eval'`;

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://image.tmdb.org https://s4.anilist.co https://uploads.mangadex.org https://mangadex.org https://cdn.myanimelist.net https://comicvine.gamespot.com https://static.comicvine.com https://images.igdb.com https://img.youtube.com https://*.supabase.co https://*.giphy.com",
    "media-src 'self' https:",
    "connect-src 'self' https: wss://*.supabase.co",
    "frame-src https://www.youtube-nocookie.com https://www.youtube.com",
    "worker-src 'self'",
    "manifest-src 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export async function proxy(request: NextRequest) {
  const nonce = createNonce();
  const csp = createContentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", csp);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.headers.set("Content-Security-Policy", csp);

  if (!isSupabaseConfigured) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED.some((p) => path === p || path.startsWith(`${p}/`));

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    const redirectResponse = NextResponse.redirect(url);
    redirectResponse.headers.set("Content-Security-Policy", csp);
    for (const cookie of response.cookies.getAll()) {
      redirectResponse.cookies.set(cookie);
    }
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|svg|webp)$).*)"],
};
