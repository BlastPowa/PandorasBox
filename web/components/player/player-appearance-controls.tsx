"use client";

import {
  CircleDot,
  Expand,
  Eye,
  Gauge,
  Layers3,
  Palette,
  PauseCircle,
  Sparkles,
} from "lucide-react";
import type { PlayerPreferences } from "@/lib/playback/preferences";

type Choice<T extends string> = { value: T; label: string };

const ACCENTS: Array<{ value: PlayerPreferences["accentColour"]; label: string; colour: string }> = [
  { value: "brand", label: "PBox", colour: "var(--accent)" },
  { value: "white", label: "White", colour: "#f7f7f8" },
  { value: "blue", label: "Blue", colour: "#3b82f6" },
  { value: "red", label: "Red", colour: "#f43f4f" },
  { value: "violet", label: "Violet", colour: "#9b4de8" },
  { value: "emerald", label: "Emerald", colour: "#16b98d" },
  { value: "amber", label: "Amber", colour: "#f59e0b" },
  { value: "pink", label: "Pink", colour: "#f43f67" },
  { value: "cyan", label: "Cyan", colour: "#16aec4" },
];

const ICON_STYLES: Choice<PlayerPreferences["iconStyle"]>[] = [
  { value: "line", label: "Line" },
  { value: "bold", label: "Bold" },
  { value: "soft", label: "Soft" },
];

const UI_SCALES: Choice<PlayerPreferences["uiScale"]>[] = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
  { value: "x-large", label: "X-Large" },
  { value: "2x-large", label: "2X-Large" },
];

const PROGRESS_STYLES: Choice<PlayerPreferences["progressStyle"]>[] = [
  { value: "minimal", label: "Minimal" },
  { value: "glow", label: "Glow" },
  { value: "gradient", label: "Gradient" },
  { value: "neon", label: "Neon" },
];

const DENSITIES: Choice<PlayerPreferences["density"]>[] = [
  { value: "compact", label: "Compact" },
  { value: "normal", label: "Normal" },
  { value: "spacious", label: "Spacious" },
];

const CONTROL_STYLES: Choice<PlayerPreferences["controlsStyle"]>[] = [
  { value: "low", label: "Low" },
  { value: "raised", label: "Raised" },
  { value: "floating", label: "Floating" },
];

const SEEK_PREVIEWS: Choice<PlayerPreferences["seekPreviewStyle"]>[] = [
  { value: "off", label: "Off" },
  { value: "standard", label: "Standard" },
  { value: "large", label: "Large" },
];

const PAUSED_INFO: Choice<PlayerPreferences["pausedInfoStyle"]>[] = [
  { value: "hidden", label: "Hidden" },
  { value: "compact", label: "Compact" },
  { value: "detailed", label: "Detailed" },
];

