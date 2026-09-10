(() => {
  'use strict';

  if (window.__cinejoyInspector?.stop) {
    console.warn('[Cinejoy Inspector] already running. Use __cinejoyInspector.stop() before reinstalling.');
    return;
  }

  const PREFIX = '[Cinejoy Inspector]';
  const state = {
    startedAt: new Date().toISOString(),
    page: null,
    videos: [],
    iframes: [],
    requests: [],
    messages: [],
    resources: [],
    storageWrites: [],
    events: [],
  };
  const cleanups = [];
  const videoIds = new WeakMap();
  let nextVideoId = 1;

  const log = (...args) => console.log(PREFIX, ...args);
  const warn = (...args) => console.warn(PREFIX, ...args);

  function parsePage() {
    const match = location.pathname.match(/^\/(movie|series)\/(\d+)(?:-|\/|$)/i);
    const mediaType = match?.[1]?.toLowerCase() ?? null;
    const tmdbId = match?.[2] ? Number(match[2]) : null;
    const title = document.querySelector('h1')?.textContent?.trim() || document.title.replace(/\s*-\s*Watch.*$/i, '').trim();
    return { url: location.href, mediaType, tmdbId, title };
  }

  function safeSrc(el) {
    try {
      return el.currentSrc || el.src || null;
    } catch {
      return null;
    }
  }

  function videoSnapshot(video) {
    const duration = Number.isFinite(video.duration) ? video.duration : null;
    const currentTime = Number.isFinite(video.currentTime) ? video.currentTime : 0;
    const percent = duration && duration > 0 ? Math.round((currentTime / duration) * 1000) / 10 : null;
    return {
      id: videoIds.get(video) ?? null,
      src: safeSrc(video),
      currentTime,
      duration,
      percent,
      paused: video.paused,
      ended: video.ended,
      readyState: video.readyState,
    };
  }

  function recordEvent(type, detail) {
    state.events.push({ at: new Date().toISOString(), type, ...detail });
    if (state.events.length > 500) state.events.shift();
  }

  function watchVideo(video) {
    if (videoIds.has(video)) return;
    const id = nextVideoId++;
    videoIds.set(video, id);

    const report = (eventName, loud = true) => {
      const snapshot = videoSnapshot(video);
      const entry = { event: eventName, ...snapshot };
      const i = state.videos.findIndex((v) => v.id === id);
      if (i >= 0) state.videos[i] = entry;
      else state.videos.push(entry);
      recordEvent(`video:${eventName}`, entry);
      if (loud) log(`video #${id} ${eventName}`, entry);
    };

    const events = ['loadedmetadata', 'durationchange', 'play', 'pause', 'ended', 'ratechange', 'seeking', 'seeked'];
    for (const name of events) {
      const handler = () => report(name);
      video.addEventListener(name, handler, true);
      cleanups.push(() => video.removeEventListener(name, handler, true));
    }

    let lastBucket = -1;
    const onTime = () => {
      const snap = videoSnapshot(video);
      const bucket = snap.percent == null ? Math.floor(snap.currentTime / 30) : Math.floor(snap.percent / 5);
      if (bucket !== lastBucket) {
        lastBucket = bucket;
        report('progress', true);
      }
    };
    video.addEventListener('timeupdate', onTime, true);
    cleanups.push(() => video.removeEventListener('timeupdate', onTime, true));
    report('found');
  }

  function scanDocument(doc, label = 'top') {
    try {
      doc.querySelectorAll('video').forEach((video) => {
        watchVideo(video);
        const snap = videoSnapshot(video);
        recordEvent('video:frame', { frame: label, id: snap.id, src: snap.src });
      });
    } catch (error) {
      recordEvent('frame:scan-error', { frame: label, error: String(error) });
    }
  }

  function inspectIframes() {
    state.iframes = [...document.querySelectorAll('iframe')].map((frame, index) => {
      let accessible = false;
      let frameUrl = frame.src || null;
      try {
        accessible = Boolean(frame.contentDocument);
        if (accessible) frameUrl = frame.contentWindow?.location?.href || frameUrl;
      } catch {
        accessible = false;
      }
      if (accessible && frame.contentDocument) scanDocument(frame.contentDocument, `iframe:${index}`);
      let origin = null;
      try { origin = frameUrl ? new URL(frameUrl, location.href).origin : null; } catch {}
      return { index, src: frameUrl, origin, accessible };
    });
    if (state.iframes.length) log('iframes', state.iframes);
  }

  function scan() {
    state.page = parsePage();
    scanDocument(document, 'top');
    inspectIframes();
    log('page', state.page);
  }

  const observer = new MutationObserver(() => {
    scanDocument(document, 'top');
    inspectIframes();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  cleanups.push(() => observer.disconnect());

  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const input = args[0];
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input?.url;
    const method = args[1]?.method || (input instanceof Request ? input.method : 'GET');
    const started = performance.now();
    try {
      const response = await originalFetch.apply(this, args);
      const item = { at: new Date().toISOString(), kind: 'fetch', method, url, status: response.status, ms: Math.round(performance.now() - started) };
      state.requests.push(item);
      if (/watch|progress|history|episode|movie|series|list|api|tmdb/i.test(String(url))) log('network', item);
      return response;
    } catch (error) {
      const item = { at: new Date().toISOString(), kind: 'fetch', method, url, error: String(error) };
      state.requests.push(item);
      warn('network error', item);
      throw error;
    }
  };
  cleanups.push(() => { window.fetch = originalFetch; });

  const xhrOpen = XMLHttpRequest.prototype.open;
  const xhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__cinejoyInspectorMeta = { method, url: String(url) };
    return xhrOpen.call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.send = function (...args) {
    const meta = this.__cinejoyInspectorMeta || { method: 'GET', url: '' };
    const onDone = () => {
      const item = { at: new Date().toISOString(), kind: 'xhr', method: meta.method, url: meta.url, status: this.status };
      state.requests.push(item);
      if (/watch|progress|history|episode|movie|series|list|api|tmdb/i.test(meta.url)) log('network', item);
    };
    this.addEventListener('loadend', onDone, { once: true });
    return xhrSend.apply(this, args);
  };
  cleanups.push(() => {
    XMLHttpRequest.prototype.open = xhrOpen;
    XMLHttpRequest.prototype.send = xhrSend;
  });

  const originalBeacon = navigator.sendBeacon?.bind(navigator);
  if (originalBeacon) {
    navigator.sendBeacon = function (url, data) {
      const item = { at: new Date().toISOString(), kind: 'beacon', method: 'POST', url: String(url) };
      state.requests.push(item);
      log('beacon', item, data);
      return originalBeacon(url, data);
    };
    cleanups.push(() => { navigator.sendBeacon = originalBeacon; });
  }

  const storageSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function (key, value) {
    const item = { at: new Date().toISOString(), area: this === localStorage ? 'localStorage' : this === sessionStorage ? 'sessionStorage' : 'storage', key, value };
    state.storageWrites.push(item);
    if (/watch|progress|history|episode|movie|series|list|tmdb|player/i.test(String(key) + String(value))) log('storage write', item);
    return storageSetItem.call(this, key, value);
  };
  cleanups.push(() => { Storage.prototype.setItem = storageSetItem; });

  const onMessage = (event) => {
    let data = event.data;
    try {
      if (typeof data === 'object' && data !== null) data = JSON.parse(JSON.stringify(data));
    } catch {
      data = String(data);
    }
    const item = {
      at: new Date().toISOString(),
      origin: event.origin || null,
      data,
    };
    state.messages.push(item);
    if (state.messages.length > 300) state.messages.shift();
    const text = typeof data === 'string' ? data : JSON.stringify(data);
    if (/play|pause|progress|time|ended|episode|movie|series|tmdb|media/i.test(text)) log('postMessage', item);
  };
  window.addEventListener('message', onMessage, true);
  cleanups.push(() => window.removeEventListener('message', onMessage, true));

  const historyPush = history.pushState;
  const historyReplace = history.replaceState;
  const onRoute = () => setTimeout(scan, 0);
  history.pushState = function (...args) { const out = historyPush.apply(this, args); onRoute(); return out; };
  history.replaceState = function (...args) { const out = historyReplace.apply(this, args); onRoute(); return out; };
  window.addEventListener('popstate', onRoute);
  cleanups.push(() => {
    history.pushState = historyPush;
    history.replaceState = historyReplace;
    window.removeEventListener('popstate', onRoute);
  });

  function dumpStorage() {
    const read = (storage) => Object.fromEntries(Array.from({ length: storage.length }, (_, i) => {
      const key = storage.key(i);
      return [key, key == null ? null : storage.getItem(key)];
    }));
    const snapshot = { localStorage: read(localStorage), sessionStorage: read(sessionStorage) };
    log('storage snapshot', snapshot);
    return snapshot;
  }

  function dumpResources() {
    const interesting = performance.getEntriesByType('resource')
      .map((entry) => ({
        name: entry.name,
        initiatorType: entry.initiatorType,
        duration: Math.round(entry.duration),
      }))
      .filter((entry) => /\.m3u8|\.mpd|\.mp4|\.m4s|\.ts(?:\?|$)|embed|player|stream|watch|episode|movie|series|api|tmdb/i.test(entry.name))
      .slice(-200);
    state.resources = interesting;
    if (interesting.length) console.table(interesting);
    return interesting;
  }

  function frameHelp() {
    inspectIframes();
    const blocked = state.iframes.filter((frame) => !frame.accessible);
    if (!blocked.length) {
      log('No cross-origin iframe is currently blocking access.');
      return blocked;
    }
    warn('Cross-origin player frame(s) detected. Top-page JavaScript cannot inspect their <video> element directly.', blocked);
    warn('In Chrome DevTools Console, use the execution-context dropdown to select the player frame, then paste this same inspector there. For automatic tracking across every frame, use the all-frames Chrome diagnostic extension in tools/cinejoy-scrobbler-diagnostic.');
    return blocked;
  }

  function report() {
    scan();
    const result = {
      ...state,
      storage: dumpStorage(),
      videos: [...document.querySelectorAll('video')].map(videoSnapshot),
      resources: dumpResources(),
    };
    console.table(result.videos);
    console.table(result.iframes);
    console.table(result.requests.slice(-50));
    console.table(result.messages.slice(-50));
    return result;
  }

  function stop() {
    while (cleanups.length) {
      try { cleanups.pop()(); } catch {}
    }
    delete window.__cinejoyInspector;
    log('stopped');
  }

  window.__cinejoyInspector = { state, scan, report, dumpStorage, dumpResources, frameHelp, stop };
  scan();
  log('installed. Start playback, seek, pause, finish an episode/movie, then run __cinejoyInspector.report(). If no video appears, run __cinejoyInspector.frameHelp().');
})();
