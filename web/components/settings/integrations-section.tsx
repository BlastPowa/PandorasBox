"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Link2, Unlink, RefreshCw, AlertTriangle, CheckCircle2, Clock, History, GitMerge,
  Download, Puzzle, ShieldCheck, ExternalLink,
} from "lucide-react";
import { GlassCard } from "@/components/ui-fx/glass-card";
import { Button } from "@/components/ui-fx/button";
import { Switch } from "@/components/ui-fx/switch";

interface ProviderState {
  id: string;
  name: string;
  description: string;
  color: string;
  configured: boolean;
  connected: boolean;
  username: string | null;
  autoSync: boolean;
  lastSyncedAt: string | null;
  lastSyncOk: boolean | null;
  lastError: string | null;
  lastFailedAt: string | null;
  tokenExpiresAt: string | null;
}

interface HistoryEntry {
  provider: string;
  direction: string;
  ok: boolean;
  items_synced: number;
  message: string | null;
  created_at: string;
}

interface Conflict {
  id: string;
  provider: string;
  media_key: string;
  local: { status: string; progress: number; rating: number | null; title?: string; updatedAt?: string };
  remote: { status: string; progress: number; rating: number | null; title?: string; updatedAt?: string };
}

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function timeUntil(iso: string | null): string {
  if (!iso) return "soon";
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000;
  if (seconds <= 0) return "now";
  if (seconds < 3600) return `in ${Math.max(1, Math.ceil(seconds / 60))}m`;
  if (seconds < 86400) return `in ${Math.ceil(seconds / 3600)}h`;
  return `in ${Math.ceil(seconds / 86400)}d`;
}

function expiringSoon(iso: string | null): boolean {
  if (!iso) return false;
  return new Date(iso).getTime() - Date.now() < 7 * 24 * 3600 * 1000;
}

function providerLabel(id: string): string {
  if (id === "mal") return "MyAnimeList";
  if (id === "anilist") return "AniList";
  if (id === "trakt") return "Trakt";
  if (id === "simkl") return "Simkl";
  return id;
}

function providerBadge(id: string): string {
  if (id === "mal") return "MAL";
  if (id === "anilist") return "AL";
  if (id === "trakt") return "TRAKT";
  if (id === "simkl") return "SIMKL";
  return id.slice(0, 5).toUpperCase();
}

function providerUrl(id: string): string {
  if (id === "mal") return "https://myanimelist.net/";
  if (id === "anilist") return "https://anilist.co/";
  if (id === "trakt") return "https://trakt.tv/";
  if (id === "simkl") return "https://simkl.com/";
  return "#";
}

function providerScope(id: string): string[] {
  if (id === "mal" || id === "anilist") return ["Anime", "Manga", "Manhwa"];
  if (id === "trakt" || id === "simkl") return ["Movies", "TV series"];
  return [];
}

const companionSources = [
  {
    name: "Cinejoy",
    href: "https://cinejoy.pk/",
    detail: "Movies + TV",
    coverage: "TMDB title mapping, seasons and episodes",
  },
  {
    name: "CinemaOS",
    href: "https://cinemaos.live/",
    detail: "Movies + TV",
    coverage: "Title, season and episode progress",
  },
  {
    name: "Crunchyroll",
    href: "https://www.crunchyroll.com/",
    detail: "Anime",
    coverage: "Dedicated episode tracking",
  },
  {
    name: "Anime Nexus",
    href: "https://anime.nexus/",
    detail: "Anime",
    coverage: "Watch-page episodes + embedded player context",
  },
  {
    name: "Netflix + Disney+",
    href: null,
    detail: "Movies + TV",
    coverage: "Dedicated playback tracking",
  },
  {
    name: "Other compatible sites",
    href: null,
    detail: "Long-form video",
    coverage: "Universal prominent-player tracking where media context is detectable",
  },
] as const;

