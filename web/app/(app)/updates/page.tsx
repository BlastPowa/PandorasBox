import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Clapperboard,
  Gamepad2,
  Library,
  MoonStar,
  Smartphone,
  Sparkles,
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
      "Recommendations are split across Movies, TV, Anime and Manga with genre-specific rails.",
      "Connected stories can surface adaptations, sequels, related titles and franchise entries.",
      "Quiet in-progress titles can be resumed or moved to Paused from Home.",
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
      "Comic detail pages have stronger artwork hierarchy and easier resume controls.",
    ],
  },
  {
    icon: Users,
    title: "Friends, messages & profiles",
    text: "Social features are easier to organise while keeping the personal backgrounds and relaxed feel of the app.",
    highlights: [
      "Friends can be searched and sorted with a privacy-aware recent activity view.",
      "Messages support pinned threads, unread filters, search and full-screen mobile conversations.",
      "Custom chat backgrounds work properly in Light mode again.",
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
      "Messages, Settings, Collections, Library, Stats and game galleries have tighter phone/tablet layouts.",
      "Movie and series galleries reduce duplicate-looking imagery and use a larger cinematic viewer.",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Browser companion v1.3.0",
    text: "The tracking extension is packaged, current and easier to reach from Settings.",
    highlights: [
      "A Download extension shortcut is visible on the default Settings screen and full controls remain under Extension & Apps.",
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
              The current release brings the cinematic redesign, smarter recommendations, stronger tracking surfaces, extension v1.3.0 and broad Light/Dark/mobile fixes into the same visual system.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end">
            {["8 release groups", "Extension v1.3.0", "Light + Dark", "Mobile ready"].map((label) => (
              <span key={label} className="pb-uiverse-row rounded-xl px-3 py-2 text-center text-xs font-bold text-[var(--text-secondary)]">
                {label}
              </span>
            ))}
          </div>
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
