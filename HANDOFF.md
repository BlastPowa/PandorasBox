# Pandora's Box — Handoff Reference

Universal entertainment tracker: movies, TV, K-drama, cartoons, anime, manga, manhwa, comics, and games in one place — track status/progress, discover new titles, and link out to legitimate streaming/reading platforms. This app does not host any content itself.

**Stack:** Next.js 16 (App Router, Turbopack), TypeScript (strict), Tailwind CSS v4 (CSS-based `@theme inline` config, no `tailwind.config`), Supabase (Postgres + Auth + Storage + Realtime), a shared `core/` package (`@core/...` path alias) used by the web app and an archived browser extension.

**Production:** `pandoras-box-tau.vercel.app` (confirmed via the User-Agent string sent to Comic Vine in `web/lib/comics.ts`).

**Repo root:** `C:\Users\Blast\Downloads\Reel` — web app in `web/`, shared logic in `core/`, an inactive/archived browser extension in `_archive_extension/` (kept for reference only, not built or shipped).

---

## 1. Every tab / route

Grouped exactly as `web/lib/nav.ts` defines the sidebar (`NAV_GROUPS`: Main / Personal / More). The mobile bottom nav (`BOTTOM_NAV`) is the first 4 items flagged `bottom: true` — **Home, Browse, Randomize, My Library** — plus a 5th static "More" trigger that opens a bottom sheet with the rest.

### Main
| Route | Purpose |
|---|---|
| `/` (Home) | Cinematic hero (ambient blurring backdrop) + trending/discovery poster rows + My Panel (continue/stats) + friends activity. |
| `/browse` | Cross-category discovery landing page — trending anime/manga, popular movies/series, K-drama, western animation, top rated, Marvel/DC rows, interactive streaming-provider switcher. |
| `/movies` | Movies discovery grid (genre/year/sort/provider filters, infinite scroll) via shared `DiscoverPage` component. |
| `/tv` | Same as above for TV series (`DiscoverPage` with `kind="tv"`). |
| `/anime` | Anime hub — trending/popular rows, seasonal anime picker, recently-aired episodes. |
| `/shorts` | Vertical, swipeable trailer feed (TikTok/YouTube-Shorts style) of trending movie/series/anime trailers. |
| `/randomize` | "Open the Box" — random title picker with multi-genre filters (Match Any/All). |
| `/search` | Cross-catalog search (movies, TV, anime, manga, manhwa, comics) with type filter tabs. |
| `/schedule` | Anime week schedule, movie/TV release windows, upcoming/announced titles. |

### Personal
| Route | Purpose |
|---|---|
| `/library` | The user's tracked-item list (all types), status/progress management. |
| `/collections` | User-created folders grouping titles across types/status. |
| `/rankings` | Personal ordered "Top N" lists per category (movie/series/anime/manga/manhwa/comic). |
| `/episode-ratings` | Per-episode IMDb/Rotten Tomatoes/Metacritic ratings (via OMDb) for tracked shows. |
| `/friends` | Friend search, requests, and activity feed. |
| `/stats` | Personal stats dashboard (watch time, episodes/chapters, top genres, completion). |

### More
| Route | Purpose |
|---|---|
| `/gamers` | Games discovery (IGDB) — Popular/Top Rated/New/Upcoming tabs. |
| `/comics` | Comics browser — Marvel/DC/Image/Dark Horse/IDW publisher tabs + free-text search. |
| `/sites` | Admin-curated directory of external streaming/reading sites. |
| `/settings` | Tabbed settings — Account, Appearance, Integrations, Import, Backup. |
| `/faq` | FAQ accordion + contact-admin form. |
| `/admin` | Admin-only panel (site directory, announcements, watch-links, user issues). |

### Detail / dynamic routes (not in the sidebar)
| Route | Purpose |
|---|---|
| `/title/[type]/[source]/[id]` | Main detail page for movie/series/anime/manga/manhwa — synopsis, cast, trailer, episodes, reviews, add-to-library/collection. |
| `/comic/[id]` | Comic series detail — characters, creators, recent issues, add-to-library/collection, "Read on {publisher platform}" link. |
| `/game/[id]` | Game detail — story/summary, genres, platforms, trailers, DLC, screenshots, Steam/Epic links. |
| `/person/[source]/[id]` | Actor/creator page — filmography. |
| `/profile/[username]` | Public user profile — stats, activity, shared collections. |