function BrowserCompanionCard() {
  return (
    <GlassCard macDots title="Browser companion" strong>
      <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[1.05fr_.95fr] lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="grid size-11 place-items-center rounded-2xl bg-[rgb(var(--accent-rgb)/0.14)] text-[var(--accent)]">
              <Puzzle className="size-5" />
            </span>
            <div>
              <p className="font-display text-lg font-bold">Pandora&apos;s Box for Chrome</p>
              <p className="text-xs font-semibold text-[var(--accent)]">Version 1.3.3</p>
            </div>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            Track movies, series, anime, manga and manhwa while you browse. Cinejoy, CinemaOS and Anime Nexus are covered by the
            browser companion alongside Netflix, Disney+ and Crunchyroll, with a universal fallback for compatible long-form players.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--text-muted)]">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--glass)] px-3 py-1.5">
              <ShieldCheck className="size-3.5 text-emerald-500" /> No Netflix or Disney password required
            </span>
            <span className="rounded-full border border-[var(--border)] bg-[var(--glass)] px-3 py-1.5">Chrome / Chromium</span>
            <span className="rounded-full border border-[var(--border)] bg-[var(--glass)] px-3 py-1.5">Playback tracking</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild>
              <a href="/downloads/pandoras-box-extension-v1.3.4.zip" download>
                <Download className="size-4" /> Download extension
              </a>
            </Button>
            <Button asChild variant="glass">
              <a href="/updates">See what changed</a>
            </Button>
          </div>
        </div>
        <div className="space-y-3">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Tracked playback sources</p>
                <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">Runs locally in the extension while you watch.</p>
              </div>
              <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-500">
                Supported
              </span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {companionSources.map((source) => {
                const body = (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--glass)] p-3 transition-colors hover:border-[rgb(var(--accent-rgb)/0.35)]">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-[var(--text-primary)]">{source.name}</p>
                      {source.href && <ExternalLink className="size-3 text-[var(--text-muted)]" />}
                    </div>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">{source.detail}</p>
                    <p className="mt-1.5 text-[11px] leading-4 text-[var(--text-muted)]">{source.coverage}</p>
                  </div>
                );

                return source.href ? (
                  <a key={source.name} href={source.href} target="_blank" rel="noreferrer" className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
                    {body}
                  </a>
                ) : (
                  <div key={source.name}>{body}</div>
                );
              })}
            </div>
            <p className="mt-3 text-[11px] leading-5 text-[var(--text-muted)]">
              Account syncing is managed separately below. Browser-companion playback progress is exposed locally to PBox Home while the extension is installed.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
            <p className="text-sm font-semibold">Install in Chrome</p>
            <ol className="mt-3 space-y-2 text-xs leading-5 text-[var(--text-secondary)]">
              <li><span className="mr-2 font-bold text-[var(--accent)]">1.</span>Download and extract the ZIP.</li>
              <li><span className="mr-2 font-bold text-[var(--accent)]">2.</span>Open <code className="rounded bg-[var(--glass)] px-1.5 py-0.5">chrome://extensions</code> and enable Developer mode.</li>
              <li><span className="mr-2 font-bold text-[var(--accent)]">3.</span>Choose <strong>Load unpacked</strong> and select the extracted folder.</li>
            </ol>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

