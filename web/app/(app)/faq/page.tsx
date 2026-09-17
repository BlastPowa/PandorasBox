import Link from "next/link";
import { ArrowRight, BookOpenText, HelpCircle, MessageCircleQuestion, Plug, UploadCloud } from "lucide-react";
import { GlassCard } from "@/components/ui-fx/glass-card";
import { FaqAccordion, type FaqEntry } from "@/components/faq/faq-accordion";
import { ContactForm } from "@/components/faq/contact-form";
import { DiscoveryPageHeader } from "@/components/discovery/discovery-page-header";

export const metadata = { title: "FAQ & Help · PBox" };

const ENTRIES: FaqEntry[] = [
  {
    question: "How do I add a bunch of titles at once (bulk import)?",
    category: "Getting started",
    answer: (
      <div className="space-y-2">
        <p>Go to <span className="text-[var(--text)]">Settings → Import</span>. Pick the path that matches what you already have:</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            <span className="text-[var(--text)]">Paste a list.</span> Copy titles from MyAnimeList, Letterboxd,
            iPhone Notes, a spreadsheet, anywhere — one title per line — and paste them into the box. We search each
            line, then show a popup where you set the status for every match — or use{" "}
            <span className="text-[var(--text)]">&quot;Set all to&quot;</span> to apply one status to the whole batch
            — before anything&apos;s added, so you never have to fix them one by one afterward.
          </li>
          <li>
            <span className="text-[var(--text)]">Import MyAnimeList XML.</span> Upload a MAL export to bring across a larger anime or manga history with less manual matching.
          </li>
          <li>
            <span className="text-[var(--text)]">Restore PBox data.</span> Use a PBox JSON backup or paste a transfer code to bring a library from another device while keeping status, progress, ratings and source IDs.
          </li>
        </ol>
      </div>
    ),
  },
  {
    question: "How do I move my list to a new device, or share it?",
    category: "Getting started",
    answer: (
      <p>
        In <span className="text-[var(--text)]">Settings → Backup &amp; transfer</span>, click{" "}
        <span className="text-[var(--text)]">Export JSON</span> to download a file, or{" "}
        <span className="text-[var(--text)]">Share code</span> to get a portable text code you can paste into
        PBox on another device or send to a friend.
      </p>
    ),
  },
  {
    question: "How does marking episodes/chapters watched work?",
    category: "Library",
    answer: (
      <p>
        Open any title you&apos;ve added, and use the <span className="text-[var(--text)]">Ep N / Ch N</span> button
        to advance your progress one at a time, or open the episode list and click an episode to mark it directly —
        a green checkmark shows which ones you&apos;ve seen. This also powers your Stats and the Home &quot;Continue&quot; row.
      </p>
    ),
  },
  {
    question: "What is the \"Continue\" section on Home for?",
    category: "Library",
    answer: (
      <p>
        It&apos;s a shortcut back to everything you&apos;ve set to <span className="text-[var(--text)]">Watching</span> or{" "}
        <span className="text-[var(--text)]">Reading</span>, sorted so titles you&apos;ve already started come first.
        Update your exact minute, episode, chapter or issue in PBox and the Continue row keeps the titles you are actively
        following close at hand.
      </p>
    ),
  },
  {
    question: "What are Collections, and how are they different from status (Watching, Planned, etc.)?",
    category: "Library",
    answer: (
      <p>
        Status tabs are fixed categories. <span className="text-[var(--text)]">Collections</span> are folders you
        name yourself — like &quot;Comfort rewatches&quot; or &quot;Weekend binge&quot; — that sit alongside status
        and can hold any mix of titles. Make one public and use the Share button to send a link.
      </p>
    ),
  },
  {
    question: "Where do ratings and scores come from?",
    category: "Discovery",
    answer: (
      <p>
        The star rating is yours — rate anything 1–5 stars (stored out of 10) from the title page or your library.
        The score shown next to a title (e.g. 8.3) comes from TMDB/AniList. On movie and TV pages you may also see
        🍅 Rotten Tomatoes, IMDb and Metacritic scores when available.
      </p>
    ),
  },
  {
    question: "The provider I use isn't listed — what do I do?",
    category: "Discovery",
    answer: (
      <p>
        Title pages link to available external providers when that information exists. You can also open the full{" "}
        <span className="text-[var(--text)]">Watch, Read &amp; Play</span> directory from the More menu. It groups external destinations by media type and shows Free or Paid access where configured. If a useful provider is missing,
        send a note using the contact box below and it can be reviewed for the directory.
      </p>
    ),
  },
  {
    question: "How does the Schedule / Release Calendar work?",
    category: "Discovery",
    answer: (
      <p>
        Switch between Anime, Movies, TV, Upcoming, and My List tabs, then pick a day to see releases in time order.
        The Anime tab uses live air times; Movies/TV show real release and premiere dates; Upcoming shows
        announced titles grouped by month; My List filters everything to just what&apos;s in your library.
      </p>
    ),
  },
  {
    question: "I forgot my password — how do I get back in?",
    category: "Accounts",
    answer: (
      <p>
        On the sign-in page, click <span className="text-[var(--text)]">Forgot password?</span> and enter your
        email. You&apos;ll get a reset link by email — click it, choose a new password, and you&apos;re signed back
        in automatically.
      </p>
    ),
  },
  {
    question: "Is my data private? Can other people see my list?",
    category: "Accounts",
    answer: (
      <p>
        Yes, it&apos;s private by default. Your library, ratings and progress are only visible to you — every
        account&apos;s data is isolated at the database level. Collections are private unless you explicitly mark
        one &quot;Public&quot; to share it.
      </p>
    ),
  },
  {
    question: "What's the difference between star ratings and My Rankings?",
    category: "Library",
    answer: (
      <p>
        Star ratings are a quick 1–5 score you leave on any title. <span className="text-[var(--text)]">My Rankings</span>{" "}
        (in the sidebar) is a separate, ordered &quot;which is better&quot; list you build yourself — a personal
        Top 10 style ranking, split into its own tab per type (Movies, TV, Anime, Manga, Manhwa). Add titles from
        your library and reorder them with the up/down arrows.
      </p>
    ),
  },
  {
    question: "What is the Episode Ratings tab?",
    category: "Discovery",
    answer: (
      <p>
        A separate tool (in the sidebar) for checking how a show&apos;s episodes were actually received — search or
        pick a popular title, and it shows a table of every episode with its real IMDb rating, season by season.
        It pulls live data directly from IMDb (via OMDb), so it only works for titles with an IMDb listing — most
        Western/K-drama TV and popular anime have one.
      </p>
    ),
  },
  {
    question: "Can I write a review, or see what other users thought?",
    category: "Social",
    answer: (
      <p>
        Yes — every title page has a <span className="text-[var(--text)]">Reviews</span> section near the bottom
        where you can leave a star rating and written review that everyone can see (edit or delete your own anytime).
        Reviews can be marked for spoilers, readers can vote helpful, and signed-in users can filter to accepted friends.
        Individual episodes have their own reviews too — open an episode from the Episodes list and scroll down inside the pop-up.
      </p>
    ),
  },
  {
    question: "Where do I find Marvel, DC, Disney, or old 2000s Nickelodeon/Disney shows?",
    category: "Discovery",
    answer: (
      <p>
        Head to <span className="text-[var(--text)]">Browse</span> — it has dedicated rows for Marvel, DC, Disney
        Movies, and an &quot;OG TV Shows&quot; row of 2000s-era Nickelodeon, Disney Channel and Disney XD nostalgia
        picks, alongside K-drama, western animation, and the usual trending/popular rows.
      </p>
    ),
  },
  {
    question: "Can I use PBox on my phone?",
    category: "Getting started",
    answer: (
      <p>
        Yes — it&apos;s a full responsive web app and can be installed like an app: open it in your phone&apos;s
        browser and choose &quot;Add to Home Screen&quot; (iPhone: Share → Add to Home Screen; Android: browser menu
        → Install app). On mobile, use the bottom bar&apos;s <span className="text-[var(--text)]">More</span> button
        to reach Schedule, Collections, Sites, Stats and Settings.
      </p>
    ),
  },
  {
    question: "Can I connect Simkl, Trakt, MyAnimeList or AniList?",
    category: "Accounts",
    answer: (
      <p>
        Yes. Open <span className="text-[var(--text)]">Settings → Extension &amp; Apps</span> to connect supported services, see what media each one covers, run a manual sync, turn on Auto Sync where available, and review connection health. Simkl and Trakt cover movie/series tracking, while anime and manga services keep their own supported scopes.
      </p>
    ),
  },
  {
    question: "How does the Books section work, and what is the Anna's Archive link?",
    category: "Discovery",
    answer: (
      <p>
        Books uses Open Library for search, covers, authors, editions, subjects and ratings. Book pages also provide an external Anna&apos;s Archive search link using an ISBN when available, with title and author as a fallback, so PBox can point you to the matching search without hosting the book itself.
      </p>
    ),
  },
];

