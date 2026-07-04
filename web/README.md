# Pandora's Box

A universal entertainment tracker — one place to track, discover, and find where to watch or read **everything**: movies, TV/K-drama, anime, manga, and manhwa.

Live at: https://pandoras-box-tau.vercel.app

---

## What it is

Most tracking apps only do one thing well — MyAnimeList is anime/manga-only, Letterboxd is movies-only, TV Time is TV-only. Pandora's Box combines all of it into a single library, with a dark, cinematic interface inspired by streaming platforms (Netflix/Disney+ style poster rows and hero carousels) blended with a MyAnimeList-style profile/stats system.

It is a **link-out hub, not a streaming service** — it doesn't host or stream any video/manga itself. Every title links out to legitimate sources (official streaming providers via TMDB's real provider data, plus a curated directory of free sites) so you always land on an actual place to watch or read.

## How it works

1. **Sign up** (email/password or Google) — your account and library are private and isolated from every other user's.
2. **Discover** something via the Home feed, Browse (genre/franchise rows), Search, or the Randomize "Open the Box" tool.
3. **Add it to your library** with a status: Watching, Reading, Completed, On Hold, Dropped, or Planned.
4. **Track progress** — mark episodes/chapters watched one at a time, in bulk, or undo a mistake. Progress feeds your Continue row, stats, and completion tracking.
5. **Rate and rank** — a 1–5 star rating per title, plus separate personal Top-10-style ranking lists per category (movies, TV, anime, manga, manhwa) that you can freely reorder.
6. **Find where to watch/read** — every title page shows real paid streaming providers (from TMDB) plus curated free sites, with a fallback to browse the full sites directory if nothing listed fits.
7. **Stay on top of releases** — a release calendar shows exact anime air times, real movie/TV release dates, and an "Upcoming" tab for titles announced months ahead; a "My List" filter narrows it to just what you track.

## Features

**Discovery**
- Home feed: continue-watching panel, hero carousel, trending/coming-soon/franchise rows
- Browse: curated rows for Marvel, DC, Disney, K-drama, western animation, and an "OG TV Shows" 2000s nostalgia row (Nickelodeon/Disney Channel/Disney XD)
- Unified search across movies, TV, anime, and manga in one box
- Command palette (⌘K / Ctrl+K) for instant search and navigation from anywhere
- "Open the Box" — randomize a pick by type and genre when you can't decide

**Tracking & organization**
- Per-user library with real-time sync across tabs/devices
- Status tracking, star ratings, and personal ordered ranking lists (separate from ratings)
- User-created Collections (custom folders alongside status, with a public share option)
- Bulk-select episodes to mark many watched at once, plus one-click undo
- JSON export/import, a portable share-code, and a paste-a-list importer (works with lists copied from MyAnimeList, Letterboxd, Notes, spreadsheets, anywhere)

**Title pages**
- Full details, cast, trailers (YouTube), and — when configured — Rotten Tomatoes/IMDb/Metacritic scores
- Live availability badges (new episode, now in HD, now streaming vs. theatrical)
- Season/episode browsers with per-episode synopses (including for anime, via MyAnimeList data)
- Where-to-watch links (paid + free + admin-curated), with a fallback to the full sites directory

**Account & access**
- Email/password or Google sign-in; sign in with either email or username
- Password reset flow for locked-out accounts
- Custom profile pictures
- Admin panel (role-gated) to manage curated watch links, the sites directory, site announcements, and view/resolve user-submitted support issues
- FAQ & Help page with a "contact an admin" form

**Platform**
- Fully responsive — installable as a Progressive Web App (PWA) on phones and desktop
- Rate-limited APIs, strict security headers (CSP, HSTS, clickjacking protection), and per-user data isolation at the database level

## Languages & technology

| Layer | Technology |
|---|---|
| Language | TypeScript (100% of the codebase) |
| Framework | Next.js (App Router), React |
| Styling | Tailwind CSS, Radix UI primitives |
| Database & Auth | Supabase (Postgres, Row Level Security, Auth, Realtime, Storage) |
| Hosting | Vercel |
| Data sources | TMDB (movies/TV/cast/providers), AniList (anime/manga), MangaDex (manga chapters), Jikan/MyAnimeList (anime episode synopses), OMDb (optional critic scores), Resend (optional contact-form email) |
| Styling language | CSS (via Tailwind), no separate stylesheets |
| Config/scripting | SQL (Postgres migrations), Bash/shell scripting for tooling |

The project is a monorepo: a shared, platform-agnostic **`core/`** library (written in plain TypeScript, no framework dependencies) holds all the business logic — API calls, list management, formatting — and the Next.js app in **`web/`** imports it directly. This keeps the logic reusable if a native mobile app is ever built later.
