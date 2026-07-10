import { Randomizer } from "@/components/discovery/randomizer";

export const metadata = { title: "Randomize · PBox" };

export default function RandomizePage() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8">
      <h1 className="mb-1 font-display text-2xl font-bold">Open the Box</h1>
      <p className="mb-6 text-sm text-[var(--text-secondary)]">
        Can&apos;t decide what to watch or read? Let PBox pick for you.
      </p>
      <Randomizer />
    </div>
  );
}