const HELP_ROUTES = [
  { href: "/settings#import", icon: UploadCloud, title: "Import a library", text: "Paste lists, import MAL XML or restore a PBox backup." },
  { href: "/settings#integrations", icon: Plug, title: "Connect services", text: "Manage Simkl, Trakt, anime/manga sync and the browser companion." },
  { href: "/books", icon: BookOpenText, title: "Explore books", text: "Search Open Library and browse ratings, genres and book details." },
  { href: "/sites", icon: ArrowRight, title: "Open providers", text: "Jump to the Watch, Read & Play directory for external destinations." },
] as const;

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8">
      <DiscoveryPageHeader
        eyebrow="Need a hand?"
        title="FAQ & Help"
        description="Quick answers for tracking progress, moving your library, finding providers and getting the most out of Pandora’s Box."
        actions={<div className="hidden size-12 place-items-center rounded-2xl bg-[rgb(var(--accent-rgb)/0.14)] text-[var(--accent)] sm:grid"><HelpCircle className="size-6" /></div>}
      />

      <section className="mt-6 grid gap-3 sm:grid-cols-2" aria-label="Popular help routes">
        {HELP_ROUTES.map(({ href, icon: Icon, title, text }) => (
          <Link key={href} href={href} className="pb-uiverse-card pb-aura group flex min-h-[108px] items-center gap-4 rounded-[22px] p-4 transition hover:-translate-y-0.5">
            <span className="pb-uiverse-icon grid size-11 shrink-0 place-items-center rounded-2xl text-[var(--accent)]"><Icon className="size-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold">{title}</span>
              <span className="mt-1 block text-xs leading-5 text-[var(--text-secondary)]">{text}</span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-[var(--text-muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--accent)]" />
          </Link>
        ))}
      </section>

      <div className="mt-6">
        <FaqAccordion entries={ENTRIES} />
      </div>

      <div className="mt-8">
        <GlassCard macDots title="Still stuck? Contact an admin">
          <div className="space-y-3 p-5">
            <div className="flex items-start gap-2 rounded-[var(--radius-md)] bg-[rgb(var(--accent-rgb)/0.1)] p-3 text-xs leading-relaxed text-[var(--text-secondary)]">
              <MessageCircleQuestion className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" />
              <span>Describe your issue below with your username — it goes straight to an admin&apos;s inbox.</span>
            </div>
            <ContactForm />
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
