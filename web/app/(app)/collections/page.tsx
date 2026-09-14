import { CollectionsView } from "@/components/collections/collections-view";
import { DiscoveryPageHeader } from "@/components/discovery/discovery-page-header";

export const metadata = { title: "Collections · PBox" };

export default function CollectionsPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8">
      <div className="space-y-6">
        <DiscoveryPageHeader
          eyebrow="Your shelves"
          title="Collections"
          description="Build personal shelves for comfort rewatches, weekend binges, hidden gems, reading queues and anything else you want to keep together."
        />
        <CollectionsView />
      </div>
    </div>
  );
}
