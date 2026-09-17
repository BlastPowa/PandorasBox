import {
  ArrowUpRight,
  BookOpenText,
  CircleDollarSign,
  ExternalLink,
  Film,
  Gamepad2,
  Globe,
  Layers3,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { GlassCard } from "@/components/ui-fx/glass-card";
import { EmptyState } from "@/components/ui-fx/feedback";
import { DiscoveryPageHeader } from "@/components/discovery/discovery-page-header";

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

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  movies: "Places to continue with films and television.",
  anime: "Anime focused streaming and discovery destinations.",
  manga: "External places for manga reading and discovery.",
  manhwa: "Destinations centered on manhwa and webcomics.",
  comics: "Comic reading and discovery destinations.",
  games: "Game libraries, stores and discovery destinations.",
  mixed: "Broad services that span several media types.",
};

function categoryAnchor(category: string) {
  return `category-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function siteHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "External site";
  }
}

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
  for (const site of sites) {
    const list = byCat.get(site.category) ?? [];
    list.push(site);
    byCat.set(site.category, list);
  }

  const categories = Array.from(byCat.entries());
  const freeCount = sites.filter((site) => site.is_free).length;

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-6 md:px-8">
      <div className="space-y-6">
        <DiscoveryPageHeader
          eyebrow="Open elsewhere"
          title="Watch, Read &amp; Play"
          description="A curated launch hub for external places to continue with the films, shows, anime, comics, manga and games you track in Pandora's Box."
        />

        {sites.length === 0 ? (
          <EmptyState
            icon={<Globe className="size-10" />}
            title="No sites yet"
            description="An admin can add provider links from the Admin panel. They'll appear here and alongside supported title pages."
          />
        ) : (
          <div className="space-y-6">
            <section className="grid gap-3 sm:grid-cols-3" aria-label="Directory overview">
              <div className="pb-uiverse-card pb-uiverse-card--compact flex min-h-[104px] items-center gap-4 rounded-[22px] p-4">
                <span className="pb-uiverse-icon grid size-11 shrink-0 place-items-center rounded-2xl text-[var(--accent)]"><Globe className="size-5" /></span>
                <div>
                  <p className="text-2xl font-black tracking-tight">{sites.length}</p>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Services</p>
                </div>
              </div>
              <div className="pb-uiverse-card pb-uiverse-card--compact flex min-h-[104px] items-center gap-4 rounded-[22px] p-4">
                <span className="pb-uiverse-icon grid size-11 shrink-0 place-items-center rounded-2xl text-[var(--completed)]"><CircleDollarSign className="size-5" /></span>
                <div>
                  <p className="text-2xl font-black tracking-tight">{freeCount}</p>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Free options</p>
                </div>
              </div>
              <div className="pb-uiverse-card pb-uiverse-card--compact flex min-h-[104px] items-center gap-4 rounded-[22px] p-4">
                <span className="pb-uiverse-icon grid size-11 shrink-0 place-items-center rounded-2xl text-[var(--gold)]"><Layers3 className="size-5" /></span>
                <div>
                  <p className="text-2xl font-black tracking-tight">{categories.length}</p>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Categories</p>
                </div>
              </div>
            </section>

            <section className="pb-uiverse-card pb-uiverse-card--compact rounded-[22px] p-4 sm:p-5" aria-label="Jump to category">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="size-4 text-[var(--accent)]" />
                <p className="text-sm font-bold">Jump to what you want</p>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {categories.map(([category, list]) => (
                  <a
                    key={category}
                    href={`#${categoryAnchor(category)}`}
                    className="pb-uiverse-mini-card inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-4 text-xs font-semibold text-[var(--text-secondary)] transition hover:text-[var(--text)]"
                  >
                    {CATEGORY_LABELS[category] ?? category}
                    <span className="rounded-full bg-[rgb(var(--accent-rgb)/0.1)] px-2 py-0.5 text-[10px] text-[var(--accent)]">{list.length}</span>
                  </a>
                ))}
              </div>
            </section>

            <div className="space-y-5">
              {categories.map(([category, list]) => {
                const freeInCategory = list.filter((site) => site.is_free).length;
                const categoryLabel = CATEGORY_LABELS[category] ?? category;
                const CategoryIcon = category === "games" ? Gamepad2 : category === "movies" || category === "anime" ? Film : category === "mixed" ? Layers3 : BookOpenText;

                return (
                  <section key={category} id={categoryAnchor(category)} className="scroll-mt-24">
                    <GlassCard macDots title={categoryLabel} className="pb-aura overflow-hidden">
                      <div className="border-b border-[var(--border)] px-4 py-4 sm:px-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-start gap-3">
                            <span className="pb-uiverse-icon grid size-10 shrink-0 place-items-center rounded-xl text-[var(--accent)]"><CategoryIcon className="size-[18px]" /></span>
                            <div>
                              <p className="text-sm font-semibold text-[var(--text-secondary)]">{CATEGORY_DESCRIPTIONS[category] ?? "External destinations for this media type."}</p>
                              <p className="mt-1 text-xs text-[var(--text-muted)]">{list.length} {list.length === 1 ? "service" : "services"} · {freeInCategory} free</p>
                            </div>
                          </div>
                          {category === "mixed" && (
                            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[rgb(var(--gold-rgb)/0.25)] bg-[rgb(var(--gold-rgb)/0.08)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--gold)]">
                              <Sparkles className="size-3" /> Multi-media
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                        {list.map((site) => (
                          <a
                            key={site.id}
                            href={site.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="pb-uiverse-row group flex min-h-[92px] items-center justify-between gap-3 rounded-[var(--radius-md)] px-4 py-3.5 transition hover:-translate-y-0.5"
                            aria-label={`Open ${site.name} in a new tab`}
                          >
                            <span className="flex min-w-0 items-center gap-3">
                              <span className="pb-uiverse-icon grid size-11 shrink-0 place-items-center rounded-[14px] text-base font-black text-[var(--accent)]">{site.name.charAt(0).toUpperCase()}</span>
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-bold">{site.name}</span>
                                <span className="mt-1 block truncate text-xs text-[var(--text-muted)]">{siteHost(site.url)}</span>
                                <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] ${site.is_free ? "bg-[rgba(34,197,94,0.1)] text-[var(--completed)]" : "bg-[rgb(var(--gold-rgb)/0.1)] text-[var(--gold)]"}`}>
                                  {site.is_free ? "Free" : "Paid"}
                                </span>
                              </span>
                            </span>
                            <span className="grid size-9 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-muted)] transition group-hover:border-[rgb(var(--accent-rgb)/0.35)] group-hover:text-[var(--accent)]">
                              <ArrowUpRight className="size-4" />
                            </span>
                          </a>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 border-t border-[var(--border)] px-4 py-3 text-[11px] text-[var(--text-muted)] sm:px-5">
                        <ExternalLink className="size-3.5" /> Links open the listed provider in a new tab.
                      </div>
                    </GlassCard>
                  </section>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
