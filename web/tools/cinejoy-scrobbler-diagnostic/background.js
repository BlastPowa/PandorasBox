const SOURCE = "pbox-cinejoy-scrobbler";
const PENDING_KEY = "pboxCinejoyPending";
const ORIGIN_KEY = "pboxCinejoyOrigin";
const FLUSH_ALARM = "pboxCinejoyFlush";
const MAX_PENDING = 100;
const MAX_EVENTS = 500;
const pboxTabs = new Map();
const cinejoyContexts = new Map();
const lastForwarded = new Map();
let flushPromise = null;

function parseCinejoyUrl(rawUrl) {
  if (!rawUrl) return null;
  try {
    const url = new URL(rawUrl);
    if (!/(^|\.)cinejoy\.to$/i.test(url.hostname)) return null;
    let match = url.pathname.match(/^\/watch\/tv\/(\d+)\/(\d+)\/(\d+)(?:\/|$)/i);
    if (match) return { mediaType: "series", tmdbId: Number(match[1]), season: Number(match[2]), episode: Number(match[3]), pageUrl: rawUrl };
    match = url.pathname.match(/^\/watch\/movie\/(\d+)(?:\/|$)/i);
    if (match) return { mediaType: "movie", tmdbId: Number(match[1]), season: null, episode: null, pageUrl: rawUrl };
    match = url.pathname.match(/^\/movie\/(\d+)(?:-|\/|$)/i);
    if (match) return { mediaType: "movie", tmdbId: Number(match[1]), season: null, episode: null, pageUrl: rawUrl };
    match = url.pathname.match(/^\/series\/(\d+)(?:-|\/|$)/i);
    if (match) return { mediaType: "series", tmdbId: Number(match[1]), season: null, episode: null, pageUrl: rawUrl };
  } catch {}
  return null;
}

function eventKey(event) {
  return `${event.tmdbId}:${event.mediaType}:${event.season ?? 0}:${event.episode ?? 0}`;
}

function shouldForward(event) {
  if (["ended", "pause", "seeked"].includes(event.event) || event.completed) return true;
  if (event.event !== "progress" && event.event !== "play") return false;
  const key = eventKey(event);
  const now = Date.now();
  const last = lastForwarded.get(key) ?? 0;
  if (now - last < 30000) return false;
  lastForwarded.set(key, now);
  return true;
}

async function rememberDiagnostic(event) {
  const { cinejoyPlaybackEvents = [] } = await chrome.storage.local.get({ cinejoyPlaybackEvents: [] });
  await chrome.storage.local.set({ cinejoyPlaybackEvents: [...cinejoyPlaybackEvents, event].slice(-MAX_EVENTS) });
}

async function savePending(event) {
  const { [PENDING_KEY]: pending = [] } = await chrome.storage.local.get({ [PENDING_KEY]: [] });
  const key = eventKey(event);
  const existing = pending.find((item) => eventKey(item) === key);
  if (existing?.completed && !event.completed) return;
  const next = pending.filter((item) => eventKey(item) !== key);
  next.push(event);
  await chrome.storage.local.set({ [PENDING_KEY]: next.slice(-MAX_PENDING) });
}

async function candidatePboxTabs() {
  const knownTabs = [...pboxTabs.entries()].map(([tabId, origin]) => ({ tabId, origin }));
  if (knownTabs.length) return knownTabs;

  const stored = await chrome.storage.local.get({ [ORIGIN_KEY]: "http://localhost:3000" });
  const origin = stored[ORIGIN_KEY];
  if (!origin) return [];
  try {
    const matches = await chrome.tabs.query({ url: `${origin.replace(/\/$/, "")}/*` });
    for (const tab of matches) {
      if (tab.id != null) pboxTabs.set(tab.id, origin);
    }
    return matches.filter((tab) => tab.id != null).map((tab) => ({ tabId: tab.id, origin }));
  } catch {
    return [];
  }
}

