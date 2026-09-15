import type { ReelSettings } from "../../core/storage/schema";
import { createDefaultSettings } from "../../core/storage/schema";
import { chromeStorage } from "./chromeStorage";

const SETTINGS_KEY = "reel_settings";
const SYNC_USER_KEY = "reel_sync_user_id";

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanSupabaseUrl(value: unknown): string | null {
  const raw = cleanText(value, 2048);
  if (!raw) {
    return null;
  }
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password || url.hash) {
      return null;
    }
    if (!(url.hostname === "supabase.co" || url.hostname.endsWith(".supabase.co"))) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

function cleanSupabaseAnonKey(value: unknown): string | null {
  const raw = cleanText(value, 4096);
  if (raw.length < 20 || /\s/.test(raw)) {
    return null;
  }
  return raw;
}

function sanitizeSettings(partial: Partial<ReelSettings>): Partial<ReelSettings> {
  const clean: Partial<ReelSettings> = {};
  if (typeof partial.country === "string" && /^[A-Za-z]{2}$/.test(partial.country.trim())) {
    clean.country = partial.country.trim().toUpperCase();
  }
  if (typeof partial.notificationsEnabled === "boolean") clean.notificationsEnabled = partial.notificationsEnabled;
  if (typeof partial.autoTrack === "boolean") clean.autoTrack = partial.autoTrack;
  if (partial.theme === "dark") clean.theme = "dark";
  if (typeof partial.tmdbApiKey === "string") clean.tmdbApiKey = cleanText(partial.tmdbApiKey, 256);
  if (partial.supabaseUrl === null || typeof partial.supabaseUrl === "string") {
    clean.supabaseUrl = cleanSupabaseUrl(partial.supabaseUrl);
  }
  if (partial.supabaseAnonKey === null) {
    clean.supabaseAnonKey = null;
  } else if (typeof partial.supabaseAnonKey === "string") {
    clean.supabaseAnonKey = cleanSupabaseAnonKey(partial.supabaseAnonKey);
  }
  if (typeof partial.syncEnabled === "boolean") clean.syncEnabled = partial.syncEnabled;
  return clean;
}

export async function getSettings(): Promise<ReelSettings> {
  const raw = await chromeStorage.getItem(SETTINGS_KEY);
  if (raw === null) {
    return createDefaultSettings();
  }
  try {
    const parsed = JSON.parse(raw) as Partial<ReelSettings>;
    return { ...createDefaultSettings(), ...sanitizeSettings(parsed) };
  } catch {
    return createDefaultSettings();
  }
}

export async function saveSettings(partial: Partial<ReelSettings>): Promise<ReelSettings> {
  const current = await getSettings();
  const merged: ReelSettings = { ...current, ...sanitizeSettings(partial) };
  await chromeStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
  return merged;
}

export async function getOrCreateSyncUserId(): Promise<string> {
  const existing = await chromeStorage.getItem(SYNC_USER_KEY);
  if (existing && /^reel_[a-f0-9-]{36}$/i.test(existing)) {
    return existing;
  }
  const generated = `reel_${crypto.randomUUID()}`;
  await chromeStorage.setItem(SYNC_USER_KEY, generated);
  return generated;
}

export async function ensureDefaultSettings(): Promise<void> {
  const raw = await chromeStorage.getItem(SETTINGS_KEY);
  if (raw === null) {
    await chromeStorage.setItem(SETTINGS_KEY, JSON.stringify(createDefaultSettings()));
  }
}
