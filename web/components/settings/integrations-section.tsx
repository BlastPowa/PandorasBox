"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Link2, Unlink, RefreshCw, AlertTriangle, CheckCircle2, Clock, History, GitMerge,
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

function expiringSoon(iso: string | null): boolean {
  if (!iso) return false;
  return new Date(iso).getTime() - Date.now() < 7 * 24 * 3600 * 1000;
}

/** Settings → Integrations. Every connected external account lives here. */
export function IntegrationsSection({ signedIn }: { signedIn: boolean }) {
  const [providers, setProviders] = useState<ProviderState[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(true);

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
    if (!signedIn) { setLoading(false); return; }
    void load();
    // Surface OAuth redirect results.
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    const error = params.get("integration_error");
    if (connected) toast.success(`${connected === "mal" ? "MyAnimeList" : "AniList"} connected`);
    if (error) toast.error(error);
    if (connected || error) window.history.replaceState({}, "", "/settings");
  }, [signedIn, load]);

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
      <div className="space-y-4 p-5">
        <p className="text-xs text-[var(--text-muted)]">
          Link your tracking accounts to keep your lists in sync — both ways, automatically.
        </p>

        {loading && <p className="text-sm text-[var(--text-muted)]">Loading integrations…</p>}

        {providers.map((p) => (
          <div key={p.id} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] text-sm font-bold text-white"
                style={{ backgroundColor: p.color }}
              >
                {p.id === "mal" ? "MAL" : "AL"}
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
                      <p className="font-semibold">Keep {c.provider === "mal" ? "MyAnimeList" : "AniList"}</p>
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