### Auth (`web/app/(auth)/`)
| Route | Purpose |
|---|---|
| `/login` | Sign in (accepts username or email). |
| `/signup` | Create account. |
| `/forgot-password` | Send password-reset email. |
| `/reset-password` | Set new password from reset link. |

---

## 2. External APIs / services connected

| Service | What it's for | Env var(s) | Owning file | Base URL |
|---|---|---|---|---|
| **TMDB** | Movies/TV metadata, discovery, credits, watch providers, trending, trailers | `TMDB_API_KEY` | `lib/discovery.ts`, `lib/discover.ts`, `lib/detail.ts`, `lib/person.ts`, `lib/franchises.ts`, `lib/schedule.ts`, `lib/search-server.ts`, `lib/trailers.ts`, `lib/random.ts`, `lib/imdb-ratings.ts`, `lib/availability-refresh.ts` (via `@core/api/tmdb`) | `https://api.themoviedb.org/3` |
| **AniList** | Anime/manga metadata, seasonal data, trailers | *(none — public GraphQL)* | `lib/discovery.ts`, `lib/schedule.ts`, `lib/random.ts`, `lib/trailers.ts`, `core/api/anilist.ts` | `https://graphql.anilist.co` |
| **MangaDex** | Manga metadata, covers, chapters | *(none — public API)* | `core/api/mangadex.ts`, `lib/search-server.ts` | MangaDex public API |
| **Jikan (MAL public API)** | Anime episode detail | *(none — public API)* | `core/api/jikan.ts`, `app/api/anime-episode/route.ts` | Jikan public API |
| **IGDB** | Games metadata, covers, trailers, DLC | `IGDB_CLIENT_ID`, `IGDB_CLIENT_SECRET` | `lib/igdb.ts` | Twitch OAuth `https://id.twitch.tv/oauth2/token` → `https://api.igdb.com/v4`; images `https://images.igdb.com/igdb/image/upload/...` |
| **Comic Vine** | Comics metadata (volumes/issues/characters/creators), covers | `COMICVINE_API_KEY` | `lib/comics.ts` | `https://comicvine.gamespot.com/api` (custom User-Agent required) |
| **OMDb** | IMDb/RT/Metacritic ratings, season/episode data | `OMDB_API_KEY` | `lib/detail.ts`, `lib/imdb-ratings.ts` | `https://www.omdbapi.com` |
| **AniList OAuth** | Account-linking integration (push/pull sync) | `ANILIST_CLIENT_ID`, `ANILIST_CLIENT_SECRET` | `lib/integrations/providers.ts` | `https://anilist.co/api/v2/oauth/{authorize,token}` |
| **MyAnimeList OAuth** | Account-linking integration (push/pull sync) | `MAL_CLIENT_ID`, `MAL_CLIENT_SECRET` | `lib/integrations/providers.ts` | `https://myanimelist.net/v1/oauth2/{authorize,token}` |
| **Google Gemini** | "Memory Search" — guesses titles from a vague natural-language description | `GEMINI_API_KEY` | `lib/memory-search/gemini.ts` | `https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent` |
| **Resend** | Sends "contact admin" support emails | `RESEND_API_KEY`, `CONTACT_EMAIL` (destination address, not an API call) | `lib/contact.ts` | `https://api.resend.com/emails` |
| **Supabase** | Auth, Postgres, Storage, Realtime — the whole backend | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (browser client); `SUPABASE_SERVICE_ROLE_KEY` (server-only, bypasses RLS — admin/cron/contact routes) | `lib/supabase/client.ts`, `lib/supabase/env.ts`, `lib/supabase/admin.ts` | Supabase project URL |
| **Vercel Cron auth** | Verifies inbound cron requests (not an external API) | `CRON_SECRET` | `app/api/cron/refresh-availability/route.ts`, `app/api/cron/sync-integrations/route.ts` | — |

**Flag for Sol:** `NEXT_PUBLIC_SITE_URL` is documented in `.env.example` (used for auth redirect URLs) but wasn't found via a literal `process.env.` grep in `.ts`/`.tsx` sources during this audit — worth confirming it's actually wired wherever an absolute site URL is needed (e.g. Supabase auth redirects, OG/share links).

