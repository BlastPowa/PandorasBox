import { NextResponse } from "next/server";

/** Only for shared catalogue data. Never use for accounts, library or messages. */
export function publicCatalogJson(data: unknown, sharedSeconds = 900): NextResponse {
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, max-age=60",
      "CDN-Cache-Control": `public, s-maxage=${sharedSeconds}, stale-while-revalidate=3600`,
      "Vercel-CDN-Cache-Control": `public, s-maxage=${sharedSeconds}, stale-while-revalidate=3600`,
    },
  });
}
