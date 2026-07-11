import { ExternalLink, Globe } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { GlassCard } from "@/components/ui-fx/glass-card";
import { EmptyState } from "@/components/ui-fx/feedback";

export const dynamic = "force-dynamic";

interface Site {
  id: string;
  name: string;
  url: string;
  category: string;
  is_free: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  movies: "Movies & TV",
  anime: "Anime",
  manga: "Manga",
  manhwa: "Manhwa",
  comics: "Comics",
  games: "Games",
  mixed: "Everything",
};

export default async function SitesPage() {
  let sites: Site[] = [];
  if (isSupabaseConfigured) {
    try {
      const supabase = await createClient();
      const { data } = await supabase.from("site_directory").select("id, name, url, category, is_free").order("sort");
      sites = (data as Site[] | null) ?? [];
    } catch {
      sites = [];
    }
  }

  const byCat = new Map<string, Site[]>();
  for (const s of sites) {
    const arr = byCat.get(s.category) ?? [];
    arr.push(s);
    byCat.set(s.category, arr);
  }

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 md:px-8">
      <div className="mb-2 flex items-center gap-2">
        <Globe className="size-6 text-[var(--accent)]" />
        <h1 className="font-display text-2xl font-bold">Streaming, Reading &amp; Game Sites</h1>
      </div>
      <p className="mb-6 text-sm text-[var(--text-secondary)]">
        A curated directory of places to watch, read, and find games. Managed by admins.
      </p>

      {sites.length === 0 ? (
        <EmptyState
          icon={<Globe className="size-10" />}
          title="No sites yet"
          description="An admin can add streaming and reading sites from the Admin panel. They'll show up here and as where-to-watch links."
        />
      ) : (
        <div className="space-y-5">
          {Array.from(byCat.entries()).map(([cat, list]) => (
            <GlassCard key={cat} macDots title={CATEGORY_LABELS[cat] ?? cat}>
              <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((s) => (
                  <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer"
                    className="glass glow-ring flex items-center justify-between gap-2 rounded-[var(--radius-md)] px-4 py-3">
                    <span className="flex items-center gap-2">
                      <span className="grid size-8 place-items-center rounded-full bg-[var(--glass-strong)] font-bold">{s.name.charAt(0)}</span>
                      <span>
                        <span className="block text-sm font-semibold">{s.name}</span>
                        <span className="text-[10px] uppercase text-[var(--text-muted)]">{s.is_free ? "Free" : "Paid"}</span>
                      </span>
                    </span>
                    <ExternalLink className="size-4 opacity-50" />
                  </a>
                ))}
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