/** Settings → Integrations. Every connected external account lives here. */
export function IntegrationsSection({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const [providers, setProviders] = useState<ProviderState[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(signedIn);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/integrations");
      if (!res.ok) return;
      const json = (await res.json()) as { providers: ProviderState[]; history: HistoryEntry[]; pendingConflicts: number };
      setProviders(json.providers);
      setHistory(json.history);
      if (json.pendingConflicts > 0) {
        const c = await fetch("/api/integrations/conflicts");
        if (c.ok) setConflicts(((await c.json()) as { conflicts: Conflict[] }).conflicts);
      } else {
        setConflicts([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    void load();
    // Surface OAuth redirect results.
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    const error = params.get("integration_error");
    if (connected) toast.success(`${providerLabel(connected)} connected`);
    if (error) toast.error(error);
    if (connected || error) window.history.replaceState({}, "", "/settings#integrations");
  }, [signedIn, load]);

  async function disconnect(id: string, name: string) {
    if (!window.confirm(`Disconnect ${name}? Sync history and queued updates for it will be removed.`)) return;
    const response = await fetch(`/api/integrations?provider=${id}`, { method: "DELETE" });
    if (!response.ok) {
      toast.error(`Could not disconnect ${name}`);
      return;
    }
    toast.success(`${name} disconnected`);
    void load();
  }

  async function toggleAutoSync(id: string, autoSync: boolean) {
    setProviders((p) => p.map((x) => (x.id === id ? { ...x, autoSync } : x)));
    const response = await fetch("/api/integrations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: id, autoSync }),
    });
    if (!response.ok) {
      setProviders((p) => p.map((x) => (x.id === id ? { ...x, autoSync: !autoSync } : x)));
      toast.error("Could not update Auto Sync");
    }
  }

  async function syncNow(id: string, name: string) {
    setSyncing(id);
    try {
      const res = await fetch(`/api/integrations/${id}/sync`, { method: "POST" });
      const json = (await res.json()) as { pulled?: number; pushed?: number; conflicts?: number; error?: string };
      if (!res.ok) {
        toast.error(json.error ?? `${name} sync failed`);
      } else if (json.conflicts) {
        toast.warning(`Synced with ${json.conflicts} conflict(s) — pick which version to keep below.`);
      } else {
        toast.success(`${name}: pulled ${json.pulled ?? 0}, pushed ${json.pushed ?? 0}`);
      }
    } catch {
      toast.error(`${name} sync failed`);
    } finally {
      setSyncing(null);
      void load();
    }
  }

  async function syncAllConnected() {
    const connected = providers.filter((provider) => provider.connected);
    if (!connected.length) return;
    setSyncingAll(true);
    let successful = 0;
    let conflictsFound = 0;
    try {
      for (const provider of connected) {
        setSyncing(provider.id);
        const response = await fetch(`/api/integrations/${provider.id}/sync`, { method: "POST" });
        const payload = (await response.json().catch(() => null)) as { conflicts?: number } | null;
        if (response.ok) {
          successful += 1;
          conflictsFound += payload?.conflicts ?? 0;
        }
      }
      if (successful === connected.length && conflictsFound === 0) {
        toast.success(`Synced all ${successful} connected services`);
      } else if (successful > 0) {
        toast.warning(`Synced ${successful} of ${connected.length} services${conflictsFound ? ` with ${conflictsFound} conflict(s)` : ""}`);
      } else {
        toast.error("Connected services could not be synced");
      }
    } finally {
      setSyncing(null);
      setSyncingAll(false);
      void load();
    }
  }

  async function resolveConflict(id: string, keep: "local" | "remote") {
    setConflicts((c) => c.filter((x) => x.id !== id));
    const res = await fetch("/api/integrations/conflicts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, keep }),
    });
    if (res.ok) toast.success(`Kept the ${keep === "local" ? "PBox" : "external"} version`);
    else toast.error("Could not resolve conflict");
  }

  const connectedProviders = providers.filter((provider) => provider.connected);
  const autoSyncCount = connectedProviders.filter((provider) => provider.autoSync).length;
  const providerWarnings = connectedProviders.filter(
    (provider) => provider.lastSyncOk === false || expiringSoon(provider.tokenExpiresAt)
  ).length;
  const attentionCount = providerWarnings + conflicts.length;
  const lastSuccessfulSync = history.find((entry) => entry.ok)?.created_at ?? null;

  if (!signedIn) {
    return (
      <div className="space-y-5">
        <BrowserCompanionCard />
        <GlassCard macDots title="Integrations">
          <p className="p-5 text-sm text-[var(--text-muted)]">Sign in to connect external accounts.</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <BrowserCompanionCard />
      <GlassCard macDots title="Integrations">
      <div className="space-y-5 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold">Connected services</p>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--text-muted)]">
              Keep anime and manga lists, ratings and progress aligned across PBox and supported trackers from one control centre.
            </p>
          </div>
          <Button
            size="sm"
            variant="glass"
            loading={syncingAll}
            disabled={loading || connectedProviders.length === 0 || syncing !== null}
            onClick={() => void syncAllConnected()}
          >
            <RefreshCw className="size-4" /> Sync all connected
          </Button>
        </div>

        {loading && <p className="text-sm text-[var(--text-muted)]">Loading integrations…</p>}

        {!loading && (
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--glass)] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Connected</p>
              <p className="mt-1 font-display text-2xl font-bold">{connectedProviders.length}<span className="ml-1 text-sm font-medium text-[var(--text-muted)]">/ {providers.length}</span></p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--glass)] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Auto Sync</p>
              <p className="mt-1 font-display text-2xl font-bold">{autoSyncCount}</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--glass)] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Last healthy sync</p>
              <p className="mt-2 text-sm font-semibold">{timeAgo(lastSuccessfulSync)}</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--glass)] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Needs attention</p>
              <p className={`mt-1 font-display text-2xl font-bold ${attentionCount ? "text-[var(--gold)]" : "text-emerald-400"}`}>{attentionCount}</p>
            </div>
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
        {providers.map((p) => (
          <div key={p.id} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] text-sm font-bold text-white"
                style={{ backgroundColor: p.color }}
              >
                {providerBadge(p.id)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{p.name}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                    p.connected
                      ? "bg-emerald-500/12 text-emerald-400"
                      : p.configured
                        ? "bg-[var(--glass-strong)] text-[var(--text-muted)]"
                        : "bg-[rgb(var(--gold-rgb)/0.12)] text-[var(--gold)]"
                  }`}>
                    {p.connected ? "Connected" : p.configured ? "Ready" : "Setup needed"}
                  </span>
                </div>
                {p.connected && p.username && (
                  <p className="mt-0.5 text-xs text-[var(--text-secondary)]">Signed in as {p.username}</p>
                )}
                <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">{p.description}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {providerScope(p.id).map((scope) => (
                    <span key={scope} className="rounded-full border border-[var(--border)] bg-[var(--glass)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">
                      {scope}
                    </span>
                  ))}
                  <a
                    href={providerUrl(p.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--accent)] hover:underline"
                  >
                    Open {p.name} <ExternalLink className="size-3" />
                  </a>
                </div>
              </div>
              {p.connected ? (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="glass"
                    loading={syncing === p.id}
                    disabled={syncingAll || (syncing !== null && syncing !== p.id)}
                    onClick={() => void syncNow(p.id, p.name)}
                  >
                    <RefreshCw className="size-4" /> Sync now
                  </Button>
                  <Button size="sm" variant="danger" disabled={syncingAll || syncing !== null} onClick={() => void disconnect(p.id, p.name)}>
                    <Unlink className="size-4" /> Disconnect
                  </Button>
                </div>
              ) : (
                <Button size="sm" disabled={!p.configured} onClick={() => router.push(`/api/integrations/${p.id}/connect`)}>
                  <Link2 className="size-4" /> Connect
                </Button>
              )}
            </div>

            {!p.configured && (
              <p className="mt-2 text-xs text-[var(--gold)]">
                Not configured — add {p.id.toUpperCase()}_CLIENT_ID / {p.id.toUpperCase()}_CLIENT_SECRET to the environment.
              </p>
            )}

            {p.connected && (
              <div className="mt-3 space-y-2 border-t border-[var(--border)] pt-3 text-xs text-[var(--text-secondary)]">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3.5" /> Last sync: {timeAgo(p.lastSyncedAt)}
                    {p.lastSyncOk === true && <CheckCircle2 className="size-3.5 text-emerald-400" />}
                    {p.lastSyncOk === false && <AlertTriangle className="size-3.5 text-[var(--gold)]" />}
                  </span>
                  {p.lastFailedAt && (
                    <span className="text-[var(--text-muted)]">Last failed: {timeAgo(p.lastFailedAt)}</span>
                  )}
                  <label className="ml-auto inline-flex items-center gap-2">
                    Auto Sync
                    <Switch checked={p.autoSync} onCheckedChange={(v) => void toggleAutoSync(p.id, v)} />
                  </label>
                </div>
                {p.lastSyncOk === false && p.lastError && (
                  <p className="text-[#fca5a5]">
                    {p.lastError}{" "}
                    <button className="underline" onClick={() => router.push(`/api/integrations/${p.id}/connect`)}>
                      Reconnect
                    </button>
                  </p>
                )}
                {expiringSoon(p.tokenExpiresAt) && p.lastSyncOk !== false && (
                  <p className="text-[var(--gold)]">
                    Connection expires {timeUntil(p.tokenExpiresAt)} — it will auto-refresh, or{" "}
                    <button className="underline" onClick={() => router.push(`/api/integrations/${p.id}/connect`)}>
                      reconnect now
                    </button>.
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
        </div>

        {/* Conflict resolution */}
        {conflicts.length > 0 && (
          <div className="rounded-[var(--radius-md)] border border-[rgb(var(--gold-rgb)/0.4)] bg-[rgb(var(--gold-rgb)/0.08)] p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <GitMerge className="size-4 text-[var(--gold)]" /> Sync conflicts — pick which version to keep
            </p>
            <div className="space-y-3">
              {conflicts.map((c) => (
                <div key={c.id} className="rounded-[var(--radius-md)] bg-[var(--bg-surface)] p-3 text-xs">
                  <p className="mb-2 font-semibold">{c.local.title ?? c.media_key}</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      onClick={() => void resolveConflict(c.id, "local")}
                      className="rounded-[var(--radius-md)] border border-[var(--border)] p-2 text-left transition-colors hover:border-[var(--accent)]"
                    >
                      <p className="font-semibold text-[var(--accent)]">Keep PBox</p>
                      <p>{c.local.status} · {c.local.progress} watched{c.local.rating ? ` · ★${c.local.rating}` : ""}</p>
                    </button>
                    <button
                      onClick={() => void resolveConflict(c.id, "remote")}
                      className="rounded-[var(--radius-md)] border border-[var(--border)] p-2 text-left transition-colors hover:border-[var(--accent)]"
                    >
                      <p className="font-semibold">Keep {providerLabel(c.provider)}</p>
                      <p>{c.remote.status} · {c.remote.progress} watched{c.remote.rating ? ` · ★${c.remote.rating}` : ""}</p>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sync history */}
        <button
          onClick={() => setShowHistory((s) => !s)}
          className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
        >
          <History className="size-3.5" /> {showHistory ? "Hide" : "Show"} sync history
        </button>
        {showHistory && (
          <div className="space-y-1 text-xs">
            {history.length === 0 && <p className="text-[var(--text-muted)]">No syncs yet.</p>}
            {history.map((h, i) => (
              <div key={i} className="flex items-center gap-2 rounded bg-[var(--bg-surface)] px-3 py-1.5">
                {h.ok
                  ? <CheckCircle2 className="size-3.5 shrink-0 text-emerald-400" />
                  : <AlertTriangle className="size-3.5 shrink-0 text-[#fca5a5]" />}
                <span className="font-semibold uppercase">{h.provider}</span>
                <span className="min-w-0 flex-1 truncate text-[var(--text-muted)]">{h.message}</span>
                <span className="shrink-0 text-[var(--text-muted)]">{timeAgo(h.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      </GlassCard>
    </div>
  );
}
