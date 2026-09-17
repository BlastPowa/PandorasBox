import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bookmark,
  Clapperboard,
  Dices,
  Gamepad2,
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
      "Recommendations are split across Movies, TV, Anime and Manga with genre-specific rails.",
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
    title: "Browser companion v1.3.0",
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
            {["11 shipped batches", "Rolling release log", "Light + Dark", "Mobile ready"].map((label) => (
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
