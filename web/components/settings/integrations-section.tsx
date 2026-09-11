"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  Link2, Unlink, RefreshCw, AlertTriangle, CheckCircle2, Clock, History, GitMerge,
  Download, Copy, ExternalLink, Film, Tv, ShieldCheck, MonitorPlay,
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

const MIN_CINEJOY_LIBRARY_SYNC_VERSION = "1.1.0";
const MIN_WATCH_SYNC_VERSION = "1.2.1";
const WATCH_SYNC_RELEASE_URL = "https://github.com/BlastPowa/PandorasBox-Cinejoy-Extension/releases/latest/download/pbox-watch-sync.zip";
const WATCH_SYNC_RELEASE_API = "https://api.github.com/repos/BlastPowa/PandorasBox-Cinejoy-Extension/releases/latest";

function versionAtLeast(current: string | null, minimum: string): boolean {
  if (!current) return false;
  const currentParts = current.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const minimumParts = minimum.split(".").map((part) => Number.parseInt(part, 10) || 0);
  for (let index = 0; index < Math.max(currentParts.length, minimumParts.length); index += 1) {
    const currentPart = currentParts[index] ?? 0;
    const minimumPart = minimumParts[index] ?? 0;
    if (currentPart > minimumPart) return true;
    if (currentPart < minimumPart) return false;
  }
  return true;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function expiringSoon(iso: string | null): boolean {
  if (!iso) return false;
  return new Date(iso).getTime() - Date.now() < 7 * 24 * 3600 * 1000;
}

function providerLabel(id: string): string {
  if (id === "mal") return "MyAnimeList";
  if (id === "anilist") return "AniList";
  if (id === "trakt") return "Trakt";
  return id;
}

function providerBadge(id: string): string {
  if (id === "mal") return "MAL";
  if (id === "anilist") return "AL";
  if (id === "trakt") return "TRAKT";
  return id.slice(0, 5).toUpperCase();
}

/** Settings → Integrations. Every connected external account lives here. */
export function IntegrationsSection({ signedIn }: { signedIn: boolean }) {
  const [providers, setProviders] = useState<ProviderState[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(signedIn);
  const [cinejoyExtensionInstalled, setCinejoyExtensionInstalled] = useState(false);
  const [cinejoyExtensionVersion, setCinejoyExtensionVersion] = useState<string | null>(null);
  const [latestExtensionVersion, setLatestExtensionVersion] = useState<string | null>(null);
  const [cinejoyLibrarySyncing, setCinejoyLibrarySyncing] = useState(false);
  const cinejoyListSyncSupported = cinejoyExtensionInstalled
    && versionAtLeast(cinejoyExtensionVersion, MIN_CINEJOY_LIBRARY_SYNC_VERSION);
  const watchSyncSupported = cinejoyExtensionInstalled
    && versionAtLeast(cinejoyExtensionVersion, MIN_WATCH_SYNC_VERSION);
  const extensionUpdateAvailable = cinejoyExtensionInstalled
    && latestExtensionVersion != null
    && !versionAtLeast(cinejoyExtensionVersion, latestExtensionVersion);

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
    if (connected || error) window.history.replaceState({}, "", "/settings");
  }, [signedIn, load]);

  useEffect(() => {
    function detectExtension() {
      setCinejoyExtensionInstalled(
        document.documentElement.getAttribute("data-pbox-watch-sync-extension") === "1"
        || document.documentElement.getAttribute("data-pbox-cinejoy-extension") === "1"
      );
      setCinejoyExtensionVersion(
        document.documentElement.getAttribute("data-pbox-watch-sync-extension-version")
        || document.documentElement.getAttribute("data-pbox-cinejoy-extension-version")
      );
    }

    const frame = window.requestAnimationFrame(detectExtension);
    window.addEventListener("pbox-cinejoy-extension-ready", detectExtension);
    window.addEventListener("pbox-watch-sync-extension-ready", detectExtension);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pbox-cinejoy-extension-ready", detectExtension);
      window.removeEventListener("pbox-watch-sync-extension-ready", detectExtension);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch(WATCH_SYNC_RELEASE_API, { headers: { Accept: "application/vnd.github+json" } })
      .then(async (response) => response.ok ? response.json() as Promise<{ tag_name?: string }> : null)
      .then((release) => {
        if (cancelled) return;
        const version = release?.tag_name?.replace(/^v/i, "").trim();
        if (version) setLatestExtensionVersion(version);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    function handleLibrarySyncResult(event: Event) {
      const detail = (event as CustomEvent<{
        ok?: boolean;
        added?: number;
        alreadyPresent?: number;
        failed?: number;
        error?: string;
      }>).detail;
      setCinejoyLibrarySyncing(false);
      if (!detail?.ok) {
        const suffix = detail?.failed ? ` (${detail.failed} title${detail.failed === 1 ? "" : "s"} failed)` : "";
        toast.error(`${detail?.error ?? "Cinejoy list sync did not finish"}${suffix}`);
        return;
      }
      toast.success(`Cinejoy list synced: ${detail.added ?? 0} added, ${detail.alreadyPresent ?? 0} already there`);
    }

    window.addEventListener("pbox-cinejoy-library-sync-result", handleLibrarySyncResult);
    return () => window.removeEventListener("pbox-cinejoy-library-sync-result", handleLibrarySyncResult);
  }, []);

  function syncPboxListToCinejoy() {
    if (!cinejoyListSyncSupported) {
      toast.error(cinejoyExtensionInstalled
        ? "Update and reload the Cinejoy extension first."
        : "Install or reload the Cinejoy extension first.");
      return;
    }
    setCinejoyLibrarySyncing(true);
    window.dispatchEvent(new CustomEvent("pbox-cinejoy-sync-library"));
  }

  async function copyExtensionPage() {
    try {
      await navigator.clipboard.writeText("chrome://extensions");
      toast.success("Copied chrome://extensions — paste it into your address bar");
    } catch {
      toast.error("Could not copy automatically. Open chrome://extensions in your browser.");
    }
  }

  async function disconnect(id: string, name: string) {
    if (!window.confirm(`Disconnect ${name}? Sync history and queued updates for it will be removed.`)) return;
    await fetch(`/api/integrations?provider=${id}`, { method: "DELETE" });
    toast.success(`${name} disconnected`);
    void load();
  }

  async function toggleAutoSync(id: string, autoSync: boolean) {
    setProviders((p) => p.map((x) => (x.id === id ? { ...x, autoSync } : x)));
    await fetch("/api/integrations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: id, autoSync }),
    });
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

  if (!signedIn) {
    return (
      <GlassCard macDots title="Integrations">
        <p className="p-5 text-sm text-[var(--text-muted)]">Sign in to connect external accounts.</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard macDots title="Integrations">
      <div className="space-y-5 p-4 sm:p-5">
        <div>
          <p className="text-sm font-semibold">Connected services</p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
            Keep watch progress and lists updated across PBox and the services you use.
          </p>
        </div>

        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[rgb(var(--accent-rgb)/0.22)] bg-[linear-gradient(145deg,rgb(var(--accent-rgb)/0.08),var(--bg-surface)_42%)]">
          <div className="p-4 sm:p-5">
            <div className="flex items-start gap-3 sm:gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-[rgb(var(--accent-rgb)/0.25)] bg-[rgb(var(--accent-rgb)/0.12)] text-[var(--accent)] shadow-sm">
                <MonitorPlay className="size-6" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">PBox Watch Sync</p>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">Browser extension · multi-site watch tracking</p>
                  </div>
                  {extensionUpdateAvailable ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[11px] text-amber-300">
                      <AlertTriangle className="size-3" /> Update available · v{latestExtensionVersion}
                    </span>
                  ) : watchSyncSupported ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[11px] text-emerald-300">
                      <CheckCircle2 className="size-3" /> Active{cinejoyExtensionVersion ? ` · v${cinejoyExtensionVersion}` : ""}
                    </span>
                  ) : cinejoyExtensionInstalled ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[11px] text-amber-300">
                      <AlertTriangle className="size-3" /> Update required{cinejoyExtensionVersion ? ` · v${cinejoyExtensionVersion}` : ""}
                    </span>
                  ) : (
                    <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]">
                      Extension not detected
                    </span>
                  )}
                </div>
                <p className="mt-2 max-w-2xl text-xs leading-relaxed text-[var(--text-secondary)]">
                  Tracks long-form movie and episode playback on Cinejoy, CinemaOS, Netflix, Prime Video and compatible HTML5 players. PBox records the live percentage, resumes progress, and marks movies or episodes complete at the finish threshold.
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-[11px] text-[var(--text-muted)] sm:max-w-md">
              <span className="inline-flex items-center gap-1.5"><Film className="size-3.5 text-[var(--accent)]" /> Movies</span>
              <span className="inline-flex items-center gap-1.5"><Tv className="size-3.5 text-[var(--accent)]" /> Episodes</span>
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-[var(--accent)]" /> No Trakt VIP</span>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button asChild size="sm" className="w-full sm:w-auto">
                <a href={WATCH_SYNC_RELEASE_URL} target="_blank" rel="noreferrer">
                  <Download className="size-4" /> Download latest ZIP
                </a>
              </Button>
              <Button size="sm" variant="glass" className="w-full sm:w-auto" onClick={() => void copyExtensionPage()}>
                <Copy className="size-4" /> Copy Chrome setup page
              </Button>
            </div>

            <div className="mt-5 rounded-[var(--radius-md)] border border-[var(--border)] bg-black/10 p-3.5">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-black">
                  <Image src="/integrations/cinejoy.png" alt="Cinejoy" width={40} height={40} className="size-full object-cover" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">Cinejoy list bridge</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-muted)]">
                    Cinejoy also supports one-way library import from PBox because its URLs expose exact TMDB IDs. Netflix, Prime Video and other sites only send playback progress back to PBox.
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button
                  size="sm"
                  variant="glass"
                  className="w-full sm:w-auto"
                  loading={cinejoyLibrarySyncing}
                  disabled={!cinejoyListSyncSupported}
                  onClick={syncPboxListToCinejoy}
                >
                  <RefreshCw className="size-4" /> Sync PBox list to Cinejoy
                </Button>
                <Button asChild size="sm" variant="glass" className="w-full sm:w-auto">
                  <a href="https://cinejoy.to/" target="_blank" rel="noreferrer">
                    <ExternalLink className="size-4" /> Open Cinejoy
                  </a>
                </Button>
              </div>
            </div>
          </div>

          <div className="border-t border-[var(--border)] bg-black/10 p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Quick setup FAQ</p>
              <a href="/faq" className="text-xs font-medium text-[var(--accent)] hover:underline">Full FAQ</a>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <details className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2.5 text-xs">
                <summary className="cursor-pointer font-medium">How do I install it?</summary>
                <p className="mt-2 text-[var(--text-muted)]">
                  Download the latest ZIP, extract it, open chrome://extensions, enable Developer mode, choose Load unpacked, then select the extracted folder containing manifest.json.
                </p>
              </details>
              <details className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2.5 text-xs">
                <summary className="cursor-pointer font-medium">How do updates work?</summary>
                <p className="mt-2 text-[var(--text-muted)]">
                  Settings checks the newest GitHub release automatically. When an update is shown, download the latest ZIP, replace the files in your existing extension folder, then click Reload on its chrome://extensions card.
                </p>
              </details>
              <details className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2.5 text-xs">
                <summary className="cursor-pointer font-medium">Which players can it track?</summary>
                <p className="mt-2 text-[var(--text-muted)]">
                  Cinejoy, CinemaOS, Netflix and Prime Video have targeted detection. The extension also watches compatible long-form HTML5 video players on other sites and only updates PBox when the title can be matched confidently.
                </p>
              </details>
              <details className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2.5 text-xs">
                <summary className="cursor-pointer font-medium">Do I link my Netflix or Prime account?</summary>
                <p className="mt-2 text-[var(--text-muted)]">
                  No. Keep PBox signed in in the same browser and watch normally. The extension reads the current player state in the browser; it does not need your streaming-service password or Trakt VIP.
                </p>
              </details>
              <details className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2.5 text-xs md:col-span-2">
                <summary className="cursor-pointer font-medium">What is special about Cinejoy?</summary>
                <p className="mt-2 text-[var(--text-muted)]">
                  Cinejoy exposes TMDB IDs, so PBox can identify titles exactly and can also copy your PBox movie/show list into a Cinejoy list. Other supported sites use conservative title and episode matching for playback updates only.
                </p>
              </details>
            </div>
          </div>
        </div>

        {loading && <p className="text-sm text-[var(--text-muted)]">Loading integrations…</p>}

        <div className="grid gap-3 md:grid-cols-2">
        {providers.filter((p) => p.id !== "trakt" || p.configured || p.connected).map((p) => (
          <div key={p.id} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] text-sm font-bold text-white"
                style={{ backgroundColor: p.color }}
              >
                {providerBadge(p.id)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {p.name}
                  {p.connected && p.username && (
                    <span className="ml-2 text-xs font-normal text-[var(--text-muted)]">as {p.username}</span>
                  )}
                </p>
                <p className="truncate text-xs text-[var(--text-muted)]">{p.description}</p>
              </div>
              {p.connected ? (
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="glass" loading={syncing === p.id} onClick={() => void syncNow(p.id, p.name)}>
                    <RefreshCw className="size-4" /> Sync now
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => void disconnect(p.id, p.name)}>
                    <Unlink className="size-4" /> Disconnect
                  </Button>
                </div>
              ) : (
                <Button size="sm" disabled={!p.configured} onClick={() => { window.location.href = `/api/integrations/${p.id}/connect`; }}>
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
                    <button className="underline" onClick={() => { window.location.href = `/api/integrations/${p.id}/connect`; }}>
                      Reconnect
                    </button>
                  </p>
                )}
                {expiringSoon(p.tokenExpiresAt) && p.lastSyncOk !== false && (
                  <p className="text-[var(--gold)]">
                    Connection expires {timeAgo(p.tokenExpiresAt)?.replace(" ago", "")} — it will auto-refresh, or{" "}
                    <button className="underline" onClick={() => { window.location.href = `/api/integrations/${p.id}/connect`; }}>
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
  );
}
