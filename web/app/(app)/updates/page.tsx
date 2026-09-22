import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ArrowRightLeft,
  BarChart3,
  Bell,
  Bookmark,
  Clapperboard,
  Dices,
  Gamepad2,
  Globe,
  Library,
  MoonStar,
  Smartphone,
  Sparkles,
  Trophy,
  Users,
  ShieldCheck,
} from "lucide-react";
import { DiscoveryPageHeader } from "@/components/discovery/discovery-page-header";

export const metadata = { title: "What's New · PBox" };

const RELEASES = [
  {
    icon: Clapperboard,
    title: "Home & discovery",
    text: "The home page is more cinematic and useful without covering the artwork that gives PBox its atmosphere.",
    highlights: [
      "Spotlight cards stay in sync with the changing page backdrop.",
      "Continue Watching now sits directly under Spotlight with wide glass cards, progress bars and exact resume context.",
      "Browse by Provider uses rounded Netflix, Disney+, Prime Video, Max and other service tiles with an expandable movie/show rail.",
      "Because you watched rows use your recent movie and TV history before broader genre, anime and manga recommendations.",
      "Home keeps recommendations compact while deeper movie, TV, anime and manga discovery stays available in Discover.",
      "Connected stories can surface adaptations, sequels, related titles and franchise entries.",
    ],
  },
  {
    icon: Library,
    title: "Library & collections",
    text: "Tracking pages now put artwork, progress and useful controls first while staying easier to scan.",
    highlights: [
      "Library cards show status, progress and rating more clearly.",
      "Collections can use item artwork as the cover with the collection name over the thumbnail.",
      "Filters and actions are easier to use across desktop, phone and tablet layouts.",
    ],
  },
  {
    icon: Gamepad2,
    title: "Games & comics",
    text: "Both areas now feel like part of the same cinematic tracker instead of separate utility pages.",
    highlights: [
      "Games prioritise scenic screenshots for full-page slideshows while cover and key art stay inside cards.",
      "Hero backgrounds, feature previews and the active game slide now stay visually in sync.",
      "Game detail pages give screenshots, trailers, studio details and tracking controls more room.",
      "Comics now has featured shelves, grid/list views, Continue Reading and clearer issue progress.",
      "Comic detail pages have stronger artwork hierarchy, easier resume controls and theme-aware series info cards.",
    ],
  },
  {
    icon: Users,
    title: "Friends, messages & profiles",
    text: "Social features are easier to organise while keeping the personal backgrounds and relaxed feel of the app.",
    highlights: [
      "Friends can be searched and sorted with a privacy-aware recent activity view.",
      "Messages support pinned threads, unread filters, search and full-screen mobile conversations.",
      "Chat backgrounds now stay visible behind glassy message bubbles and controls in both Light and Dark mode.",
      "Profile activity and showcases use a more visual timeline and larger artwork.",
    ],
  },
  {
    icon: BarChart3,
    title: "Stats & schedule",
    text: "Progress and release information is easier to understand at a glance.",
    highlights: [
      "Stats includes animated completion, status, rating, genre and media breakdowns.",
      "Weekly activity, milestones, rank progress and richer recent activity use your real library history.",
      "The release calendar separates Anime, Movies and TV so upcoming dates stay readable.",
    ],
  },
  {
    icon: Smartphone,
    title: "Theme & responsive polish",
    text: "The redesign now holds together more consistently across Light, Dark and Auto themes and smaller screens.",
    highlights: [
      "The theme switch lives beside Notifications for quick access.",
      "Shared glass cards and controls follow the selected theme on pages without artwork backgrounds.",
      "Home, provider rails, Continue Watching, recommendations, Messages, Settings, Collections, Library, Stats and game galleries have tighter phone/tablet layouts.",
      "Streaming-style rails use touch-friendly horizontal snapping so phone and tablet users do not depend on hover interactions.",
      "Movie and series galleries reduce duplicate-looking imagery and use a larger cinematic viewer.",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Browser companion v1.3.1",
    text: "The tracking extension is packaged, current and easier to reach from Settings.",
    highlights: [
      "A Download extension shortcut is visible on the default Settings screen and full controls remain under Extension & Apps.",
      "Cinejoy now has its own tracker that reads TMDB movie/show IDs from watch routes and keeps movie or episode progress tied to the correct title.",
      "When Auto-track is enabled, Cinejoy playback can create the matching library item and enrich it with TMDB artwork and metadata when available.",
      "Long-form detection filters social feeds, short clips, trailers and small autoplay videos before they count as watch progress.",
      "Netflix and Crunchyroll are limited to watch pages while Disney+, CinemaOS and other supported players keep dedicated rules.",
      "Production source maps stay off and extension messages, sync settings, remote list data and installation identities are validated.",
    ],
  },
  {
    icon: Activity,
    title: "Tracking stays the focus",
    text: "PBox now concentrates on storing, tracking, discovery and provider links instead of trying to be a streaming service.",
    highlights: [
      "The unfinished internal player, Watch Sync flow and legacy watch route were removed.",
      "Episode, chapter and comic issue updates now carry richer progress context into activity feeds.",
      "The extension never asks for a Netflix or Disney password and only uses supported tracking signals.",
    ],
  },
];

const ROLLING_RELEASES = [
  {
    icon: ShieldCheck,
    batch: "Revamp batch 37",
    date: "22 September 2026",
    title: "Browser companion test release",
    text: "The extension is easier to recognise, configure and test while keeping the broader playback tracking work from the previous batch.",
    highlights: [
      "Pandora's Box for Chrome is now v1.3.1 with its own open-box/playback icon across Chrome's toolbar, extension list and packaged build.",
      "The popup now has a dedicated Settings sheet for Auto-track, notifications, country, TMDB matching and optional Supabase sync instead of sending every settings change to a separate page.",
      "Advanced profile, import and data tools remain available from the Settings sheet, and Chrome's extension Options link opens that full page directly.",
      "The Settings sheet explains startup behavior: newly opened watch pages work automatically, while tabs that were already open before an install or extension reload need one page refresh.",
      "The website download links now point at the v1.3.1 package so the build being tested matches the visible extension version.",
    ],
  },
  {
    icon: Clapperboard,
    batch: "Revamp batch 36",
    date: "22 September 2026",
    title: "Smoother Home & broader playback tracking",
    text: "Home does less repeated work while the browser companion handles modern movie and TV players more reliably across generic streaming sites and embedded video frames.",
    highlights: [
      "Browse by Provider now caches already-loaded movie and TV rails so switching back to a provider avoids another request and feels immediate.",
      "Home memoizes library-derived sections and preloads the next Spotlight artwork to reduce repeated sorting and carousel image hitching.",
      "Universal video tracking can follow the active player when sites swap or mount multiple video elements instead of binding permanently to the first video on the page.",
      "Embedded players can inherit the top page title, season and episode context, and background handling promotes iframe events back to the actual movie-site tab URL.",
      "Auto-track now attempts TMDB creation only for a unique exact movie/show title match, preserving existing title matching first and avoiding ambiguous auto-created entries.",
      "Extension webpack, nonincremental TypeScript and the full 61-route production web build pass; lint remains at 0 errors with 4 pre-existing warnings outside this batch.",
    ],
  },
  {
    icon: Users,
    batch: "Revamp batch 35",
    date: "17 September 2026",
    title: "Profiles put real activity first",
    text: "Public profiles now reach collections and activity faster, with identity, privacy, actions and real tracking numbers grouped into one cleaner header.",
    highlights: [
      "Profile banners are shorter so featured collections and recent activity begin higher on the page.",
      "Avatar and identity details use a tighter layout that remains readable on phones and tablets.",
      "Privacy state is now visible beside the username instead of using a generic Collector status chip.",
      "Collections, recent titles and completions now sit directly below the profile summary as compact scrollable stats.",
      "The repeated synthetic level ring, collector-level card and duplicate large stat cards were removed to reduce noise and scrolling.",
      "Friend, message and edit-profile actions keep their existing behavior while fitting into the revised information hierarchy.",
      "Focused lint, nonincremental TypeScript and the full 61-route production build pass after the profile refresh.",
    ],
  },
  {
    icon: Sparkles,
    batch: "Revamp batch 34",
    date: "17 September 2026",
    title: "Search works as a complete destination",
    text: "Search now has its own clear query flow and a lighter title/description switch while keeping the existing multi-source discovery and half-remembered-title tools.",
    highlights: [
      "The Search page now includes a dedicated page-level search field, so discovery no longer depends on the global header search.",
      "Queries still preserve the existing URL, multi-source results, franchise matching and filtering behavior.",
      "Search titles and Describe it now use one compact segmented control with larger touch targets and less explanatory clutter.",
      "The Describe it panel now focuses on useful plot, character and scene guidance instead of exposing internal quota or API implementation details.",
      "Memory-search cooldown, fallback matching, confidence signals and direct result routing remain in place.",
      "Focused lint, nonincremental TypeScript and the full 61-route production build pass after the Search refresh.",
    ],
  },
  {
    icon: Users,
    batch: "Revamp batch 33",
    date: "17 September 2026",
    title: "A cleaner social inbox",
    text: "Messages now makes unread activity and conversation choices easier to scan while keeping the existing realtime chat, replies, media and group tools intact.",
    highlights: [
      "The inbox now has a clearer Social Inbox hierarchy with an immediate unread-thread summary and a more prominent compose action.",
      "Conversation search has stronger focus feedback and filters stay compact, touch friendly and easy to scan on narrow screens.",
      "Conversation rows now use compact card styling, clearer selected and pinned states, and relative timestamps such as today, yesterday and weekday labels.",
      "Empty inbox, filter and search states now explain what happened and offer a direct next action instead of leaving a blank utility panel.",
      "The desktop conversation pane now includes a deliberate start-conversation state while the mobile full-screen chat flow remains unchanged.",
      "Direct-message headers make the profile relationship clearer without adding more chrome around the conversation.",
      "Focused lint, nonincremental TypeScript and the full 61-route production build pass after the social inbox refresh.",
    ],
  },
  {
    icon: BarChart3,
    batch: "Revamp batch 32",
    date: "17 September 2026",
    title: "One connected tracking hub",
    text: "Library, Schedule and Stats now share one clearer hierarchy, with faster access to the information people use most and less visual weight above the actual tracking tools.",
    highlights: [
      "Library, Schedule and Stats now use the same tracking-hub header and navigation pattern so moving between progress, releases and analytics feels consistent.",
      "The tracking navigation is more compact on small screens while preserving large touch targets and clear active states.",
      "Schedule replaces the heavy poster-collage hero with a compact weekly overview, reducing image work and getting users to the calendar sooner.",
      "Schedule keeps Anime, Movies and TV release totals visible at a glance while the personal My List calendar stays directly below.",
      "Stats now surfaces Tracked, Completed, Average Rating and Watch Time before the profile rank panel, making the main numbers faster to scan.",
      "The Stats rank panel is shorter and lighter while retaining progression, completion and next-rank context.",
      "Focused lint, nonincremental TypeScript and the full 61-route production build pass after the tracking-hub redesign.",
    ],
  },
  {
    icon: Clapperboard,
    batch: "Revamp batch 31",
    date: "17 September 2026",
    title: "A cleaner, faster-scanning Home",
    text: "Home now keeps tracking and quick decisions near the top while reducing repeated discovery rails and duplicate progress prompts further down the page.",
    highlights: [
      "Progress at a Glance now sits directly under Spotlight so library stats are visible before the long-form content rails.",
      "Pick something for tonight now follows Continue Watching, keeping resume and next-choice actions together.",
      "The stale-title reminder rail was removed from Home because it repeated much of the same library state already covered by Continue Watching and Library.",
      "Separate Trending Movies and Trending TV rails are now one mixed Trending Now row covering movies, TV, anime and manga.",
      "Home recommendation output is capped so Because You Watched stays useful without growing into several near-duplicate genre rows; deeper recommendations remain in Discover.",
      "The current Home route keeps Spotlight artwork local to the hero instead of mounting the full-page ambient artwork layer, avoiding the older duplicated-hero layout.",
    ],
  },
  {
    icon: Smartphone,
    batch: "Revamp batch 30",
    date: "17 September 2026",
    title: "Cinejoy & CinemaOS companion coverage",
    text: "Integration settings now show the playback sources the Pandora browser companion actually supports, including Cinejoy and CinemaOS, without presenting unsupported account connections.",
    highlights: [
      "Cinejoy is now called out as a dedicated movie and TV tracking source with TMDB title mapping plus season and episode parsing.",
      "CinemaOS is surfaced as a supported companion source for title, season and episode progress tracking.",
      "Crunchyroll, Netflix and Disney+ coverage is visible in the same compact source grid so browser tracking is easier to understand at a glance.",
      "Account sync remains clearly separated below for MyAnimeList, AniList, Trakt and Simkl, where supported OAuth/API connections exist.",
      "The production build continues to pass all 61 routes after the integrations UI update.",
    ],
  },
  {
    icon: Sparkles,
    batch: "Revamp batch 29",
    date: "17 September 2026",
    title: "Sharper backgrounds & smoother scrolling",
    text: "Cinematic artwork now stays clearer while heavy full-page blur work and duplicate background paints have been reduced across the app.",
    highlights: [
      "The shared ambient backdrop now dims and scales with scroll without applying a viewport-sized blur on every frame.",
      "Book and comic detail pages reuse the ambient artwork instead of rendering a second blurred copy of the same cover.",
      "Public profiles now use one continuous background layer instead of painting the profile artwork twice.",
      "Person and title fallback heroes keep their artwork visible with dimming, saturation and gradients instead of large blur filters.",
      "Shorts keeps its cinematic poster atmosphere while removing two expensive large-area blur effects around each trailer.",
      "Production TypeScript and the full 61-route Next.js build pass with the new rendering path.",
    ],
  },
  {
    icon: Activity,
    batch: "Revamp batch 28",
    date: "17 September 2026",
    title: "More reliable anime episode counts",
    text: "Anime trackers now load complete episode lists more consistently for long-running and currently airing shows instead of stopping after the first Jikan results page.",
    highlights: [
      "Jikan episode loading now follows its pagination metadata and aggregates every available episode page.",
      "Episode rows are deduplicated by episode number and returned in stable ascending order.",
      "If a later Jikan page fails after earlier pages succeeded, the available episode data is kept instead of discarding the whole list.",
      "AniList airing data now fills only confirmed released episode gaps while preserving richer Jikan titles, dates, filler and recap metadata.",
      "Finished series can recover missing released episode rows from trusted total episode counts without creating unaired future entries.",
    ],
  },
  {
    icon: Library,
    batch: "Revamp batch 27",
    date: "17 September 2026",
    title: "Book cover & external search reliability",
    text: "Books now recover more gracefully when Open Library artwork is incomplete, and external searches use the live search route instead of sending readers to a dead page.",
    highlights: [
      "Open Library covers now prefer a valid work cover and fall back to a normalized ISBN cover when artwork is missing.",
      "Book cover requests use Open Library's no-placeholder mode so missing artwork can be detected cleanly.",
      "Failed book thumbnails switch to a readable book icon and title card instead of leaving a broken image behind.",
      "Book detail posters use the same fallback treatment for consistent artwork across discovery and detail pages.",
      "Anna's Archive actions now use the site's verified /s/ search route with ISBN first and title plus author as fallback.",
      "The external action is labelled as a search so availability is not implied when the external catalogue has no match.",
    ],
  },
  {
    icon: Library,
    batch: "Revamp batch 26",
    date: "17 September 2026",
    title: "Collection editing & review polish",
    text: "Collections are easier to finish and maintain, while review edits now behave and sort like real updates instead of looking like brand-new posts.",
    highlights: [
      "Collection owners can now edit the collection name and description directly from the collection page.",
      "Collections now support editable comma-separated tags, deduplicated and capped for cleaner public shelves.",
      "Existing visibility, covers, sharing, saves, likes, sorting and item management stay available alongside the new metadata editor.",
      "Review edit mode now restores the saved review when cancelled instead of keeping abandoned draft changes.",
      "Edited reviews show an edited marker and use their latest update time for Recent ordering and timestamps.",
      "Review edit and delete controls now include explicit accessible labels.",
    ],
  },
  {
    icon: Dices,
    batch: "Revamp batch 25",
    date: "17 September 2026",
    title: "Open Box reliability & rotating quick picks",
    text: "The randomizer now handles narrow anime and manga filters more reliably and keeps its quick-pick suggestions fresher between runs.",
    highlights: [
      "AniList random picks now check the real number of available result pages before choosing one, preventing narrow filters from landing on empty pages.",
      "Anime Gem and similar high-score presets fall back to a valid populated page when a later random page has no matches.",
      "Quick Pick now rotates through a larger curated pool covering movies, TV, K-drama, anime and manga.",
      "Opening the Box refreshes the visible Quick Pick choices for the next run, and a Shuffle picks control can rotate them on demand.",
      "The randomizer keeps the selected type, era, quality and genre filters explicit while improving empty-result resilience.",
    ],
  },
  {
    icon: Clapperboard,
    batch: "Revamp batch 24",
    date: "17 September 2026",
    title: "Movie & TV hovercards with inline trailers",
    text: "Movie and TV discovery cards now expose richer desktop quick-look information and can open a trailer directly inside the card without leaving the rail.",
    highlights: [
      "Movie and TV poster cards now use the richer quick-look hover treatment across discovery grids and provider rails.",
      "Quick-look cards keep year, score, synopsis and a direct title link visible in one compact overlay.",
      "TMDB-backed movies and series can expand an inline YouTube privacy-enhanced trailer inside the mini card.",
      "Trailer data is fetched only when requested so ordinary poster browsing stays lightweight.",
      "The trailer panel includes loading and unavailable states and can be collapsed without leaving the card.",
    ],
  },
  {
    icon: Globe,
    batch: "Revamp batch 23",
    date: "17 September 2026",
    title: "Provider logos across discovery filters",
    text: "Streaming-service choices are now easier to scan across discovery, especially on mobile where provider names previously blended into the rest of the filter controls.",
    highlights: [
      "The active streaming provider now shows its service logo beside the provider discovery heading.",
      "Provider switchers use logo-backed service tiles with larger touch targets and horizontal snap scrolling.",
      "The mobile Movies and TV filter sheet now uses a visual provider picker instead of a plain text select menu.",
      "Provider filters keep a clear All option and active-state styling while remaining compact on smaller screens.",
      "Existing title-level Where to Watch provider artwork stays consistent with the new discovery controls.",
    ],
  },
  {
    icon: Clapperboard,
    batch: "Revamp batch 22",
    date: "17 September 2026",
    title: "Home dashboard declutter & performance",
    text: "Home now reaches the useful parts faster, with fewer duplicated rails, less startup work and a cleaner balance between discovery and personal progress.",
    highlights: [
      "The duplicate full-page hero backdrop was removed so Spotlight artwork is only rendered once on Home.",
      "Library progress now sits directly below Continue Watching in a compact summary with Active, Planned, Done and Saved totals.",
      "Personal recommendations are capped to the strongest recent context and top two media categories, with deeper discovery moved to Browse.",
      "The Home-only upcoming schedule fetch and extra popular-anime bootstrap request were removed to reduce initial page work.",
      "The lower Saved for later summary was consolidated into the Pick something for tonight area to reduce scrolling and repeated information.",
    ],
  },
  {
    icon: Users,
    batch: "Revamp batch 21",
    date: "17 September 2026",
    title: "Cast & creator profiles",
    text: "Person pages now surface career context and signature credits faster, with stronger filmography tools for larger acting and creator histories.",
    highlights: [
      "Career summary cards now show movie, series and acting-credit totals plus the average score across rated credits.",
      "Known For is now a visual horizontal rail ordered by popularity with artwork, roles, years and title scores.",
      "Filmographies can be searched by title, role or department alongside the existing role, media-type and sort controls.",
      "Result counts and a clearer empty state make large filtered credit lists easier to understand.",
      "Role controls and credit rails now use touch-friendly horizontal layouts on smaller screens.",
    ],
  },
  {
    icon: Sparkles,
    batch: "Revamp batch 20",
    date: "17 September 2026",
    title: "Anime discovery hub",
    text: "Anime discovery now brings seasonal context, fresh episode drops and the main discovery rails into one easier-to-navigate hub without changing the AniList data source.",
    highlights: [
      "A new discovery panel adds quick jumps to Latest, Season, Trending and Popular anime plus a direct search path.",
      "The active season now shows title count, average score and the highest-scoring seasonal pick from the existing data.",
      "Latest Episodes has clearer airing context, a recent-drop count and a swipe-first mobile layout.",
      "Season controls now work better on phones with horizontal season navigation and a full-width year selector.",
      "Trending and Popular anime rails now support the same richer quick-look flow used across other discovery areas.",
    ],
  },
  {
    icon: Clapperboard,
    batch: "Revamp batch 19",
    date: "17 September 2026",
    title: "Trailer feed controls & mobile navigation",
    text: "Shorts now gives the vertical trailer feed clearer position, playback and navigation context while keeping the existing trending trailer source intact.",
    highlights: [
      "A persistent feed header now shows the active trailer, total count and progress through the current set.",
      "Play or pause and mute or unmute are explicit actions instead of relying on hidden player behaviour.",
      "Phone layouts now include dedicated previous, next and title-detail controls with larger touch targets.",
      "Active title metadata keeps type, year, score and synopsis readable without competing with the trailer itself.",
      "An improved empty state sends users back into Browse when no playable trending trailers are available.",
    ],
  },
  {
    icon: ShieldCheck,
    batch: "Revamp batch 18",
    date: "17 September 2026",
    title: "Admin control room",
    text: "The admin workspace now has clearer navigation, faster triage and better visibility into provider links, directory services, announcements and user-submitted issues.",
    highlights: [
      "Admin sections now use descriptive workspace cards instead of a row of basic pills, with clearer context for each management area.",
      "User Issues adds All, Open and Resolved triage views with live counts for faster moderation.",
      "Provider Links now shows link, provider and global counts plus search across media keys, provider names and categories.",
      "Sites Directory adds service, free-option and category counts, search, category filtering and direct outbound links for verification.",
      "Announcements now exposes its variant control and displays active state, body copy and message type in richer cards.",
    ],
  },
  {
    icon: BarChart3,
    batch: "Revamp batch 17",
    date: "17 September 2026",
    title: "Episode ratings season analysis",
    text: "Episode Ratings now works like a proper season scorecard, with faster season navigation and clearer context around peaks, dips and overall consistency.",
    highlights: [
      "Selected titles now open into a richer season summary with season count, average score, rated-episode coverage and score spread.",
      "Season chips replace the slower dropdown-only flow and remain usable on smaller screens through horizontal scrolling.",
      "The strongest and lowest-rated episodes are surfaced immediately before the full episode list.",
      "Episode rows now include stronger date context, responsive mobile cards and visual rating bars on larger screens.",
      "Search and Explore use denser title cards with clearer media type, year and result counts while keeping the existing IMDb/OMDb data path.",
    ],
  },
  {
    icon: ShieldCheck,
    batch: "Revamp batch 16",
    date: "17 September 2026",
    title: "Help centre & first-run onboarding",
    text: "Help and onboarding now match the current PBox feature set, with faster answers for migration, integrations, discovery, books, providers and social features.",
    highlights: [
      "FAQ content is now searchable instead of requiring a full accordion scan.",
      "Category filters group account, tracking, migration, integrations, discovery and community help into clearer paths.",
      "Help copy now covers the current import and backup workflow, browser companion, connected services, Books, provider links and review/social features.",
      "Direct shortcuts make the help centre easier to use when a user already knows which area they need.",
      "First-run onboarding now introduces the newer discovery, integrations, books, provider and social flows instead of the older reduced feature set.",
    ],
  },
  {
    icon: Globe,
    batch: "Revamp batch 15",
    date: "17 September 2026",
    title: "Watch, Read & Play launch hub",
    text: "The external-site directory now works like a proper launch hub, with clearer coverage, faster category navigation and more context before opening another service.",
    highlights: [
      "The directory now shows total services, free options and category coverage before the provider list.",
      "Category jump controls make Movies & TV, Anime, Manga, Manhwa, Comics, Games and mixed providers reachable without scanning the whole page.",
      "Each category now explains its coverage and shows service and free-option counts.",
      "Provider cards expose the destination domain, Free or Paid access and a clearer external-launch action using the existing directory data.",
      "The layout now uses larger touch targets, horizontal category navigation and denser responsive cards for phone and tablet use.",
    ],
  },
  {
    icon: Bell,
    batch: "Revamp batch 14",
    date: "17 September 2026",
    title: "Notification & activity inbox",
    text: "Notifications now work more like a proper social activity inbox, with clearer urgency, richer people and media context, and access to older updates beyond the first page.",
    highlights: [
      "The inbox now shows exact unread totals, the amount currently loaded and friend or group requests that still need a response.",
      "Notifications are grouped into Today, Yesterday, This week and Earlier so active conversations and older updates are easier to scan.",
      "Actor avatars, notification-type labels, profile shortcuts and richer shared-title cards add context without opening every item first.",
      "Unread counts stay visible on the Unread filter and Mark all read is disabled when there is nothing left to clear.",
      "The existing cursor pagination is now exposed through Load more, so notifications beyond the first API page are no longer hidden from the UI.",
    ],
  },
  {
    icon: ArrowRightLeft,
    batch: "Revamp batch 13",
    date: "17 September 2026",
    title: "Import, backup & device migration",
    text: "Moving an existing entertainment history into PBox now has a clearer migration flow, while backups show exactly what is about to move between files and devices.",
    highlights: [
      "Import now explains the three migration paths up front: pasted lists, MyAnimeList XML and full PBox backups or transfer codes.",
      "Backup shows a live Library snapshot with total titles, in-progress, completed and planned counts plus media coverage before exporting.",
      "JSON backups keep status, progress, ratings and source IDs and only add titles that are not already in the Library when restored.",
      "Transfer-code import is now always available, so a code received from another device can be pasted immediately without first generating a code locally.",
      "Generated transfer codes now include clearer handoff instructions and duplicate-only restores report that the Library is already up to date.",
    ],
  },
  {
    icon: Activity,
    batch: "Revamp batch 12",
    date: "17 September 2026",
    title: "Settings & integrations control centre",
    text: "Connected services now read like one tracking dashboard, with clearer sync health, coverage and actions across Simkl, Trakt, MyAnimeList and AniList.",
    highlights: [
      "Extension & Apps now opens automatically after an integration OAuth callback, so connection success and errors stay visible instead of dropping users back on Account.",
      "A new integration summary shows connected services, Auto Sync coverage, the latest healthy sync and anything that needs attention.",
      "Sync all connected runs every linked service from one control while keeping individual provider sync controls available.",
      "Provider cards now show connection state, supported media coverage, external service links, account identity and clearer sync health context.",
      "Auto Sync and disconnect actions now report failed updates safely, and expiring connections show useful future timing before reconnecting.",
    ],
  },
  {
    icon: Dices,
    batch: "Revamp batch 11",
    date: "17 September 2026",
    title: "Guided browse & smarter Randomizer",
    text: "Browse now turns discovery rails into clearer starting points, while the Randomizer can shape a pick by era and rating quality as well as media type and genre.",
    highlights: [
      "Browse adds discovery paths for movie night, anime gems, comfort watches and a full surprise mode, each opening a tuned Randomizer preset.",
      "Randomizer adds 2020s, 2010s, 2000s and classic era controls across supported TMDB and AniList sources.",
      "Well-rated and top-tier quality filters apply real source score thresholds instead of only changing the presentation.",
      "Quick-pick presets, reset controls and result summaries make it easier to understand and reshape a generated set.",
      "Surprise Me now mixes manga into the cross-media pool, and major Browse rails expose richer quick-look detail on desktop.",
    ],
  },
  {
    icon: Trophy,
    batch: "Revamp batch 10",
    date: "17 September 2026",
    title: "Taste rankings & denser search context",
    text: "Personal rankings now feel like a real taste profile, while unified search makes the shape and quality of every result set easier to understand before you start opening titles.",
    highlights: [
      "Rankings now lead with a visual Top 3 podium and keep year, library status and personal rating visible as ranking context.",
      "Each ranking category shows its library count plus ranked and unranked totals so gaps in a personal list are obvious.",
      "The Add title picker is searchable and prioritises highly rated library entries while surfacing status, year and personal score.",
      "Search now shows per-media result counts, scored-result coverage and the release-year span before the poster grid.",
      "Media filters carry live counts, release ordering uses clearer labels, and the title-search versus Describe It modes now explain when each path is useful.",
    ],
  },
  {
    icon: Gamepad2,
    batch: "Revamp batch 9",
    date: "17 September 2026",
    title: "Richer games & comic reading continuity",
    text: "Games now expose the release, platform and studio context needed to compare titles quickly, while Comics carries your exact reading position into the browse experience.",
    highlights: [
      "Game cards now show exact release timing, the primary platform, studio or publisher context and how many additional platforms are supported.",
      "Live Steam player counts stay visible on supported titles without crowding the richer card metadata.",
      "Upcoming game cards pair full release dates with studio and platform information in both the rail and quick-look experience.",
      "Game detail heroes now show the full release date instead of reducing release context to the year alone.",
      "Tracked comic series now show your current issue and progress directly in both grid and list browsing, including visual progress bars.",
    ],
  },
  {
    icon: Users,
    batch: "Revamp batch 8",
    date: "17 September 2026",
    title: "Connected profiles & messages",
    text: "Profiles and conversations now connect into one social flow instead of making friends, activity and messaging feel like separate features.",
    highlights: [
      "Profiles now understand accepted, incoming and outgoing friendship states before showing social actions.",
      "Accepted friends can open their direct conversation straight from a profile, reusing an existing DM when one already exists.",
      "Profile activity can be filtered across Movies & TV, Anime & Manga, Comics and Games with recent counts per section.",
      "The inbox adds dedicated DMs and Groups filters alongside All, Unread and Pinned views.",
      "Direct-message headers link back to the other member's profile for a faster path between chat and activity context.",
    ],
  },
  {
    icon: Bookmark,
    batch: "Revamp batch 7",
    date: "17 September 2026",
    title: "Community collection reactions & saves",
    text: "Public collections now work more like a shared discovery layer, with lightweight reactions and a private saved shelf for collections you want to revisit.",
    highlights: [
      "Public Browse cards now show persistent Like and Save actions with aggregate counts.",
      "Saved Collections keeps community shelves in a dedicated view ordered by when you saved them.",
      "Saving or unsaving updates the Saved view immediately without a full page refresh.",
      "Signed-out visitors can still browse public collections and are prompted to sign in only when reacting.",
      "Save identities stay private while public reaction counts are exposed through a constrained aggregate database function.",
    ],
  },
  {
    icon: Users,
    batch: "Revamp batch 6",
    date: "17 September 2026",
    title: "Safer, more social reviews",
    text: "Community reviews now have better controls for trusted opinions, spoilers and useful feedback without changing the simple review flow.",
    highlights: [
      "Signed-in users can switch between the full community and reviews written by accepted friends.",
      "Review authors can explicitly mark spoilers, and spoiler text stays hidden until a reader chooses to reveal it.",
      "Helpful votes are persistent per user and now drive the Top review ordering before rating and recency tie-breakers.",
      "Friend reviews carry a clear relationship badge and helpful feedback updates optimistically in place.",
      "The review social layer uses the existing friendship model plus a small dedicated helpful-vote table.",
    ],
  },
  {
    icon: BarChart3,
    batch: "Revamp batch 5",
    date: "17 September 2026",
    title: "Library, Schedule & Stats tracking hub",
    text: "The core tracking pages now work as one connected workflow, with faster ways to resume progress, see what is releasing next and decide what to pick up.",
    highlights: [
      "Library, Schedule and Stats now share a compact tracking hub switcher so moving between progress, release dates and insights takes one step.",
      "Library adds a personal pulse with a direct Continue link plus shortcuts for nearly finished and untouched titles.",
      "Schedule now matches tracked titles across raw, TMDB and AniList IDs so My List remains accurate across provider-backed library records.",
      "Signed-in schedules show tracked releases for the current week and the next tracked release at a glance.",
      "Stats adds actionable cards for near-finish titles, the current rotation, planned backlog and completed titles that still need a rating.",
    ],
  },
  {
    icon: Clapperboard,
    batch: "Revamp batch 4",
    date: "16 September 2026",
    title: "Cinejoy-style Home & Discovery",
    text: "Home now leans further into the streaming-style discovery flow from the Cinejoy references while keeping PBox tracking and discovery data at the centre.",
    highlights: [
      "Continue Watching stays directly below Spotlight with wide artwork, exact progress and touch-friendly horizontal snapping.",
      "Streaming provider tiles open focused Movie or TV rails without leaving Home.",
      "Because You Watched now uses recent TMDB movie and series history before broader taste-based recommendations.",
      "Trending Movies and Trending TV are separate full rails so signed-out users also get a clearer discovery path.",
      "Home recommendation and provider cards now expose richer desktop quick-look overlays while preserving tap-first mobile cards.",
    ],
  },
  {
    icon: Clapperboard,
    batch: "Revamp batch 3",
    date: "16 September 2026",
    title: "Richer title info, reviews & collections",
    text: "The Simkl-inspired information pass is live across title pages, episode guides, provider links and community surfaces.",
    highlights: [
      "Title pages now use a compact multi-source ratings strip and put Where to Watch ahead of secondary metadata.",
      "Episode guides show season summaries, episode ratings, air dates and runtime in a denser detail view.",
      "Where to Watch separates subscription, rent/buy and free providers with regional availability counts.",
      "Reviews now include an aggregate score, rating distribution and Recent/Top sorting.",
      "Collections now has My Collections and Public Browse with creator info, poster mosaics, item counts and tags.",
    ],
  },
  {
    icon: Library,
    batch: "Revamp batch 2",
    date: "16 September 2026",
    title: "Books discovery arrives",
    text: "Books now has its own discovery and detail experience while staying consistent with PBox discovery surfaces.",
    highlights: [
      "Open Library powers search, metadata, ratings, genres, covers and book detail pages.",
      "Featured, top-rated and genre shelves cover Fantasy, Sci-Fi, Horror, Romance, Mystery, History and Biography.",
      "Book details include authors, editions, subjects, publishers and ISBN information.",
      "Anna's Archive is available as an external search link using ISBN when possible, with title/author fallback.",
    ],
  },
  {
    icon: Activity,
    batch: "Revamp batch 1",
    date: "16 September 2026",
    title: "Simkl account connection & sync",
    text: "Simkl is now a first-class account integration beside Trakt for movie and series tracking.",
    highlights: [
      "OAuth connection, account lookup and long-lived Simkl tokens are supported from Settings.",
      "Pull sync reads Simkl list, activity, status, progress and rating data.",
      "Push sync supports list changes, history and ratings for TMDB-backed movies and series.",
      "The integration queue now applies the correct provider constraints for Simkl and Trakt.",
    ],
  },
];

const NEXT_UP = [
  "Game-session activity history once game tracking joins the main library model",
  "Additional privacy-safe history imports from user-provided service exports where supported",
];

export default function UpdatesPage() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 md:px-8">
      <DiscoveryPageHeader
        eyebrow="Pandora's Box · September 2026"
        title="What's New"
        description="The latest PBox revamp, grouped into the changes that matter most instead of a long patch-note list."
        actions={<div className="hidden size-12 place-items-center rounded-2xl bg-[rgb(var(--accent-rgb)/0.14)] text-[var(--accent)] sm:grid"><MoonStar className="size-6" /></div>}
      />

      <section className="pb-uiverse-card pb-uiverse-card--feature pb-aura mt-6 rounded-[24px] p-5 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--accent-rgb)/0.2)] bg-[rgb(var(--accent-rgb)/0.08)] px-3 py-1.5 text-xs font-bold text-[var(--accent)]">
              <Sparkles className="size-3.5" /> September revamp
            </div>
            <h2 className="mt-4 font-display text-2xl font-bold tracking-tight sm:text-3xl">One cleaner PBox across every section</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
              Pandora&apos;s Box is now shipping the revamp in smaller verified groups. Each completed batch gets its own release entry here before work moves on to the next section.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end">
            {["35 shipped batches", "Rolling release log", "Light + Dark", "Mobile ready"].map((label) => (
              <span key={label} className="pb-uiverse-row rounded-xl px-3 py-2 text-center text-xs font-bold text-[var(--text-secondary)]">
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[var(--accent)]">Rolling releases</p>
            <h2 className="mt-1 font-display text-2xl font-bold tracking-tight">Shipped in this revamp</h2>
          </div>
          <p className="max-w-md text-xs leading-5 text-[var(--text-muted)]">Newest first. Each entry represents a completed and validated group of changes.</p>
        </div>
        <div className="grid gap-3">
          {ROLLING_RELEASES.map(({ icon: Icon, batch, date, title, text, highlights }) => (
            <article key={batch} className="pb-uiverse-card pb-aura rounded-[22px] p-5 sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="pb-uiverse-icon grid size-9 place-items-center rounded-xl text-[var(--accent)]"><Icon className="size-4" /></span>
                    <span className="rounded-full bg-[rgb(var(--accent-rgb)/0.1)] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--accent)]">{batch}</span>
                    <span className="text-xs text-[var(--text-muted)]">{date}</span>
                  </div>
                  <h3 className="mt-3 font-display text-xl font-bold tracking-tight">{title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-[var(--text-secondary)]">{text}</p>
                </div>
                <div className="grid max-w-xl gap-1.5 text-sm text-[var(--text-secondary)] lg:w-[46%]">
                  {highlights.map((highlight) => (
                    <div key={highlight} className="flex items-start gap-2 leading-5">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                      <span>{highlight}</span>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-3 lg:grid-cols-2">
        {RELEASES.map(({ icon: Icon, title, text, highlights }) => (
          <article key={title} className="pb-uiverse-card pb-aura group rounded-[22px] p-5 sm:p-6">
            <div className="pb-uiverse-icon grid size-11 place-items-center rounded-2xl text-[var(--accent)] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-105">
              <Icon className="size-5" />
            </div>
            <h2 className="mt-4 font-display text-lg font-bold tracking-tight text-[var(--text)]">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{text}</p>
            <div className="mt-4 space-y-2">
              {highlights.map((highlight) => (
                <div key={highlight} className="flex items-start gap-2 text-sm leading-5 text-[var(--text-secondary)]">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                  <span>{highlight}</span>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="pb-uiverse-card pb-uiverse-card--feature pb-aura mt-6 rounded-[24px] p-5 sm:p-7">
        <div className="grid gap-6 lg:grid-cols-[1fr_.95fr] lg:items-center">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[var(--accent)]">Planned next</p>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">Ideas already on the radar</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
              These are planned directions, not released features yet. They build on PBox as a universal tracker instead of turning it into a streaming player.
            </p>
            <Link href="/browse" className="pb-uiverse-button pb-uiverse-button--accent mt-5 inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold text-white">
              Explore PBox <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="space-y-2">
            {NEXT_UP.map((item, index) => (
              <div key={item} className="pb-uiverse-row flex items-start gap-3 rounded-xl px-3 py-3.5">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[rgb(var(--accent-rgb)/0.12)] text-xs font-bold text-[var(--accent)]">{index + 1}</span>
                <p className="pt-1 text-sm font-medium leading-5 text-[var(--text-secondary)]">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
