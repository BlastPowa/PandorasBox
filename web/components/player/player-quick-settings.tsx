"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Gauge, Languages, MonitorPlay, Server, Settings2, SkipForward, X } from "lucide-react";
import {
  type PlayerPreferences,
  readPlayerPreferences,
  writePlayerPreferences,
} from "@/lib/playback/preferences";
import { PlayerAppearanceControls } from "./player-appearance-controls";

type PlaybackConfiguration = {
  jellyfin: boolean;
  emby: boolean;
  configuredFeed: boolean;
  hasPrivateSource: boolean;
};

function Toggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 rounded-full transition ${checked ? "bg-[var(--accent)]" : "bg-white/15"}`}
    >
      <span className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-all ${checked ? "left-[18px]" : "left-0.5"}`} />
    </button>
  );
}

export function PlayerQuickSettings({
  open,
  onClose,
  configuration,
}: {
  open: boolean;
  onClose: () => void;
  configuration: PlaybackConfiguration | null;
}) {
  const [settings, setSettings] = useState<PlayerPreferences>(() => readPlayerPreferences());
  const [appearanceOpen, setAppearanceOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSettings(readPlayerPreferences());
  }, [open]);

  if (!open) return null;

  const updateSettings = (patch: Partial<PlayerPreferences>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      writePlayerPreferences(next);
      return next;
    });
  };

  const sourceRows = [
    ["Jellyfin", configuration?.jellyfin ?? false],
    ["Emby", configuration?.emby ?? false],
    ["PBox feed", configuration?.configuredFeed ?? false],
  ] as const;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:items-end sm:justify-end sm:p-6" role="dialog" aria-modal="true" aria-label="Quick player settings">
      <button type="button" aria-label="Close player settings" onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" />

      <div className="relative z-10 max-h-[82vh] w-full max-w-[390px] overflow-y-auto rounded-3xl border border-white/10 bg-[#070708]/98 text-left shadow-[0_28px_100px_rgba(0,0,0,0.8)] backdrop-blur-2xl [scrollbar-width:thin]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.07] bg-[#070708]/95 px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-white/[0.06] text-[var(--accent)]"><Settings2 className="size-[18px]" /></span>
            <div>
              <p className="text-sm font-bold text-white">Quick player settings</p>
              <p className="text-[10px] text-white/40">Saved on this device</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="grid size-8 place-items-center rounded-full bg-white/[0.06] text-white/65 transition hover:bg-white/10 hover:text-white" aria-label="Close"><X className="size-4" /></button>
        </div>

        <div className="border-b border-white/[0.07] px-4 py-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-white/80"><Server className="size-4 text-white/45" /> Playback sources</div>
          <div className="grid grid-cols-3 gap-2">
            {sourceRows.map(([label, connected]) => (
              <div key={label} className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-2.5 py-2 text-center">
                <span className={`mx-auto mb-1.5 block size-1.5 rounded-full ${connected ? "bg-emerald-400" : "bg-white/20"}`} />
                <p className="truncate text-[10px] font-bold text-white/70">{label}</p>
                <p className="mt-0.5 text-[9px] text-white/30">{connected ? "Connected" : "Not set"}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="divide-y divide-white/[0.055]">
          <div className="flex min-h-14 items-center gap-3 px-4 py-3">
            <MonitorPlay className="size-[18px] shrink-0 text-white/45" />
            <div className="min-w-0 flex-1"><p className="text-[13px] font-semibold text-white/90">Automatic fallback</p><p className="text-[10px] text-white/35">Try the next available source if playback fails</p></div>
            <Toggle checked={settings.autoFallback} onChange={(autoFallback) => updateSettings({ autoFallback })} />
          </div>

          <label className="flex min-h-14 items-center gap-3 px-4 py-3">
            <Gauge className="size-[18px] shrink-0 text-white/45" />
            <span className="flex-1 text-[13px] font-semibold text-white/90">Preferred quality</span>
            <select value={settings.preferredQuality} onChange={(event) => updateSettings({ preferredQuality: event.target.value as PlayerPreferences["preferredQuality"] })} className="appearance-none bg-transparent text-right text-xs text-white/45 outline-none" aria-label="Preferred quality">
              <option value="auto" className="bg-black text-white">Auto</option>
              <option value="1080p" className="bg-black text-white">1080p</option>
              <option value="720p" className="bg-black text-white">720p</option>
              <option value="480p" className="bg-black text-white">480p</option>
              <option value="360p" className="bg-black text-white">360p</option>
            </select>
          </label>

          <label className="flex min-h-14 items-center gap-3 px-4 py-3">
            <Languages className="size-[18px] shrink-0 text-white/45" />
            <span className="flex-1 text-[13px] font-semibold text-white/90">Subtitles</span>
            <select value={settings.subtitles} onChange={(event) => updateSettings({ subtitles: event.target.value as PlayerPreferences["subtitles"] })} className="appearance-none bg-transparent text-right text-xs text-white/45 outline-none" aria-label="Subtitle preference">
              <option value="auto" className="bg-black text-white">Auto</option>
              <option value="on" className="bg-black text-white">On</option>
              <option value="off" className="bg-black text-white">Off</option>
            </select>
          </label>

          <div className="flex min-h-14 items-center gap-3 px-4 py-3">
            <SkipForward className="size-[18px] shrink-0 text-white/45" />
            <div className="min-w-0 flex-1"><p className="text-[13px] font-semibold text-white/90">Auto next</p><p className="text-[10px] text-white/35">Start the next episode or connected title</p></div>
            <Toggle checked={settings.autoplayNext} onChange={(autoplayNext) => updateSettings({ autoplayNext })} />
          </div>

          <label className="block px-4 py-4">
            <span className="flex items-center justify-between gap-3 text-[13px] font-semibold text-white/90">
              Completion threshold
              <span className="rounded-full bg-[rgb(var(--accent-rgb)/0.14)] px-2 py-1 font-mono text-[10px] font-bold text-[var(--accent)]">{settings.completionThreshold}%</span>
            </span>
            <input type="range" min={70} max={100} step={1} value={settings.completionThreshold} onChange={(event) => updateSettings({ completionThreshold: Number(event.target.value) })} className="mt-3 w-full accent-[var(--accent)]" />
          </label>
        </div>

        <div className="border-y border-white/[0.07] bg-white/[0.015] px-4 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-white/20">Appearance</div>
        <div>
          <button type="button" onClick={() => setAppearanceOpen((value) => !value)} className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-white/[0.035]">
            <span className="text-[13px] font-semibold text-white/90">Player appearance</span>
            <span className="text-[10px] font-bold uppercase tracking-wide text-white/35">{appearanceOpen ? "Hide" : "Edit"}</span>
          </button>
          {appearanceOpen && <div className="border-t border-white/[0.055] bg-black/20 p-3 [--border:rgba(255,255,255,0.08)] [--glass:rgba(255,255,255,0.025)] [--text:#fff] [--text-secondary:rgba(255,255,255,0.72)] [--text-muted:rgba(255,255,255,0.4)]"><PlayerAppearanceControls preferences={settings} onChange={updateSettings} compact /></div>}
        </div>

        <div className="border-t border-white/[0.07] p-3">
          <Link href="/settings#player" onClick={onClose} className="flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 text-xs font-semibold text-white/60 transition hover:bg-white/[0.06] hover:text-white">
            Full player settings <ExternalLink className="size-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
