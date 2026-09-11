import { buildMediaServerStreamUrl, getMediaServerConfig, isMediaServerProvider, mediaServerHeaders } from "@/lib/playback/media-server";

export const dynamic = "force-dynamic";

async function proxyMedia(request: Request, context: RouteContext<"/api/playback/media/[provider]/[itemId]">) {
  const { provider, itemId } = await context.params;
  if (!isMediaServerProvider(provider) || !/^[a-zA-Z0-9._-]{1,128}$/.test(itemId)) {
    return new Response("Invalid media source", { status: 400 });
  }

  const config = getMediaServerConfig(provider);
  if (!config) return new Response("Media server is not configured", { status: 404 });

  const headers = new Headers(mediaServerHeaders(config));
  headers.set("Accept", request.headers.get("accept") || "video/mp4,*/*;q=0.8");
  const range = request.headers.get("range");
  if (range) headers.set("Range", range);

  const upstream = await fetch(buildMediaServerStreamUrl(config, itemId), {
    method: request.method,
    headers,
    cache: "no-store",
    signal: request.signal,
  });

  if (!upstream.ok && upstream.status !== 206) {
    return new Response("Media server could not provide this item", {
      status: upstream.status >= 400 && upstream.status < 500 ? upstream.status : 502,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  const responseHeaders = new Headers({
    "Cache-Control": "private, no-store",
    "Content-Type": upstream.headers.get("content-type") || "video/mp4",
  });
  for (const header of ["content-length", "content-range", "accept-ranges", "etag", "last-modified"]) {
    const value = upstream.headers.get(header);
    if (value) responseHeaders.set(header, value);
  }

  return new Response(request.method === "HEAD" ? null : upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export async function GET(request: Request, context: RouteContext<"/api/playback/media/[provider]/[itemId]">) {
  return proxyMedia(request, context);
}

export async function HEAD(request: Request, context: RouteContext<"/api/playback/media/[provider]/[itemId]">) {
  return proxyMedia(request, context);
}
