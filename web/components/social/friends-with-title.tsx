import Image from "next/image";
import Link from "next/link";
import { Library, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { GlassCard } from "@/components/ui-fx/glass-card";

interface FriendWithTitle {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  item_status: string | null;
  library_updated_at: string;
}

function statusLabel(value: string | null) {
  if (!value) return "In their list";
  return value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export async function FriendsWithTitle({ mediaKey }: { mediaKey: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.rpc("friends_with_library_item", { p_media_key: mediaKey });
  if (error) return null;
  const friends = (data ?? []) as FriendWithTitle[];

  return (
    <GlassCard macDots title="Friends who have this" strong>
      <div className="p-4">
        {friends.length === 0 ? (
          <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--glass)]"><Users className="size-5" /></span>
            None of your visible friends have added this yet.
          </div>
        ) : (
          <div className="space-y-2">
            {friends.map((friend) => {
              const name = friend.username ?? "PBox friend";
              const content = (
                <>
                  <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[rgb(var(--accent-rgb)/0.14)] font-bold text-[var(--accent)]">
                    {friend.avatar_url ? <Image src={friend.avatar_url} alt="" fill sizes="40px" className="object-cover" /> : name.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{name}</strong><span className="flex items-center gap-1 text-[11px] capitalize text-[var(--text-muted)]"><Library className="size-3" /> {statusLabel(friend.item_status)}</span></span>
                </>
              );
              return friend.username ? <Link key={friend.user_id} href={`/profile/${encodeURIComponent(friend.username)}`} className="flex min-h-12 items-center gap-3 rounded-xl px-2 transition hover:bg-[var(--glass)]">{content}</Link> : <div key={friend.user_id} className="flex min-h-12 items-center gap-3 rounded-xl px-2">{content}</div>;
            })}
          </div>
        )}
      </div>
    </GlassCard>
  );
}
