"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ListManager } from "@core/storage/listManager";
import type { ReelStats } from "@core/storage/listManager";
import type { ReelItem, ReelItemStatus, ReelItemType, ReelProgress } from "@core/storage/schema";
import { createClient } from "@/lib/supabase/client";
import { SupabaseLibraryAdapter } from "./adapter";

interface LibraryContextValue {
  items: ReelItem[];
  loading: boolean;
  error: string | null;
  signedIn: boolean;
  stats: ReelStats | null;
  refresh: () => Promise<void>;
  add: (item: Omit<ReelItem, "addedAt" | "updatedAt">) => Promise<void>;
  update: (id: string, updates: Partial<ReelItem>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  setStatus: (id: string, status: ReelItemStatus) => Promise<void>;
  setRating: (id: string, rating: number) => Promise<void>;
  markEpisode: (id: string, episode: number, season?: number) => Promise<void>;
  markChapter: (id: string, chapter: number) => Promise<void>;
  markComplete: (id: string) => Promise<void>;
  updateProgress: (id: string, progress: Partial<ReelProgress>) => Promise<void>;
  getById: (id: string) => ReelItem | undefined;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({
  userId,
  children,
}: {
  userId: string | null;
  children: ReactNode;
}) {
  const [items, setItems] = useState<ReelItem[]>([]);
  const [loading, setLoading] = useState<boolean>(Boolean(userId));
  const [error, setError] = useState<string | null>(null);
  const managerRef = useRef<ListManager | null>(null);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);

  if (userId && !managerRef.current) {
    const supabase = createClient();
    supabaseRef.current = supabase;
    managerRef.current = new ListManager(new SupabaseLibraryAdapter(supabase, userId));
  }

  const refresh = useCallback(async () => {
    if (!managerRef.current) return;
    try {
      setError(null);
      const all = await managerRef.current.getAll();
      setItems(all);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load library");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    void refresh();
    const supabase = supabaseRef.current;
    if (!supabase) return;
    const channel = supabase
      .channel("library-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "library", filter: `user_id=eq.${userId}` },
        () => void refresh()
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  /** Fire-and-forget: queue a push to connected integrations (MAL/AniList). */
  const enqueueSync = useCallback(async (id: string) => {
    const m = managerRef.current;
    if (!m) return;
    try {
      const item = (await m.getAll()).find((i) => i.id === id);
      if (!item || (item.malId == null && item.anilistId == null)) return;
      const isAnime = item.type === "anime" || item.type === "series";
      void fetch("/api/integrations/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaKey: item.id,
          payload: {
            status: item.status,
            progress: (isAnime ? item.progress.currentEpisode : item.progress.currentChapter) ?? 0,
            rating: item.rating,
            malId: item.malId,
            anilistId: item.anilistId,
            kind: isAnime ? "anime" : "manga",
          },
        }),
      });
    } catch {
      // sync queueing must never break library operations
    }
  }, []);

  const run = useCallback(
    async (fn: (m: ListManager) => Promise<unknown>, syncId?: string) => {
      const m = managerRef.current;
      if (!m) throw new Error("Sign in to manage your library.");
      await fn(m);
      await refresh();
      if (syncId) void enqueueSync(syncId);
    },
    [refresh, enqueueSync]
  );

  const value = useMemo<LibraryContextValue>(() => {
    const stats: ReelStats | null = null;
    return {
      items,
      loading,
      error,
      signedIn: Boolean(userId),
      stats,
      refresh,
      add: (item) => run((m) => m.add(item), item.id),
      update: (id, updates) => run((m) => m.update(id, updates), id),
      remove: (id) => run((m) => m.remove(id)),
      setStatus: (id, status) => run((m) => m.update(id, { status }), id),
      setRating: (id, rating) => run((m) => m.update(id, { rating }), id),
      markEpisode: (id, episode, season) => run((m) => m.markEpisodeWatched(id, episode, season), id),
      markChapter: (id, chapter) => run((m) => m.markChapterRead(id, chapter), id),
      markComplete: (id) => run((m) => m.markComplete(id), id),
      updateProgress: (id, progress) => run((m) => m.updateProgress(id, progress), id),
      getById: (id) => items.find((i) => i.id === id),
    };
  }, [items, loading, error, userId, refresh, run]);

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryContextValue {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used within LibraryProvider");
  return ctx;
}

/** Client-side stats derived from the loaded items (mirrors core calculateStats semantics). */
export function useLibraryStats(items: ReelItem[]): ReelStats {
  return useMemo(() => {
    const stats: ReelStats = {
      totalItems: items.length,
      completed: 0,
      watching: 0,
      planned: 0,
      dropped: 0,
      totalWatchTimeMinutes: 0,
      totalEpisodesWatched: 0,
      totalChaptersRead: 0,
      topGenres: [],
    };
    const genres = new Map<string, number>();
    for (const item of items) {
      if (item.status === "completed") stats.completed += 1;
      else if (item.status === "watching" || item.status === "reading") stats.watching += 1;
      else if (item.status === "planned") stats.planned += 1;
      else if (item.status === "dropped") stats.dropped += 1;
      for (const g of item.genres) genres.set(g, (genres.get(g) ?? 0) + 1);
      if (item.type === "movie") {
        if (item.status === "completed") stats.totalWatchTimeMinutes += 100;
      } else if (item.type === "series" || item.type === "anime") {
        const eps =
          item.status === "completed"
            ? item.totalEpisodes ?? item.progress.currentEpisode ?? 0
            : item.progress.currentEpisode ?? 0;
        stats.totalEpisodesWatched += eps;
        stats.totalWatchTimeMinutes += eps * 24;
      } else {
        stats.totalChaptersRead +=
          item.status === "completed"
            ? item.totalChapters ?? item.progress.currentChapter ?? 0
            : item.progress.currentChapter ?? 0;
      }
    }
    stats.topGenres = Array.from(genres.entries())
      .map(([genre, count]) => ({ genre, count }))
      .sort((a, b) => b.count - a.count);
    return stats;
  }, [items]);
}

export type { ReelItem, ReelItemStatus, ReelItemType };
