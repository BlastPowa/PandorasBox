import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Clapperboard,
  Compass,
  Gamepad2,
  Library,
  ListChecks,
  MoonStar,
  Palette,
  Sparkles,
  Tv,
} from "lucide-react";
import { DiscoveryPageHeader } from "@/components/discovery/discovery-page-header";

export const metadata = { title: "What's New · PBox" };

const RELEASES = [
  {
    icon: Clapperboard,
    title: "A more cinematic home",
    text: "Spotlight artwork and the page backdrop now move together, keeping the current film or show visible instead of hiding it behind heavy panels.",
  },
  {
    icon: Sparkles,
    title: "Smoother cards and controls",
    text: "Poster cards, buttons, progress panels and feature blocks now use softer glass surfaces, clearer depth and more responsive hover and press feedback.",
  },
  {
    icon: ListChecks,
    title: "Exact progress tracking",
    text: "Keep the precise minute, episode, chapter or comic issue you reached so Continue can bring you back to the right point.",
  },
  {
    icon: Library,
    title: "One library for more media",
    text: "Movies, TV, anime, manga, manhwa, comics and games can live together with status, ratings, progress and collections.",
  },
  {
    icon: Compass,
    title: "Discovery feels less cluttered",
    text: "Browse, franchise pages, recommendations and Open the Box now share the same calmer visual system while keeping artwork at the centre.",
  },
  {
    icon: CalendarDays,
    title: "Release planning stays close",
    text: "The Calendar keeps anime air times, movie releases, TV premieres and your tracked titles in one place.",
  },
  {
    icon: Gamepad2,
    title: "Games fit the same universe",
    text: "Game browsing and game detail pages use the same cinematic structure, with ratings, trailers, Steam activity where available and tracking controls.",
  },
  {
    icon: BookOpen,
    title: "Comics have their own space",
    text: "Comic discovery and detail pages are treated as first-class parts of PBox instead of being squeezed into movie or manga layouts.",
  },
  {
    icon: Palette,
    title: "More personal appearance",
    text: "Light, Dark and Auto modes work with accent-colour choices so the interface can change without losing the artwork-led PBox atmosphere.",
  },
  {
    icon: Tv,
    title: "Tracking is the focus",
    text: "The unfinished internal player and Watch Sync flow have been removed. PBox now focuses on storing, tracking, discovering and linking you to external providers.",
  },
];

const NEXT_UP = [
  "Optional progress reminders for titles that have gone quiet",
  "Richer activity history for episodes, chapters, issues and game sessions",
  "More cross-media recommendations that connect adaptations and franchises",
  "Better collection covers and shareable collection presentation",
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
