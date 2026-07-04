import { HelpCircle, MessageCircleQuestion } from "lucide-react";
import { GlassCard } from "@/components/ui-fx/glass-card";
import { FaqAccordion, type FaqEntry } from "@/components/faq/faq-accordion";
import { ContactForm } from "@/components/faq/contact-form";

export const metadata = { title: "FAQ & Help · Pandora's Box" };

const ENTRIES: FaqEntry[] = [
  {
    question: "How do I add a bunch of titles at once (bulk import)?",
    answer: (
      <div className="space-y-2">
        <p>Go to <span className="text-[var(--text)]">Settings → &quot;Bring your list with you&quot;</span>. There are two ways:</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            <span className="text-[var(--text)]">Paste a list.</span> Copy titles from MyAnimeList, Letterboxd,
            iPhone Notes, a spreadsheet, anywhere — one title per line — and paste them into the box. We search each
            line and add the best match to your <span className="text-[var(--text)]">Planned</span> list automatically.
          </li>
          <li>
            <span className="text-[var(--text)]">Import a file.</span> If you exported a Pandora&apos;s Box JSON
            file or share-code before, use <span className="text-[var(--text)]">Import JSON</span> or paste the
            share code in the same section.
          </li>
        </ol>
      </div>
    ),
  },
  {
    question: "How do I move my list to a new device, or share it?",
    answer: (
      <p>
        In <span className="text-[var(--text)]">Settings → Backup &amp; transfer</span>, click{" "}
        <span className="text-[var(--text)]">Export JSON</span> to download a file, or{" "}
        <span className="text-[var(--text)]">Share code</span> to get a portable text code you can paste into
        Pandora&apos;s Box on another device or send to a friend.
      </p>
    ),
  },
  {
    question: "How does marking episodes/chapters watched work?",
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
    answer: (
      <p>
        It&apos;s a shortcut back to everything you&apos;ve set to <span className="text-[var(--text)]">Watching</span> or{" "}
        <span className="text-[var(--text)]">Reading</span>, sorted so titles you&apos;ve already started come first.
        Since Pandora&apos;s Box links out to other sites rather than playing video itself, progress is tracked by you
        marking episodes/chapters — it doesn&apos;t auto-detect what you watched elsewhere.
      </p>
    ),
  },
  {
    question: "What are Collections, and how are they different from status (Watching, Planned, etc.)?",
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
    answer: (
      <p>
        The star rating is yours — rate anything 1–5 stars (stored out of 10) from the title page or your library.
        The score shown next to a title (e.g. 8.3) comes from TMDB/AniList. On movie and TV pages you may also see
        🍅 Rotten Tomatoes, IMDb and Metacritic scores when available.
      </p>
    ),
  },
  {
    question: "The site I want to watch/read on isn't listed — what do I do?",
    answer: (
      <p>
        Every title page has a <span className="text-[var(--text)]">&quot;Can&apos;t find it? Browse all sites&quot;</span> button
        under Where to Watch, which opens the full curated Sites directory. If it&apos;s still missing, send a note
        using the contact box below and an admin can add it.
      </p>
    ),
  },
  {
    question: "How does the Schedule / Release Calendar work?",
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
    answer: (
      <p>
        Yes, it&apos;s private by default. Your library, ratings and progress are only visible to you — every
        account&apos;s data is isolated at the database level. Collections are private unless you explicitly mark
        one &quot;Public&quot; to share it.
      </p>
    ),
  },
  {
    question: "Can I use Pandora's Box on my phone?",
    answer: (
      <p>
        Yes — it&apos;s a full responsive web app and can be installed like an app: open it in your phone&apos;s
        browser and choose &quot;Add to Home Screen&quot; (iPhone: Share → Add to Home Screen; Android: browser menu
        → Install app). On mobile, use the bottom bar&apos;s <span className="text-[var(--text)]">More</span> button
        to reach Schedule, Collections, Sites, Stats and Settings.
      </p>
    ),
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8">
      <div className="mb-1 flex items-center gap-2">
        <HelpCircle className="size-6 text-[var(--accent)]" />
        <h1 className="font-display text-2xl font-bold">FAQ &amp; Help</h1>
      </div>
      <p className="mb-6 text-sm text-[var(--text-secondary)]">
        Common questions about tracking, importing lists, and how everything fits together.
      </p>

      <FaqAccordion entries={ENTRIES} />

      <div className="mt-8">
        <GlassCard macDots title="Still stuck? Contact an admin">
          <div className="space-y-3 p-5">
            <div className="flex items-start gap-2 rounded-[var(--radius-md)] bg-[rgba(168,85,247,0.1)] p-3 text-xs leading-relaxed text-[var(--text-secondary)]">
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
