import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { WatchOption } from "@core/api/watchProviders";

export interface CuratedLink {
  id: string;
  site_name: string;
  url: string;
  category: "subscription" | "free" | "rent" | "buy" | "reading";
  quality: string | null;
}

export interface Availability {
  media_key: string;
  status: string | null;
  hd_available: boolean;
  digital_date: string | null;
  next_episode: number | null;
  next_chapter: number | null;
  next_air_at: string | null;
}

export async function getCuratedLinks(mediaKey: string): Promise<CuratedLink[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("watch_links")
      .select("id, site_name, url, category, quality")
      .in("media_key", [mediaKey, "global"]);
    return (data as CuratedLink[] | null) ?? [];
  } catch {
    return [];
  }
}

export async function getAvailability(mediaKey: string): Promise<Availability | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("availability")
      .select("media_key, status, hd_available, digital_date, next_episode, next_chapter, next_air_at")
      .eq("media_key", mediaKey)
      .maybeSingle();
    return (data as Availability | null) ?? null;
  } catch {
    return null;
  }
}

export function curatedToWatchOptions(links: CuratedLink[]): WatchOption[] {
  return links.map((l) => ({
    name: l.quality ? `${l.site_name} · ${l.quality}` : l.site_name,
    url: l.url,
    type: l.category,
    logoUrl: null,
    isPaid: l.category === "subscription" || l.category === "rent" || l.category === "buy",
  }));
}
