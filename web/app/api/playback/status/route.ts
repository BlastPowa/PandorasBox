import { NextResponse } from "next/server";
import { getMediaServerConfigurationStatus } from "@/lib/playback/media-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const mediaServers = getMediaServerConfigurationStatus();
  const configuredFeed = Boolean(process.env.PBOX_PLAYBACK_FEEDS?.trim());

  return NextResponse.json(
    {
      jellyfin: mediaServers.jellyfin,
      emby: mediaServers.emby,
      configuredFeed,
      hasPrivateSource: mediaServers.jellyfin || mediaServers.emby || configuredFeed,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
