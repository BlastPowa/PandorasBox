import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { User } from "@supabase/supabase-js";

export interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  role: "user" | "admin";
  country: string;
  profile_background_url: string | null;
  profile_background_position: "top" | "center" | "bottom";
}

export async function getCurrentUser(): Promise<User | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(): Promise<Profile | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (!data) return null;
  const row = data as Omit<Profile, "profile_background_url" | "profile_background_position"> & Partial<Pick<Profile, "profile_background_url" | "profile_background_position">>;
  return {
    ...row,
    profile_background_url: row.profile_background_url ?? null,
    profile_background_position: row.profile_background_position ?? "center",
  };
}

export async function requireAdmin(): Promise<boolean> {
  const profile = await getProfile();
  return profile?.role === "admin";
}