function Segmented<T extends string>({
  value,
  options,
  onChange,
  compact = false,
}: {
  value: T;
  options: Choice<T>[];
  onChange: (value: T) => void;
  compact?: boolean;
}) {
  return (
    <div className={`grid overflow-hidden rounded-xl border border-[var(--border)] bg-black/10 ${compact ? "gap-px p-0.5" : "gap-1 p-1"}`} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`${compact ? "min-h-8 px-1 text-[10px]" : "min-h-10 px-2 text-xs"} rounded-lg font-semibold transition ${selected ? "bg-white/14 text-[var(--text)] shadow-inner" : "text-[var(--text-muted)] hover:bg-white/[0.055] hover:text-[var(--text-secondary)]"}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function SettingBlock({
  icon,
  title,
  children,
  compact,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  compact: boolean;
}) {
  return (
    <div className={`rounded-2xl border border-[var(--border)] bg-[var(--glass)] ${compact ? "p-3" : "p-4"}`}>
      <div className="mb-3 flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-lg bg-[rgb(var(--accent-rgb)/0.14)] text-[var(--accent)]">{icon}</span>
        <span className="text-sm font-bold text-[var(--text)]">{title}</span>
      </div>
      {children}
    </div>
  );
}

function ToggleTile({
  checked,
  onChange,
  icon,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className={`flex min-h-12 items-center gap-2 rounded-xl border px-3 text-left text-sm font-semibold transition ${checked ? "border-white/15 bg-white/10 text-[var(--text)]" : "border-[var(--border)] bg-[var(--glass)] text-[var(--text-secondary)] hover:bg-white/[0.055]"}`}
    >
      <span className={`grid size-7 place-items-center rounded-lg ${checked ? "bg-[rgb(var(--accent-rgb)/0.17)] text-[var(--accent)]" : "bg-white/[0.055] text-[var(--text-muted)]"}`}>{icon}</span>
      <span>{label}</span>
      <span className={`ml-auto h-2.5 w-2.5 rounded-full ${checked ? "bg-[var(--accent)] shadow-[0_0_12px_rgb(var(--accent-rgb)/0.6)]" : "bg-white/15"}`} />
    </button>
  );
}

export function PlayerAppearanceControls({
  preferences,
  onChange,
  compact = false,
}: {
  preferences: PlayerPreferences;
  onChange: (patch: Partial<PlayerPreferences>) => void;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "space-y-2.5" : "space-y-3"}>
      <SettingBlock icon={<Palette className="size-4" />} title="Accent colour" compact={compact}>
        <div className="flex flex-wrap gap-2">
          {ACCENTS.map((accent) => {
            const selected = preferences.accentColour === accent.value;
            return (
              <button
                key={accent.value}
                type="button"
                aria-label={`${accent.label} accent`}
                aria-pressed={selected}
                title={accent.label}
                onClick={() => onChange({ accentColour: accent.value })}
                className={`${compact ? "size-8" : "size-10"} rounded-full border-2 transition hover:scale-105 ${selected ? "border-white ring-2 ring-white/20" : "border-transparent"}`}
                style={{ background: accent.colour }}
              />
            );
          })}
        </div>
      </SettingBlock>

      <SettingBlock icon={<CircleDot className="size-4" />} title="Icon style" compact={compact}>
        <Segmented value={preferences.iconStyle} options={ICON_STYLES} onChange={(iconStyle) => onChange({ iconStyle })} compact={compact} />
      </SettingBlock>

      <SettingBlock icon={<Expand className="size-4" />} title="UI scale" compact={compact}>
        <Segmented value={preferences.uiScale} options={UI_SCALES} onChange={(uiScale) => onChange({ uiScale })} compact={compact} />
      </SettingBlock>

      <SettingBlock icon={<Gauge className="size-4" />} title="Progress style" compact={compact}>
        <Segmented value={preferences.progressStyle} options={PROGRESS_STYLES} onChange={(progressStyle) => onChange({ progressStyle })} compact={compact} />
      </SettingBlock>

      <SettingBlock icon={<Layers3 className="size-4" />} title="Density" compact={compact}>
        <Segmented value={preferences.density} options={DENSITIES} onChange={(density) => onChange({ density })} compact={compact} />
      </SettingBlock>

      <SettingBlock icon={<Layers3 className="size-4" />} title="Controls style" compact={compact}>
        <Segmented value={preferences.controlsStyle} options={CONTROL_STYLES} onChange={(controlsStyle) => onChange({ controlsStyle })} compact={compact} />
      </SettingBlock>

      <div className="grid gap-2.5 md:grid-cols-2">
        <SettingBlock icon={<Eye className="size-4" />} title="Seek preview" compact={compact}>
          <Segmented value={preferences.seekPreviewStyle} options={SEEK_PREVIEWS} onChange={(seekPreviewStyle) => onChange({ seekPreviewStyle })} compact />
        </SettingBlock>
        <SettingBlock icon={<PauseCircle className="size-4" />} title="Paused info" compact={compact}>
          <Segmented value={preferences.pausedInfoStyle} options={PAUSED_INFO} onChange={(pausedInfoStyle) => onChange({ pausedInfoStyle })} compact />
        </SettingBlock>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <ToggleTile checked={preferences.glowControls} onChange={(glowControls) => onChange({ glowControls })} icon={<Sparkles className="size-4" />} label="Glow controls" />
        <ToggleTile checked={preferences.roundedControls} onChange={(roundedControls) => onChange({ roundedControls })} icon={<CircleDot className="size-4" />} label="Rounded controls" />
      </div>
    </div>
  );
}
