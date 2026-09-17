import { RankingsView } from "@/components/rankings/rankings-view";
import { DiscoveryPageHeader } from "@/components/discovery/discovery-page-header";

export const metadata = { title: "My Rankings · PBox" };

export default function RankingsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <div className="space-y-6">
        <DiscoveryPageHeader
          eyebrow="Your favourites"
          title="My Rankings"
          description="Build your own ordered favourites by media type and rearrange them whenever your taste changes."
        />
        <RankingsView />
      </div>
    </div>
  );
}
