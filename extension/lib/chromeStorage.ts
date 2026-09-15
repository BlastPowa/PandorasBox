import type { StorageAdapter } from "../../core/storage/listManager";
import { ListManager } from "../../core/storage/listManager";
import { ProgressManager } from "../../core/storage/progressManager";
import { CacheManager } from "../../core/storage/cache";

class ChromeStorageAdapter implements StorageAdapter {
  async getItem(key: string): Promise<string | null> {
    try {
      const result = await chrome.storage.local.get(key);
      const value = result[key];
      return typeof value === "string" ? value : null;
    } catch (error) {
      console.error("chromeStorage.getItem failed", error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      await chrome.storage.local.set({ [key]: value });
    } catch (error) {
      console.error("chromeStorage.setItem failed", error);
      throw error instanceof Error ? error : new Error("chrome.storage.local.set failed");
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await chrome.storage.local.remove(key);
    } catch (error) {
      console.error("chromeStorage.removeItem failed", error);
      throw error instanceof Error ? error : new Error("chrome.storage.local.remove failed");
    }
  }
}

export const chromeStorage = new ChromeStorageAdapter();

export interface Managers {
  listManager: ListManager;
  progressManager: ProgressManager;
  cacheManager: CacheManager;
}

export function initManagers(): Managers {
  const listManager = new ListManager(chromeStorage);
  const progressManager = new ProgressManager(listManager);
  const cacheManager = new CacheManager(chromeStorage);
  return { listManager, progressManager, cacheManager };
}
