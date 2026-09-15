import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  Clapperboard,
  Clock3,
  Compass,
  Gamepad2,
  Images,
  Library,
  ListChecks,
  MessageCircle,
  MoonStar,
  Palette,
  Smartphone,
  Sparkles,
  Tv,
  Users,
  ShieldCheck,
} from "lucide-react";
import { DiscoveryPageHeader } from "@/components/discovery/discovery-page-header";

export const metadata = { title: "What's New · PBox" };

const RELEASES = [
  {
    icon: BookOpen,
    title: "Comics now feels like a real reading hub",
    text: "Comics now has an artwork-first featured shelf, grid and list views, Continue Reading from your real library history, richer series pages, and clearer issue progress with a visual completion meter and easier resume controls.",
  },
  {
    icon: Users,
    title: "Friends is now a proper social hub",
    text: "Friend cards are richer and searchable, your circle can be sorted quickly, social counts are easier to scan, and a new privacy-aware activity view surfaces what accepted friends are adding, starting and finishing.",
  },
  {
    icon: MessageCircle,
    title: "Messages is quicker to organise",
    text: "Conversations can now be pinned on your device, filtered to unread or pinned threads, and searched by title or recent message while keeping custom chat atmospheres and mobile full-screen conversations intact.",
  },
  {
    icon: BarChart3,
    title: "Stats now feels like a real dashboard",
    text: "Stats now includes animated completion, status and rating visuals, weekly activity, genre and media breakdowns, milestones, rank progress and richer recent activity using your existing library history.",
  },
  {
    icon: Images,
    title: "Movie and series galleries are cleaner",
    text: "Artwork is ranked and deduplicated more carefully, repeated-looking backdrops are reduced, and the gallery now uses a larger cinematic viewer with a responsive thumbnail rail and clearer photo controls.",
  },
  {
    icon: Smartphone,
    title: "Redesigned pages work better on phones and tablets",
    text: "Messages now use a true full-screen mobile conversation view, Settings imports reflow on narrow screens, collection actions stay tappable, and game screenshot rails no longer overflow small displays.",
  },
  {
    icon: Clapperboard,
    title: "A more cinematic home",
    text: "Spotlight artwork and the page backdrop now move together, keeping the current film or show visible instead of hiding it behind heavy panels.",
  },
  {
    icon: Sparkles,
    title: "Recommendations that learn from your library",
    text: "For You now separates Movies, TV, Anime and Manga, then breaks your strongest tastes into genre-specific rails using recent history, ratings and favourite genres.",
  },
  {
    icon: Clock3,
    title: "Quiet titles are easier to return to",
    text: "The home page now surfaces in-progress titles that have been untouched for three weeks or more, with a quick Resume action and an option to move them to Paused without digging through the full library.",
  },
  {
    icon: Library,
    title: "A cleaner, artwork-led library",
    text: "Library cards surface progress, rating and status more clearly while filters and controls stay easy to scan in both Light and Dark mode.",
  },
  {
    icon: Palette,
    title: "Collections look like collections",
    text: "Collections can use an item poster as their cover, with the collection name drawn over the artwork so the shelf stays visual and compact.",
  },
  {
    icon: Tv,
    title: "Messages keep their personality",
    text: "Chat backgrounds work again in Light mode, with message surfaces and custom backgrounds tuned so conversations do not collapse into a flat white page.",
  },
  {
    icon: CalendarDays,
    title: "A rebuilt release calendar",
    text: "Anime, Movies and TV now have clearer schedule sections so dates, upcoming releases and tracked titles are easier to scan without mixing everything together.",
  },
  {
    icon: Gamepad2,
    title: "Games now match the PBox atmosphere",
    text: "Game discovery uses synced artwork slideshows, glass feature cards, reorderable shelves and richer upcoming hover previews with date, platforms and story context.",
  },
  {
    icon: Compass,
    title: "Game detail pages go deeper",
    text: "Game pages now give screenshots and artwork more room while keeping studio information, trailers, ratings and tracking controls in the same cinematic visual language.",
  },
  {
    icon: BookOpen,
    title: "Profile activity is easier to read",
    text: "Recent activity is presented as a more visual timeline and showcases use larger artwork without changing the personal profile layout you already liked.",
  },
  {
    icon: ListChecks,
    title: "Browser companion v1.3.0 is back",
    text: "The Pandora's Box Chrome companion is active again and can be downloaded directly from Settings → Integrations. It keeps the popup, side panel, local progress, notifications and optional sync flow in one installable package.",
  },
  {
    icon: ListChecks,
    title: "Smarter long-form tracking",
    text: "v1.3.0 now filters social feeds, short-form clips, trailers and small autoplay videos before they can count as watch progress. Netflix and Crunchyroll are limited to watch pages, while Disney+, CinemaOS and other supported players keep dedicated rules.",
  },
  {
    icon: ShieldCheck,
    title: "Extension security stays hardened",
    text: "The companion keeps production source maps off, validates extension messages and sync settings, isolates sync identities per installation, validates remote list data and does not request your Netflix or Disney account password.",
  },
  {
    icon: MoonStar,
    title: "Light, Dark and Auto are consistent",
    text: "The navigation theme control now sits beside Notifications and the shared glass/card system follows the selected theme on pages without artwork backgrounds.",
  },
  {
    icon: Sparkles,
    title: "Smoother cards and controls",
    text: "Poster cards, buttons, progress panels and feature blocks use softer glass surfaces, clearer depth and more responsive hover and press feedback.",
  },
  {
    icon: Tv,
    title: "Tracking is the focus",
    text: "The unfinished internal player, Watch Sync flow and legacy watch route are gone. PBox now focuses on storing, tracking, discovering and linking you to external providers.",
  },
];

const NEXT_UP = [
  "Richer activity history for episodes, chapters, issues and game sessions",
  "More cross-media recommendations that connect adaptations and franchises",
  "Additional privacy-safe history imports from user-provided service exports where supported",
];

export default function UpdatesPage() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 md:px-8">
      <DiscoveryPageHeader
        eyebrow="Pandora's Box · September 2026"
        title="What's New"
        description="A quick look at the changes that make PBox easier to browse, calmer to use and better at keeping track of every story you are into."
        actions={<div className="hidden size-12 place-items-center rounded-2xl bg-[rgb(var(--accent-rgb)/0.14)] text-[var(--accent)] sm:grid"><MoonStar className="size-6" /></div>}
      />

      <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {RELEASES.map(({ icon: Icon, title, text }) => (
          <article key={title} className="pb-uiverse-card pb-aura group rounded-[22px] p-5 sm:p-6">
            <div className="pb-uiverse-icon grid size-11 place-items-center rounded-2xl text-[var(--accent)] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-105">
              <Icon className="size-5" />
            </div>
            <h2 className="mt-4 font-display text-lg font-bold tracking-tight text-[var(--text)]">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{text}</p>
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
