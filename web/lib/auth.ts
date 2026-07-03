import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { User } from "@supabase/supabase-js";

export interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  role: "user" | "admin";
  country: string;
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
    .select("id, username, avatar_url, role, country")
    .eq("id", user.id)
    .maybeSingle();
  return (data as Profile | null) ?? null;
}

export async function requireAdmin(): Promise<boolean> {
  const profile = await getProfile();
  return profile?.role === "admin";
}
