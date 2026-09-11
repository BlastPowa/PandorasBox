"use client";

import { useEffect, useMemo, useState } from "react";
import type { UnifiedSearchResult } from "@core/utils/search";
import { PosterRow, PosterRowSkeleton } from "@/components/discovery/poster-row";
import { useLibrary } from "@/lib/library/use-library";

type RecommendationProfile = {
  genres: Record<string, number>;
  types: Record<string, number>;
  seenIds: string[];
};

function buildProfile(items: ReturnType<typeof useLibrary>["items"]): RecommendationProfile {
  const genres: Record<string, number> = {};
  const types: Record<string, number> = {};

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
    for (const genre of item.genres) {
      const name = genre.trim();
      if (name) genres[name] = (genres[name] ?? 0) + weight;
    }
  }

  return {
    genres,
    types,
    seenIds: items.map((item) => item.id),
  };
}

export function ForYouRow() {
  const { items, signedIn, loading } = useLibrary();
  const [result, setResult] = useState<{ key: string; items: UnifiedSearchResult[] }>({ key: "", items: [] });
  const profile = useMemo(() => buildProfile(items), [items]);
  const profileKey = useMemo(() => JSON.stringify(profile), [profile]);
  const recommendations = result.key === profileKey ? result.items : [];
  const fetching = signedIn && !loading && items.length > 0 && result.key !== profileKey;
  const topGenres = useMemo(
    () => Object.entries(profile.genres).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([genre]) => genre),
    [profile.genres]
  );

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
        const data = await response.json() as { items?: UnifiedSearchResult[] };
        setResult({ key: profileKey, items: data.items ?? [] });
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setResult({ key: profileKey, items: [] });
      });

    return () => controller.abort();
  }, [items.length, loading, profileKey, signedIn]);

  if (!signedIn || loading || items.length === 0) return null;
  if (fetching && recommendations.length === 0) return <PosterRowSkeleton title="For You" />;
  if (recommendations.length === 0) return null;

  return (
    <PosterRow
      title="For You"
      subtitle={topGenres.length > 0 ? `Based on your ratings, history and ${topGenres.join(", ")}` : "Based on your library history and ratings"}
      items={recommendations}
    />
  );
}
