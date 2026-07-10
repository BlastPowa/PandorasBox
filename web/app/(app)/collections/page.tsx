import { CollectionsView } from "@/components/collections/collections-view";

export const metadata = { title: "Collections · PBox" };

export default function CollectionsPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8">
      <h1 className="mb-1 font-display text-2xl font-bold">Collections</h1>
      <p className="mb-6 text-sm text-[var(--text-secondary)]">
        Custom folders that live alongside your status lists — group titles however you like.
      </p>
      <CollectionsView />
    </div>
  );
}