async function sendToPbox(event) {
  const candidates = await candidatePboxTabs();
  for (const { tabId, origin } of candidates) {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId, frameIds: [0] },
        world: "MAIN",
        args: [event],
        func: async (payload) => {
          try {
            const response = await fetch("/api/cinejoy/scrobble", {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            let body = null;
            try { body = await response.json(); } catch {}
            return { ok: response.ok, status: response.status, body };
          } catch (error) {
            return { ok: false, status: 0, error: String(error) };
          }
        },
      });
      const result = results?.[0]?.result;
      if (result?.ok) {
        console.log("[PBox Cinejoy Sync] synced", eventKey(event), result.body);
        return true;
      }
      if (result?.status === 401) console.warn("[PBox Cinejoy Sync] PBox is open but signed out; queued for later.");
      else console.warn("[PBox Cinejoy Sync] delivery failed", origin, result);
    } catch (error) {
      pboxTabs.delete(tabId);
      console.warn("[PBox Cinejoy Sync] tab delivery failed", error);
    }
  }
  return false;
}

async function deliverOrQueue(event) {
  if (await sendToPbox(event)) return true;
  await savePending(event);
  return false;
}

async function flushPending() {
  if (flushPromise) return flushPromise;
  flushPromise = (async () => {
    const { [PENDING_KEY]: pending = [] } = await chrome.storage.local.get({ [PENDING_KEY]: [] });
    const remaining = [];
    for (const event of pending) {
      if (!(await sendToPbox(event))) remaining.push(event);
    }
    await chrome.storage.local.set({ [PENDING_KEY]: remaining });
  })().finally(() => { flushPromise = null; });
  return flushPromise;
}

async function handlePlayback(message, sender) {
  const tabId = sender.tab?.id;
  const tabUrl = sender.tab?.url ?? null;
  const directContext = parseCinejoyUrl(tabUrl);
  if (tabId == null || !directContext) return;

  const tabContext = cinejoyContexts.get(tabId) ?? directContext;
  const event = {
    ...message,
    ...directContext,
    ...tabContext,
    source: "cinejoy",
    frameUrl: message.frameUrl ?? null,
    currentTime: message.currentTime ?? 0,
    duration: message.duration ?? null,
    percent: message.percent ?? null,
    completed: Boolean(message.completed),
    title: tabContext.title ?? sender.tab?.title ?? message.frameTitle ?? null,
    recordedAt: new Date().toISOString(),
  };

  if (!event.tmdbId || !event.mediaType) return;
  await rememberDiagnostic(event);
  if (shouldForward(event)) await deliverOrQueue(event);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.source !== SOURCE) return;

  const run = async () => {
    const tabId = sender.tab?.id;
    if (message.type === "tab-role") {
      return { ok: true, cinejoy: Boolean(parseCinejoyUrl(sender.tab?.url ?? null)) };
    }

    if (message.type === "pbox-register" && tabId != null) {
      pboxTabs.set(tabId, message.origin);
      await chrome.storage.local.set({ [ORIGIN_KEY]: message.origin });
      await flushPending();
      return { ok: true };
    }

    if (message.type === "cinejoy-context" && tabId != null) {
      cinejoyContexts.set(tabId, {
        mediaType: message.mediaType,
        tmdbId: message.tmdbId,
        season: message.season ?? null,
        episode: message.episode ?? null,
        pageUrl: message.pageUrl ?? sender.tab?.url ?? null,
        title: message.title ?? sender.tab?.title ?? null,
      });
      return { ok: true };
    }

    if (message.type === "playback") await handlePlayback(message, sender);
    return { ok: true };
  };

  void run().then((result) => sendResponse(result ?? { ok: true })).catch((error) => {
    console.error("[PBox Cinejoy Sync]", error);
    sendResponse({ ok: false, error: String(error) });
  });
  return true;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  pboxTabs.delete(tabId);
  cinejoyContexts.delete(tabId);
});

function ensureFlushAlarm() {
  chrome.alarms.create(FLUSH_ALARM, { periodInMinutes: 1 });
}

chrome.runtime.onInstalled.addListener(() => {
  ensureFlushAlarm();
  void flushPending();
});

chrome.runtime.onStartup.addListener(() => {
  ensureFlushAlarm();
  void flushPending();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === FLUSH_ALARM) void flushPending();
});

ensureFlushAlarm();
