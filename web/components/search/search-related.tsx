/* eslint-disable @next/next/no-img-element -- Small catalogue thumbnails and collection collages use remote source URLs. */
import Link from "@/components/ui/app-link";
import type { UnifiedSearchResult } from "@core/utils/search";
import { normaliseTitle } from "@core/utils/formatters";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { CinematicRail } from "@/components/home/cinematic-rail";

type Recommended = { id: number; title?: string; name?: string; poster_path: string | null; backdrop_path: string | null; release_date?: string; first_air_date?: string; vote_average: number; overview: string };
async function similarTitles(results: UnifiedSearchResult[], q: string) {
  const key = process.env.TMDB_API_KEY;
  const seed = results.find(item => item.tmdbId && normaliseTitle(item.title) === normaliseTitle(q) && ["movie","series","anime"].includes(item.type));
  if (!key || !seed) return [];
  try {
    const response = await fetch(`https://api.themoviedb.org/3/${seed.type === "movie" ? "movie" : "tv"}/${seed.tmdbId}/recommendations?api_key=${encodeURIComponent(key)}&language=en-US`, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) return [];
    const data = await response.json() as { results: Recommended[] };
    return data.results.slice(0,12).map((item): UnifiedSearchResult => ({id: `tmdb-${item.id}`, source: "tmdb", type: seed.type,
      title: item.title ?? item.name ?? "Untitled", posterUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
      backdropUrl: item.backdrop_path ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}` : null,
      year: Number((item.release_date ?? item.first_air_date ?? "").slice(0,4)) || null, synopsis: item.overview, score: item.vote_average || null,
      totalEpisodes: null, totalChapters: null, anilistId: null, tmdbId: item.id, mangadexId: null, malId: null,
    })).filter(item => !results.some(match => match.type === item.type && match.tmdbId === item.tmdbId));
  } catch { return []; }
}
async function relevantLists(q: string) {
  if (!isSupabaseConfigured) return [];
  try {
    const supabase = await createClient();
    const signal = AbortSignal.timeout(6000);
    const pattern = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
    const [names, matches] = await Promise.all([
      supabase.from("collections").select("id,name,share_slug,cover_url,user_id").eq("visibility","public").ilike("name",pattern).limit(8).abortSignal(signal),
      supabase.from("collection_items").select("collection_id").ilike("title",pattern).limit(100).abortSignal(signal),
    ]);
    const ids = [...new Set((matches.data ?? []).map(item => item.collection_id))];
    const containing = ids.length ? await supabase.from("collections").select("id,name,share_slug,cover_url,user_id").eq("visibility","public").in("id",ids).limit(8).abortSignal(signal) : {data: []};
    const lists = [...new Map([...(names.data ?? []), ...(containing.data ?? [])].map(item => [item.id,item])).values()].slice(0,8);
    return await Promise.all(lists.map(async list => {
      const [covers, owner] = await Promise.all([
        supabase.from("collection_items").select("poster_url",{count:"exact"}).eq("collection_id",list.id).limit(4).abortSignal(signal),
        supabase.from("profiles").select("username").eq("id",list.user_id).abortSignal(signal).maybeSingle(),
      ]);
      return {...list, posters: (covers.data ?? []).flatMap(item => item.poster_url ? [item.poster_url as string] : []), count: covers.count ?? 0, owner: owner.data?.username ?? "PBox member"};
    }));
  } catch { return []; }
}
export async function SearchRelated({ q, results }: { q: string; results: UnifiedSearchResult[] }) {
  const [similar, lists] = await Promise.all([similarTitles(results,q), relevantLists(q)]);
  return <div className="mt-12 space-y-12">
    <CinematicRail title="You might also like" eyebrow={`Related to ${q}`} items={similar} />
    <section><div className="mb-5 flex items-center justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Collected by the community</p><h2 className="mt-1 text-2xl font-bold">Lists featuring “{q}”</h2></div><Link href="/collections" className="shrink-0 text-sm text-[var(--accent)]">Browse lists →</Link></div>
      {lists.length ? <div className="flex gap-4 overflow-x-auto pb-3">{lists.map(list => <Link key={list.id} href={list.share_slug ? `/c/${list.share_slug}` : `/collections/${list.id}`} className="group relative h-48 w-80 shrink-0 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)]">
        <div className="absolute inset-0 flex">{list.cover_url ? <img src={list.cover_url} alt="" className="size-full object-cover" /> : list.posters.map((poster,index) => <img key={index} src={poster} alt="" className="min-w-0 flex-1 object-cover transition duration-500 group-hover:scale-105" />)}</div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/25 to-transparent" /><div className="absolute inset-x-0 bottom-0 p-4"><h3 className="truncate text-lg font-bold text-white">{list.name}</h3><p className="mt-1 text-xs text-white/65">by {list.owner} · {list.count} titles</p></div>
      </Link>)}</div> : <p className="rounded-2xl border border-[var(--border)] bg-[var(--glass)] p-5 text-sm text-[var(--text-muted)]">No public lists match this search yet. Create a collection to share your picks.</p>}
    </section>
  </div>;
}
