import { Users } from "lucide-react";
import { FriendsView } from "@/components/friends/friends-view";

export const metadata = { title: "Friends · PBox" };

export default function FriendsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8">
      <div className="mb-1 flex items-center gap-2">
        <Users className="size-6 text-[var(--accent)]" />
        <h1 className="font-display text-2xl font-bold">Friends</h1>
      </div>
      <p className="mb-6 text-sm text-[var(--text-secondary)]">
        Find people, manage requests, and see what your friends are watching and reading.
      </p>
      <FriendsView />
    </div>
  );
}
