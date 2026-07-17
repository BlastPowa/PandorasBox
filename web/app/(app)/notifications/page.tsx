import { Bell } from "lucide-react";
import { redirect } from "next/navigation";
import { NotificationsView } from "@/components/social/notifications-view";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Notifications · PBox" };

export default async function NotificationsPage() {
  if (!await getCurrentUser()) redirect("/login?next=/notifications");
  return <div className="mx-auto max-w-4xl px-4 py-6 md:px-8">
    <div className="mb-1 flex items-center gap-2"><Bell className="size-6 text-[var(--accent)]" /><h1 className="font-display text-2xl font-bold">Notifications</h1></div>
    <p className="mb-6 text-sm text-[var(--text-secondary)]">Friend requests, acceptances, and things your friends shared with you.</p>
    <NotificationsView />
  </div>;
}
