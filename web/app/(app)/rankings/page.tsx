import { Trophy } from "lucide-react";
import { RankingsView } from "@/components/rankings/rankings-view";

export const metadata = { title: "My Rankings · Pandora's Box" };

export default function RankingsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8">
      <div className="mb-1 flex items-center gap-2">
        <Trophy className="size-6 text-[var(--gold)]" />
        <h1 className="font-display text-2xl font-bold">My Rankings</h1>
      </div>
      <p className="mb-6 text-sm text-[var(--text-secondary)]">
        Your own ordered &quot;which is better&quot; lists, separate from star ratings — one per type.
      </p>
      <RankingsView />
    </div>
  );
}
