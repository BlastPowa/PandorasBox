"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, RotateCcw } from "lucide-react";
import { GlassCard } from "@/components/ui-fx/glass-card";
import { Button } from "@/components/ui-fx/button";
import {
  DEFAULT_PLAYER_PREFERENCES,
  readPlayerPreferences,
  writePlayerPreferences,
  type PlayerPreferences,
} from "@/lib/playback/preferences";

const SOURCE_LABELS = {
  peertube: "PeerTube",
  "internet-archive": "Internet Archive",
  wikimedia: "Wikimedia Commons",
} as const;

type SourceId = keyof typeof SOURCE_LABELS;

function sourceLabel(source: string): string {
  return source in SOURCE_LABELS ? SOURCE_LABELS[source as SourceId] : source;
}

function loadSettings(): PlayerPreferences {
  const saved = readPlayerPreferences();
  const sourceOrder = saved.sourceOrder.filter((source): source is SourceId => source in SOURCE_LABELS);
  return {
    ...saved,
    sourceOrder: sourceOrder.length === Object.keys(SOURCE_LABELS).length
      ? sourceOrder
      : [...DEFAULT_PLAYER_PREFERENCES.sourceOrder],
  };
}

function SettingToggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--glass)] p-4">
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-[var(--text)]">{label}</span>
        <span className="mt-1 block text-xs leading-relaxed text-[var(--text-muted)]">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-5 shrink-0 accent-[var(--accent)]"
      />
    </label>
  );
}

export function PlayerSettingsSection() {
  const [settings, setSettings] = useState<PlayerPreferences>(loadSettings);

  useEffect(() => {
    writePlayerPreferences(settings);
  }, [settings]);

  function moveSource(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= settings.sourceOrder.length) return;
    setSettings((current) => {
      const sourceOrder = [...current.sourceOrder];
      [sourceOrder[index], sourceOrder[nextIndex]] = [sourceOrder[nextIndex]!, sourceOrder[index]!];
      return { ...current, sourceOrder };
    });
  }

  function reset() {
    setSettings({ ...DEFAULT_PLAYER_PREFERENCES, sourceOrder: [...DEFAULT_PLAYER_PREFERENCES.sourceOrder] });
  }

  return (
    <div className="space-y-5">
      <GlassCard macDots title="Player & streaming">
        <div className="space-y-5 p-5">
          <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
            Choose how PBox should handle playback when more than one compatible source is available. These preferences are saved only in this browser.
          </p>

          <div className="grid gap-3">
            <SettingToggle
              checked={settings.autoFallback}
              onChange={(autoFallback) => setSettings((current) => ({ ...current, autoFallback }))}
              label="Automatic source fallback"
              description="If the current source fails, try the next source in your priority list automatically."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">Preferred quality</span>
              <select
                value={settings.preferredQuality}
                onChange={(event) => setSettings((current) => ({ ...current, preferredQuality: event.target.value as PlayerPreferences["preferredQuality"] }))}
                className="min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 text-sm outline-none focus:border-[var(--accent)]"
              >
                <option value="auto">Auto</option>
                <option value="1080p">1080p</option>
                <option value="720p">720p</option>
                <option value="480p">480p</option>
                <option value="360p">360p</option>
              </select>
              <span className="mt-1.5 block text-xs text-[var(--text-muted)]">Auto lets the player choose the best quality for the connection.</span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">Subtitles</span>
              <select
                value={settings.subtitles}
                onChange={(event) => setSettings((current) => ({ ...current, subtitles: event.target.value as PlayerPreferences["subtitles"] }))}
                className="min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 text-sm outline-none focus:border-[var(--accent)]"
              >
                <option value="auto">Auto</option>
                <option value="on">Always on when available</option>
                <option value="off">Off</option>
              </select>
              <span className="mt-1.5 block text-xs text-[var(--text-muted)]">Auto follows the source/player default when subtitle tracks exist.</span>
            </label>
          </div>

          <label className="block rounded-[var(--radius-md)] border border-[var(--border)] p-4">
            <span className="flex items-center justify-between gap-3">
              <span>
                <span className="block text-sm font-semibold">Completion threshold</span>
                <span className="mt-1 block text-xs text-[var(--text-muted)]">Mark an episode or movie completed after this percentage has been watched.</span>
              </span>
              <span className="rounded-full bg-[rgb(var(--accent-rgb)/0.14)] px-2.5 py-1 font-mono text-xs font-bold text-[var(--accent)]">
                {settings.completionThreshold}%
              </span>
            </span>
            <input
              type="range"
              min={50}
              max={100}
              step={1}
              value={settings.completionThreshold}
              onChange={(event) => setSettings((current) => ({ ...current, completionThreshold: Number(event.target.value) }))}
              className="mt-4 w-full accent-[var(--accent)]"
            />
          </label>
        </div>
      </GlassCard>

      <GlassCard macDots title="Source priority">
        <div className="space-y-4 p-5">
          <p className="text-xs leading-relaxed text-[var(--text-muted)]">
            PBox will prefer sources from top to bottom. Move a source higher if you want it tried first when a title is available from multiple sources.
          </p>
          <div className="space-y-2">
            {settings.sourceOrder.map((source, index) => (
              <div key={source} className="flex min-h-14 items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--glass)] px-4 py-2.5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[rgb(var(--accent-rgb)/0.14)] font-mono text-xs font-bold text-[var(--accent)]">
                    {index + 1}
                  </span>
                  <span className="truncate text-sm font-semibold">{sourceLabel(source)}</span>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => moveSource(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move ${sourceLabel(source)} up`}
                    className="grid size-9 place-items-center rounded-lg border border-[var(--border)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-strong)] hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ArrowUp className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSource(index, 1)}
                    disabled={index === settings.sourceOrder.length - 1}
                    aria-label={`Move ${sourceLabel(source)} down`}
                    className="grid size-9 place-items-center rounded-lg border border-[var(--border)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-strong)] hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ArrowDown className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end border-t border-[var(--border)] pt-4">
            <Button type="button" variant="glass" onClick={reset}>
              <RotateCcw className="size-4" /> Reset player settings
            </Button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
