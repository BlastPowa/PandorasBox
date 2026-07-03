import type { ReelCache } from "./schema";
import type { StorageAdapter } from "./listManager";

export class CacheManager {
  private readonly CACHE_KEY = "reel_cache";
  private adapter: StorageAdapter;

  constructor(adapter: StorageAdapter) {
    this.adapter = adapter;
  }

  private async readAll(): Promise<ReelCache[]> {
    const raw = await this.adapter.getItem(this.CACHE_KEY);
    if (raw === null) {
      return [];
    }
    try {
      const parsed = JSON.parse(raw) as ReelCache[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private async writeAll(entries: ReelCache[]): Promise<void> {
    await this.adapter.setItem(this.CACHE_KEY, JSON.stringify(entries));
  }

  async get<T>(key: string): Promise<T | null> {
    const entries = await this.readAll();
    const entry = entries.find((e) => e.key === key);
    if (!entry) {
      return null;
    }
    if (entry.fetchedAt + entry.ttlSeconds * 1000 <= Date.now()) {
      return null;
    }
    return entry.data as T;
  }

  async set(key: string, data: unknown, ttlSeconds?: number): Promise<void> {
    const entries = await this.readAll();
    const withoutKey = entries.filter((e) => e.key !== key);
    withoutKey.push({
      key,
      data,
      fetchedAt: Date.now(),
      ttlSeconds: ttlSeconds ?? 86400,
    });
    await this.writeAll(withoutKey);
  }

  async invalidate(key: string): Promise<void> {
    const entries = await this.readAll();
    await this.writeAll(entries.filter((e) => e.key !== key));
  }

  async clear(): Promise<void> {
    await this.adapter.removeItem(this.CACHE_KEY);
  }
}
