"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui-fx/button";

type Preferences = { messages: boolean; shares: boolean; friends: boolean; groups: boolean };
const DEFAULTS: Preferences = { messages: true, shares: true, friends: true, groups: true };

function applicationKey(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const raw = atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

async function ensureServiceWorker() {
  return (await navigator.serviceWorker.getRegistration("/")) ?? navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

export function PushNotificationControl() {
  const [supported] = useState(() => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window);
  const [configured, setConfigured] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [preferences, setPreferences] = useState(DEFAULTS);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supported) return;
    void Promise.all([
      fetch("/api/push/subscriptions", { cache: "no-store" }).then((response) => response.json()),
      ensureServiceWorker().then((registration) => registration.pushManager.getSubscription()),
    ]).then(([config, active]) => { setConfigured(Boolean(config.configured)); setPublicKey(config.publicKey ?? null); setSubscription(active); }).catch(() => undefined);
  }, [supported]);

  async function enable() {
    if (!publicKey) return;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Notification permission was not granted");
      const registration = await ensureServiceWorker();
      const active = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationKey(publicKey) });
      const json = active.toJSON();
      const response = await fetch("/api/push/subscriptions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: active.endpoint, keys: json.keys, preferences }) });
      if (!response.ok) throw new Error(((await response.json()) as { error?: string }).error ?? "Could not enable notifications");
      setSubscription(active); toast.success("Device notifications enabled");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not enable notifications"); }
    finally { setBusy(false); }
  }

  async function disable() {
    if (!subscription) return;
    setBusy(true);
    try {
      await fetch(`/api/push/subscriptions?endpoint=${encodeURIComponent(subscription.endpoint)}`, { method: "DELETE" });
      await subscription.unsubscribe(); setSubscription(null); toast.success("Device notifications disabled");
    } finally { setBusy(false); }
  }

  async function toggle(key: keyof Preferences) {
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next);
    if (subscription) await fetch("/api/push/subscriptions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: subscription.endpoint, preferences: next }) });
  }

  return <section className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--glass)] p-4" aria-labelledby="push-title">
    <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[rgb(var(--accent-rgb)/0.14)] text-[var(--accent)]">{subscription ? <Bell className="size-5" /> : <BellOff className="size-5" />}</span><div><h3 id="push-title" className="font-bold">Device notifications</h3><p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">Receive alerts on this phone or computer when PBox is installed or allowed to run in the background.</p></div></div>
    {!supported ? <p className="mt-3 text-xs text-[var(--text-muted)]">This browser does not support web push notifications.</p> : !configured ? <p className="mt-3 text-xs text-[var(--gold)]">Push delivery needs the VAPID environment keys configured on the server.</p> : <>
      <Button type="button" variant={subscription ? "outline" : "primary"} className="mt-4 w-full sm:w-auto" loading={busy} onClick={() => void (subscription ? disable() : enable())}>{subscription ? <BellOff className="size-4" /> : <Bell className="size-4" />}{subscription ? "Turn off on this device" : "Allow notifications"}</Button>
      {subscription && <div className="mt-4 grid gap-2 sm:grid-cols-2">{([ ["messages", "Messages"], ["shares", "Shared cards"], ["friends", "Friend activity"], ["groups", "Group invitations"] ] as const).map(([key, label]) => <label key={key} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl bg-[var(--bg-surface)] px-3 text-sm"><input type="checkbox" checked={preferences[key]} onChange={() => void toggle(key)} className="size-4 accent-[var(--accent)]" /><span>{label}</span></label>)}</div>}
    </>}
  </section>;
}
