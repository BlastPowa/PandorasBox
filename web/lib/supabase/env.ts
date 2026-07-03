export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** True when Supabase env is configured. Public discovery works without it; auth/lists/admin do not. */
export const isSupabaseConfigured = supabaseUrl.length > 0 && supabaseAnonKey.length > 0;
