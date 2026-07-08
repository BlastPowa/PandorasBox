"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Lock, Users, CalendarDays, UserPlus, Settings as SettingsIcon } from "lucide-react";
import { sendFriendRequest } from "@/lib/friends/friends";
import { GlassCard } from "@/components/ui-fx/glass-card";
import { Button } from "@/components/ui-fx/button";
import { EmptyState } from "@/components/ui-fx/feedback";
import { BackButton } from "@/components/shell/back-button";

interface ProfileRow {
  id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  banner_url: string | null;
  privacy: "public" | "friends" | "private";
  created_at: string;
}

interface CollectionRow {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  visibility?: string;
  created_at: string;
}

interface ActivityRow {
  id: string;
  verb: string;
  title: string | null;
  poster_url: string | null;
  media_type: string | null;
  media_key: string | null;
  created_at: string;
}

const VERB_LABEL: Record<string, string> = {
  started: "started",
  finished: "finished",
  rated: "rated",
  added: "added",
  created_collection: "created a collection:",
};

export function PublicProfile({
  profile,
  isOwner,
  visible,
  collections,
  activity,
}: {
  profile: ProfileRow;
  isOwner: boolean;
  visible: boolean;
  collections: CollectionRow[];
  activity: ActivityRow[];
}) {
  const [requested, setRequested] = useState(false);
  const joined = new Date(profile.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long" });

  async function addFriend() {
    try {
      await sendFriendRequest(profile.id);
      setRequested(true);
      toast.success("Friend request sent");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send request");
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8">
      <BackButton className="mb-3 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text)]" />
      <div className="relative h-32 overflow-hidden rounded-[var(--radius-lg)] bg-[linear-gradient(120deg,var(--accent),var(--accent-2))] sm:h-40">
        {profile.banner_url && <Image src={profile.banner_url} alt="" fill className="object-cover" />}
      </div>

      <div className="-mt-10 flex flex-wrap items-end justify-between gap-3 px-2">
        <div className="flex items-end gap-3">
          <div className="relative size-20 shrink-0 overflow-hidden rounded-full border-4 border-[var(--bg-base)] bg-[var(--bg-elevated)]">
            {profile.avatar_url ? (
              <Image src={profile.avatar_url} alt="" fill sizes="80px" className="object-cover" />
            ) : (
              <div className="grid size-full place-items-center font-display text-2xl font-bold text-[var(--text-muted)]">
                {profile.username?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}
          </div>
          <div className="pb-1">
            <h1 className="font-display text-xl font-bold">{profile.username}</h1>
            <p className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
              <CalendarDays className="size-3" /> Joined {joined}
            </p>
          </div>
        </div>
        {isOwner ? (
          <Button asChild variant="glass" size="sm"><Link href="/settings"><SettingsIcon className="size-4" /> Edit profile</Link></Button>
        ) : (
          <Button size="sm" onClick={() => void addFriend()} disabled={requested}>
            <UserPlus className="size-4" /> {requested ? "Request sent" : "Add friend"}
          </Button>
        )}
      </div>

      {profile.bio && <p className="mt-4 px-2 text-sm text-[var(--text-secondary)]">{profile.bio}</p>}

      {!visible ? (
        <div className="mt-6">
          <EmptyState
            icon={profile.privacy === "friends" ? <Users className="size-10" /> : <Lock className="size-10" />}
            title={profile.privacy === "friends" ? "Friends only" : "Private profile"}
            description={
              profile.privacy === "friends"
                ? "Add this person as a friend to see their collections and activity."
                : "This user has set their profile to private."
            }
          />
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {collections.length > 0 && (
            <GlassCard macDots title="Public collections">
              <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                {collections.map((c) => (
                  <Link key={c.id} href={`/collections/${c.id}`} className="glass rounded-[var(--radius-md)] p-3 hover:border-[var(--accent)]">
                    <h3 className="font-semibold">{c.name}</h3>
                    {c.description && <p className="mt-1 line-clamp-2 text-xs text-[var(--text-secondary)]">{c.description}</p>}
                  </Link>
                ))}
              </div>
            </GlassCard>
          )}

          <GlassCard macDots title="Recent activity">
            {activity.length === 0 ? (
              <p className="p-4 text-sm text-[var(--text-muted)]">No recent activity.</p>
            ) : (
              <div className="space-y-1 p-3">
                {activity.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 rounded-[var(--radius-md)] p-2 text-sm hover:bg-[var(--glass)]">
                    {a.poster_url && (
                      <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded-[6px] bg-[var(--bg-surface)]">
                        <Image src={a.poster_url} alt="" fill sizes="36px" className="object-cover" />
                      </div>
                    )}
                    <p className="min-w-0 truncate text-[var(--text-secondary)]">
                      <span className="font-semibold text-[var(--text)]">{profile.username}</span>{" "}
                      {VERB_LABEL[a.verb] ?? a.verb} <span className="font-semibold text-[var(--text)]">{a.title}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      )}
    </div>
  );
}