---

## 3. Internal API routes (`web/app/api/*`)

| Route | Purpose |
|---|---|
| `GET /api/discover` | Powers `/movies` & `/tv` grids — genre/sort/year/provider filters, infinite scroll. |
| `GET /api/provider` | Titles available on a specific streaming provider. |
| `GET /api/games` | IGDB games list (popular/top_rated/upcoming/new). |
| `GET /api/comics` | Comic Vine publisher list or free-text search. |
| `GET /api/random` | Randomizer — any/movie/series/kdrama/anime/manga, genre Match Any/All. |
| `GET /api/search` | General cross-catalog search. |
| `GET /api/trailer` | Trailer video key for a title. |
| `GET /api/episodes` | TMDB season details. |
| `GET /api/anime-episode` | Jikan episode detail. |
| `GET /api/episode-ratings/resolve` | Resolves IMDb target for episode ratings. |
| `GET /api/episode-ratings/season` | OMDb season/episode rating data. |
| `GET/POST /api/memory-search` | Fuzzy natural-language title search (Gemini-assisted). |
| `GET /api/integrations` | Connection state for every integration provider (never exposes tokens). |
| `GET /api/integrations/conflicts` | Unresolved sync conflicts for the current user. |
| `POST /api/integrations/queue` | Enqueues a status-change push to connected auto-sync providers. |
| `GET /api/integrations/[provider]/connect` | Starts OAuth flow for a provider. |
| `GET /api/integrations/[provider]/callback` | OAuth callback — exchanges code for tokens. |
| `POST /api/integrations/[provider]/sync` | Manually triggers a two-way sync. |
| `POST /api/auth/resolve-login` | Resolves username → account email (login-with-username support). |
| `POST /api/contact` | Saves a support issue + sends notification email. |
| `POST /api/admin/refresh` | Admin-only: triggers `refreshAvailability()`. |
| `GET /api/cron/refresh-availability` | Vercel Cron: refreshes streaming availability. Protected by `CRON_SECRET`. |
| `GET /api/cron/sync-integrations` | Vercel Cron: runs integration sync for all connected accounts. Protected by `CRON_SECRET`. |

All routes are rate-limited where noted in source (typically 30–60 requests/min per IP via `lib/rate-limit.ts`).

**Caching:** `force-dynamic` on `/admin`, `/search`, `/sites`; explicit `revalidate` elsewhere — `/comics`, `/comic/[id]`, `/game/[id]`, `/person/[source]/[id]` = 86400s; `/gamers`, `/episode-ratings`, `/shorts` = 3600s; `/movies`, `/tv`, `/schedule` = 1800s; `/profile/[username]` = 0 (always fresh).

---

## 4. Data layer

### Supabase migrations (in order, `web/supabase/migrations/`)
| File | Purpose |
|---|---|
| `0001_init.sql` | Foundational schema — `profiles`, `list_items`, `collections`, `collection_items`, `watch_links`, `site_directory`, `announcements`, `availability`, RLS, `is_admin()`. |
| `0002_library.sql` | `library` table (per-user JSONB blob) + Realtime publication. |
| `0003_avatars.sql` | `avatars` Storage bucket + policies. |
| `0004_issues.sql` | `user_issues` table (contact-admin form). |
| `0005_avatars_fix.sql` | Idempotent re-run of avatars bucket/policies. |
| `0006_rankings.sql` | `user_rankings` table. |
| `0007_reviews.sql` | `reviews` table. |
| `0008_integrations_social_collections.sql` | `integrations`, `sync_queue`, `sync_log`, `sync_conflicts`, `friendships`, `activity`, `memory_search_index`, `person_cache`; collection visibility/cover columns; `collection-covers` bucket. |
| `0009_collection_item_snapshots.sql` | Metadata snapshot columns on `collection_items` (renders shares without owner access). |
| `0010_memory_search_fn.sql` | `memory_search()` Postgres function (ranked full-text search). |
| `0011_gemini_usage_limit.sql` | `api_usage_counters` table + `increment_usage_counter()` — protects shared Gemini quota. |
| `0012_rankings_comic.sql` | Adds `'comic'` to `user_rankings`'s category check constraint. |

