import type { ReelSettings } from "../../core/storage/schema";
import { createDefaultSettings } from "../../core/storage/schema";
import { chromeStorage } from "./chromeStorage";

const SETTINGS_KEY = "reel_settings";

export async function getSettings(): Promise<ReelSettings> {
  const raw = await chromeStorage.getItem(SETTINGS_KEY);
  if (raw === null) {
    return createDefaultSettings();
  }
  try {
    const parsed = JSON.parse(raw) as Partial<ReelSettings>;
    return { ...createDefaultSettings(), ...parsed };
  } catch {
    return createDefaultSettings();
  }
}

export async function saveSettings(partial: Partial<ReelSettings>): Promise<ReelSettings> {
  const current = await getSettings();
  const merged: ReelSettings = { ...current, ...partial };
  await chromeStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
  return merged;
}

export async function ensureDefaultSettings(): Promise<void> {
  const raw = await chromeStorage.getItem(SETTINGS_KEY);
  if (raw === null) {
    await chromeStorage.setItem(SETTINGS_KEY, JSON.stringify(createDefaultSettings()));
  }
}
