# Reel — Chrome Extension

Your universal entertainment tracker: movies, series, anime, manga and manhwa in one place. This extension is the browser shell around the shared `/core` library.

## Build

```bash
cd extension
npm install
npm run build
```

Output lands in `extension/dist/`. Icons are generated placeholders — regenerate any time with `node scripts/generate-icons.js`, or drop your own `icon16.png`, `icon32.png`, `icon48.png`, `icon128.png` into `extension/icons/` and rebuild.

## Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer Mode** (top right)
3. Click **Load Unpacked**
4. Select the `extension/dist/` folder

## Set your TMDB API key

1. Get a free key at [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api)
2. Click the Reel toolbar icon → profile button (top right of the popup)
3. Paste the key into **TMDB API Key** and hit **Save Settings**

Movie/series search and streaming-provider lookups need this key. Anime and manga search (AniList/MangaDex) work without it.

## Test the tracker

1. Browse to Netflix or CinemaOS and play a video for ~15 seconds
2. Open the Reel popup → **Home** tab
3. The title appears under **Continue Watching** with live progress (the title must be in your list, or auto-track will match it by name)

Progress saves every 10 seconds while a video plays; crossing 92% marks the episode watched automatically. On MangaDex/Webtoon, scrolling to the bottom of a chapter marks it read.

## Layout

- `background/` — MV3 service worker: message router, hourly episode/chapter checks, 15-min Supabase sync
- `content-scripts/` — per-site trackers (Netflix, Disney+, CinemaOS, Crunchyroll, MangaDex, Webtoon) plus a universal fallback (videos over 5 minutes only)
- `popup/` — 420×580 dashboard: Home / Search / List
- `sidepanel/` — full library manager with poster grid and where-to-watch
- `pages/profile.html` — stats, ratings, settings, JSON import/export