**⚠️ Run in Supabase if not already applied:** 0008, 0009, 0010, 0011, 0012.

### Main tables
`profiles`, `library`, `list_items`, `collections`, `collection_items`, `watch_links`, `site_directory`, `announcements`, `availability`, `user_issues`, `user_rankings`, `integrations`, `sync_queue`, `sync_log`, `sync_conflicts`, `friendships`, `activity`, `memory_search_index`, `person_cache`, `reviews`, `api_usage_counters` — one line each in the migrations table above; see `0001`/`0008` for full column definitions.

### Shared `core/` package
| File | Purpose |
|---|---|
| `core/api/tmdb.ts` | TMDB client. |
| `core/api/anilist.ts` | AniList GraphQL client. |
| `core/api/jikan.ts` | Jikan client (rate-limited). |
| `core/api/mangadex.ts` | MangaDex client. |
| `core/api/watchProviders.ts` | Normalizes TMDB watch-provider data into subscription/rent/buy/free options. |
| `core/storage/schema.ts` | Canonical types — see below. |
| `core/storage/cache.ts` | Generic TTL cache over a `StorageAdapter`. |
| `core/storage/listManager.ts` | CRUD/stats engine over a user's `ReelItem[]`. |
| `core/storage/progressManager.ts` | Records watch-progress events. |
| `core/sync/supabase.ts` | Supabase-backed list sync client. |
| `core/sync/qrSync.ts` | QR-code library transfer encoding (extension-era). |
| `core/notifications/episodeChecker.ts` | Polls for new episodes on tracked series. |
| `core/notifications/chapterChecker.ts` | Polls MangaDex for new chapters. |
| `core/utils/formatters.ts` | Display formatting helpers (type/status labels, etc.). |
| `core/utils/search.ts` | Cross-source unified search aggregator (TMDB + AniList). |
| `core/utils/watchLinks.ts` | Builds deep-link URLs into third-party sites. |

### Current schema shape (`core/storage/schema.ts`)
- **`ReelItemType`**: `movie | series | anime | manga | manhwa | comic`
- **`ReelItemStatus`**: `watching | reading | completed | on_hold | dropped | planned`
- **`ReelItem` fields**: `id, source, type, title, posterUrl, backdropUrl, synopsis, status, progress, rating, genres, totalEpisodes, totalChapters, totalSeasons, year, anilistId, tmdbId, mangadexId, malId, addedAt, updatedAt, completedAt, lastWatchedSite`
- **`source`**: `tmdb | anilist | mangadex | comicvine`

---

## 5. Key runtime dependencies (`web/package.json`)

`next` 16, `react`/`react-dom` 19, `@supabase/supabase-js` + `@supabase/ssr`, `@tanstack/react-query`, `@radix-ui/react-{avatar,dialog,dropdown-menu,label,select,slot,switch,tabs,tooltip}`, `lucide-react`, `sonner` (toasts), `cmdk` (⌘K command palette), `class-variance-authority`, `clsx`, `tailwind-merge`.

---

## 6. Completed work (condensed)

- **Extension era** — an MV3 browser extension (content scripts, popup, side panel) was the original prototype; now archived/inactive in `_archive_extension/`, not built or shipped.
- **Core app build** — Next.js scaffold, design tokens, Supabase (auth/RLS/storage), app shell, Discovery (Home/Browse/Search/Detail), Library/Collections/Realtime, Rankings/Schedule/Stats/Settings, Admin panel, security hardening (CSP/HSTS/rate-limiting), trailers, command palette, MAL-style dashboard.
- **12-feature expansion** — multi-genre filters + content-safety filtering, integrations architecture (MAL/AniList OAuth sync), import wizard (XML/TXT + smart matching), person pages, Memory Search (Gemini-assisted), friends system, collections sharing (visibility/covers/snapshots), streaming-provider rows, homepage polish.
- **Comics** — expanded from 2 fixed publisher rails to a full Comics section: Marvel/DC/Image/Dark Horse/IDW tabs, free-text search, `/comic/[id]` detail pages (characters/creators/issues), and comics are now first-class trackable items (global search, Library, Collections, Rankings — migration `0012`).
- **UI/UX overhaul Phases 1–4** — multi-palette theming (site-wide, not just accent highlights), grouped/collapsible sidebar, lordflix-style ambient blurring hero + ambient ⁠background, CinemaOS-style interactive provider switcher, Shorts vertical trailer feed (responsive, blurred-poster background, YouTube JS API play/pause), tabbed Settings (Account/Appearance/Integrations/Import/Backup) + topbar profile dropdown (Profile/Library/Settings/Sign out).

