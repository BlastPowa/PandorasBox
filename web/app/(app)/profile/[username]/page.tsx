import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { PublicProfile } from "@/components/profile/public-profile";

export const revalidate = 0;

interface ProfileRow {
  id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  banner_url: string | null;
  privacy: "public" | "friends" | "private";
  created_at: string;
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createClient();
  const [{ data: profile }, viewer] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, avatar_url, bio, banner_url, privacy, created_at")
      .eq("username", decodeURIComponent(username))
      .maybeSingle(),
    getCurrentUser(),
  ]);

  if (!profile) notFound();

  const row = profile as ProfileRow;
  const isOwner = viewer?.id === row.id;

  let visible = row.privacy === "public" || isOwner;
  if (!visible && row.privacy === "friends" && viewer) {
    const { data } = await supabase.rpc("are_friends", { a: viewer.id, b: row.id });
    visible = Boolean(data);
  }

  const [{ data: collections }, { data: activity }] = await Promise.all([
    visible
      ? supabase
          .from("collections")
          .select("id, name, description, cover_url, visibility, created_at")
          .eq("user_id", row.id)
          .order("created_at", { ascending: false })
          .limit(12)
      : Promise.resolve({ data: [] }),
    visible
      ? supabase
          .from("activity")
          .select("id, verb, title, poster_url, media_type, media_key, created_at")
          .eq("user_id", row.id)
          .order("created_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <PublicProfile
      profile={row}
      isOwner={isOwner}
      visible={visible}
      collections={collections ?? []}
      activity={activity ?? []}
    />
  );
}
