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
6. Pin **Pandora's Box** from Chrome's Extensions menu if you want the custom toolbar icon visible all the time.

After the extension is first installed, updated, or manually reloaded from `chrome://extensions`, refresh watch tabs that were already open. Newly opened pages and later navigation are picked up automatically; you do not need to refresh before every video.

Open the toolbar popup and use the cog button for the main extension settings. Chrome's **Extension options** entry opens the full profile/import/export page.

## Tracking behaviour

- Netflix, Disney+, CinemaOS, Cinejoy (.pk/.to) and Crunchyroll use dedicated video tracking rules.
- Anime Nexus watch pages are covered by the universal tracker with Anime Nexus-specific title cleanup, episode detection and parent-page context for embedded players.
- Netflix and Crunchyroll only track their watch routes.
- Dedicated streaming integrations accept legitimate short episodes from 3 minutes upward.
- The universal fallback can follow dynamically mounted or replaced players, including embedded frames when enough page context is available. It requires a prominent long-form player and a minimum 5-minute duration.
- YouTube, X/Twitter, TikTok, Instagram, Facebook, Reddit and Twitch are excluded from universal tracking.
- Short-form, trailer, teaser, preview, advert and music-video hints are ignored by the universal tracker.
- MangaDex and Webtoon use reading-progress tracking.

Progress saves periodically while a supported video plays. Crossing the completion threshold marks watched progress automatically. The extension stores its working list in Chrome local extension storage and updates the popup **Home → Continue Watching**, the **List** tab and the side panel from the same data. The Pandora's Box website can also read that local extension list through the browser-companion bridge and surface it in **Home → Continue watching**. Those views listen for storage changes, so reopening them is enough to see current progress; the watch page itself does not need a refresh for each progress save.

## TMDB API key

Movie/series search, provider lookups and safe automatic creation of titles that are not already in the local list use a user-supplied TMDB API key. Existing local titles can still be matched before a TMDB lookup is attempted. Open the toolbar popup, click the cog, add the key and save. The production bundle does not contain a TMDB secret.

## Optional Supabase sync

Supabase sync is optional and disabled by default. If you enable it, provide an HTTPS Supabase project URL and public anon key in the popup settings. The extension syncs its `reel_lists` record using a generated per-install identity. This is extension-to-extension storage and is not the same thing as signing into the Pandora's Box website. The local browser bridge can show extension progress on the website's Home page, but it does not write that progress into the signed-in cloud library unless a separate account-linked integration is added.

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
