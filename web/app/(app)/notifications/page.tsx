import { redirect } from "next/navigation";
import { NotificationsView } from "@/components/social/notifications-view";
import { DiscoveryPageHeader } from "@/components/discovery/discovery-page-header";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Notifications · PBox" };

export default async function NotificationsPage() {
  if (!await getCurrentUser()) redirect("/login?next=/notifications");
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8">
      <div className="space-y-6">
        <DiscoveryPageHeader
          eyebrow="Inbox"
          title="Notifications"
          description="Friend requests, accepted invites, shared picks and the updates that matter to your library."
        />
        <NotificationsView />
      </div>
    </div>
  );
}
