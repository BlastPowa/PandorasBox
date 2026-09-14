import { FriendsView } from "@/components/friends/friends-view";
import { DiscoveryPageHeader } from "@/components/discovery/discovery-page-header";

export const metadata = { title: "Friends · PBox" };

export default function FriendsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8">
      <div className="space-y-6">
        <DiscoveryPageHeader
          eyebrow="Your circle"
          title="Friends"
          description="Find people, manage requests, and keep up with what your friends are watching, reading and saving."
        />
        <FriendsView />
      </div>
    </div>
  );
}