---

## 7. What's next

### Phase 5 — Polish pass (in progress)
Responsive/motion/loading-consistency tightening, no new features:
1. **Shared `useReducedMotion()` hook** (new `web/lib/hooks/use-reduced-motion.ts`) — detects both the OS `prefers-reduced-motion` media query and the app's own Settings → Appearance → Reduce Motion toggle (`html.pb-reduce-motion` class), since the existing CSS guards only zero out `transition`/`animation` properties and miss two JS/native-driven motion paths:
   - `ambient-background.tsx`'s scroll-driven blur/opacity (computed via `requestAnimationFrame`, not CSS transitions).
   - `shorts-feed.tsx`'s `scrollIntoView({ behavior: "smooth" })` (native browser smooth-scroll).
2. **Loading-state fixes**: add `web/app/(app)/shorts/loading.tsx` (currently blank until data resolves); remove the redundant `Loader2` spinner in `discover-grid.tsx` (duplicates the skeleton tiles already shown during infinite-scroll pagination); add a loading skeleton to `friends-view.tsx`'s initial friend-list fetch (currently pops in with no indicator).
3. **Responsive fixes**: default the sidebar to collapsed on first visit at tablet widths (768–1024px, no saved preference yet); align Shorts feed's action-rail breakpoint (`sm:`) with its desktop up/down chevrons (`md:`) so both switch together at 768px instead of leaving a mismatched 640–768px zone.

*(Note: the back-to-top/scroll-progress indicator originally scoped for Phase 5 already exists — `web/components/shell/back-to-top.tsx` — no work needed there.)*

### Phase 8 — Profile restructure (parked, not started)
Redesign `/profile/[username]` using the **Steam profile page as the primary layout reference**: banner/backdrop area behind the avatar, level/stat cards, featured items row, activity feed, badges row. Cards and buttons styled per **uiverse.io** and the other reference sites used throughout the overhaul (lordflix, Anime Nexus, CinemaOS, daisyUI). Must remain **theme-customizable** via the existing multi-palette system (`[data-theme]` on `<html>`, RGB-channel CSS custom properties in `web/app/globals.css`) — not a one-off hardcoded look.

### Phase 9 — Component library pass (not started)
Small, self-contained UI additions layered onto existing surfaces:
- Countdown timers on Schedule (time-until-next-episode/release).
- Radial progress rings in Stats (completion %, genre breakdown).
- Site footer (logo + social links) — currently none exists.
- Tooltips on icon-only buttons across the shell.
- Infinity-style loading spinner for surfaces where a spinner reads better than the skeleton shimmer.
- Colored checkboxes (bulk-select in Library, import wizard).
- Animated/expanding search bar.
- Randomizer dice-roll / stacked-card-deck animation on "Open the Box."
- Generalized collapse-with-arrow primitive (the sidebar groups already have one bespoke version; generalize for FAQ accordions etc.).

---

## 8. Deploy checklist

- [ ] Run Supabase migrations `0008`–`0012` if not already applied.
- [ ] Vercel env vars set for every service in section 2: `TMDB_API_KEY`, `IGDB_CLIENT_ID`/`SECRET`, `COMICVINE_API_KEY`, `OMDB_API_KEY`, `ANILIST_CLIENT_ID`/`SECRET`, `MAL_CLIENT_ID`/`SECRET`, `GEMINI_API_KEY`, `RESEND_API_KEY`, `CONTACT_EMAIL`, `CRON_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and confirm `NEXT_PUBLIC_SITE_URL` is set and actually consumed (see flag in section 2).
- [ ] Vercel Cron configured for `/api/cron/refresh-availability` and `/api/cron/sync-integrations`, both requiring `CRON_SECRET`.
