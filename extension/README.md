# Pandora's Box — Browser Companion

Pandora's Box is a universal entertainment tracker for movies, series, anime, manga and manhwa. The browser companion adds local progress tracking, a quick popup, a side-panel library and optional sync without turning Pandora's Box into a streaming player.

## Build

```bash
cd extension
npm install
npm run build
```

Production output lands in `extension/dist/`. Production source maps are disabled.

## Install in Chrome / Chromium

1. Build the extension, or download the current release ZIP from **Pandora's Box → Settings → Integrations**.
2. Extract the ZIP if you downloaded it.
3. Open `chrome://extensions`.
4. Enable **Developer mode**.
5. Click **Load unpacked** and select `extension/dist/` or the extracted release folder.

## Tracking behaviour

- Netflix, Disney+, CinemaOS and Crunchyroll use dedicated video tracking rules.
- Netflix and Crunchyroll only track their watch routes.
- Dedicated streaming integrations accept legitimate short episodes from 3 minutes upward.
- The universal fallback requires a prominent long-form player and a minimum 5-minute duration.
- YouTube, X/Twitter, TikTok, Instagram, Facebook, Reddit and Twitch are excluded from universal tracking.
- Short-form, trailer, teaser, preview, advert and music-video hints are ignored by the universal tracker.
- MangaDex and Webtoon use reading-progress tracking.

Progress saves periodically while a supported video plays. Crossing the completion threshold marks watched progress automatically.

## TMDB API key

Movie/series search and provider lookups use a user-supplied TMDB API key. Open the Pandora's Box extension profile, add the key under settings and save. The production bundle does not contain a TMDB secret.

## Security notes

- Manifest V3 service worker.
- Production source maps disabled.
- Runtime messages validated before handling.
- Sync settings sanitized and Supabase connection values validated.
- Per-install sync identity.
- Remote list data validated before replacing local progress.
- No Netflix, Disney+, Crunchyroll or CinemaOS password is requested or stored.

Internal `reel_*` storage keys and shared `Reel*` TypeScript types are intentionally retained for backward compatibility with existing installs.

## Layout

- `background/` — service worker, notifications and sync scheduling.
- `content-scripts/` — dedicated streaming/reading trackers plus the universal long-form fallback.
- `popup/` — quick dashboard.
- `sidepanel/` — larger library manager.
- `pages/profile.html` — stats, ratings, settings and import/export.
