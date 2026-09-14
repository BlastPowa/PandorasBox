"use client";

import { useEffect, useMemo, useState } from "react";
import type { UnifiedSearchResult } from "@core/utils/search";
import { PosterRow, PosterRowSkeleton } from "@/components/discovery/poster-row";
import { useLibrary } from "@/lib/library/use-library";

type RecommendationProfile = {
  genres: Record<string, number>;
  types: Record<string, number>;
  typeGenres: Record<string, Record<string, number>>;
  seenIds: string[];
};

type RecommendationGroups = {
  movies: UnifiedSearchResult[];
  series: UnifiedSearchResult[];
  anime: UnifiedSearchResult[];
  manga: UnifiedSearchResult[];
};

const EMPTY_GROUPS: RecommendationGroups = { movies: [], series: [], anime: [], manga: [] };

function buildProfile(items: ReturnType<typeof useLibrary>["items"]): RecommendationProfile {
  const genres: Record<string, number> = {};
  const types: Record<string, number> = {};
  const typeGenres: Record<string, Record<string, number>> = {};

  for (const item of items) {
    const statusWeight =
      item.status === "completed" ? 3 :
      item.status === "watching" || item.status === "rewatching" || item.status === "reading" ? 2.5 :
      item.status === "planned" ? 0.8 :
      item.status === "on_hold" ? 0.5 : 0.15;
    const ratingWeight = item.rating == null ? 1 : Math.max(0.25, item.rating / 5);
    const ageDays = Math.max(0, (Date.now() - new Date(item.updatedAt).getTime()) / 86_400_000);
    const recencyWeight = ageDays <= 30 ? 1.35 : ageDays <= 120 ? 1.15 : 1;
    const weight = statusWeight * ratingWeight * recencyWeight;

    types[item.type] = (types[item.type] ?? 0) + weight;
    const bucket = typeGenres[item.type] ?? (typeGenres[item.type] = {});
    for (const genre of item.genres) {
      const name = genre.trim();
      if (name) {
        genres[name] = (genres[name] ?? 0) + weight;
        bucket[name] = (bucket[name] ?? 0) + weight;
      }
    }
  }

  return {
    genres,
    types,
    typeGenres,
    seenIds: items.map((item) => item.id),
  };
}

function topGenres(profile: RecommendationProfile, type: string) {
  const specific = profile.typeGenres[type] ?? {};
  const entries = Object.entries(specific).length > 0 ? Object.entries(specific) : Object.entries(profile.genres);
  return entries.sort((a, b) => b[1] - a[1]).slice(0, 3).map(([genre]) => genre);
}

export function ForYouRow() {
  const { items, signedIn, loading } = useLibrary();
  const [result, setResult] = useState<{ key: string; groups: RecommendationGroups }>({ key: "", groups: EMPTY_GROUPS });
  const profile = useMemo(() => buildProfile(items), [items]);
  const profileKey = useMemo(() => JSON.stringify(profile), [profile]);
  const groups = result.key === profileKey ? result.groups : EMPTY_GROUPS;
  const fetching = signedIn && !loading && items.length > 0 && result.key !== profileKey;
  const labels = useMemo(() => ({
    movies: topGenres(profile, "movie"),
    series: topGenres(profile, "series"),
    anime: topGenres(profile, "anime"),
    manga: topGenres(profile, "manga"),
  }), [profile]);

  useEffect(() => {
    if (!signedIn || loading || items.length === 0) return;

    const controller = new AbortController();
    void fetch("/api/home/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: profileKey,
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Recommendation request failed");
        const data = await response.json() as { groups?: Partial<RecommendationGroups> };
        setResult({
          key: profileKey,
          groups: {
            movies: data.groups?.movies ?? [],
            series: data.groups?.series ?? [],
            anime: data.groups?.anime ?? [],
            manga: data.groups?.manga ?? [],
          },
        });
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setResult({ key: profileKey, groups: EMPTY_GROUPS });
      });

    return () => controller.abort();
  }, [items.length, loading, profileKey, signedIn]);

  if (!signedIn || loading || items.length === 0) return null;
  if (fetching && Object.values(groups).every((group) => group.length === 0)) {
    return <div className="space-y-8"><PosterRowSkeleton title="Movies for you" /><PosterRowSkeleton title="TV shows for you" /></div>;
  }
  if (Object.values(groups).every((group) => group.length === 0)) return null;

  return (
    <section className="space-y-8" aria-label="Recommendations based on your library history">
      <div className="px-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">Picked from your history</p>
        <h2 className="mt-1 font-display text-xl font-bold tracking-[-0.02em] text-[var(--text)] sm:text-2xl">More stories that match your taste</h2>
      </div>
      <PosterRow title="Movies for you" subtitle={labels.movies.length ? `Because you’ve been into ${labels.movies.join(", ")}` : "Based on your recently watched and saved movies"} items={groups.movies} viewAllHref="/browse?kind=movie" />
      <PosterRow title="TV shows for you" subtitle={labels.series.length ? `More ${labels.series.join(", ")} from your TV history` : "Based on the series you watch and save"} items={groups.series} viewAllHref="/browse?kind=tv" />
      <PosterRow title="Anime for you" subtitle={labels.anime.length ? `Matched to ${labels.anime.join(", ")} in your anime list` : "Based on your anime history"} items={groups.anime} viewAllHref="/anime" />
      <PosterRow title="Manga for you" subtitle={labels.manga.length ? `Matched to ${labels.manga.join(", ")} in your reading history` : "Based on your manga and reading history"} items={groups.manga} viewAllHref="/manga" />
    </section>
  );
}
