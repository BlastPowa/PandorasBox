import type { SupabaseClient } from "@supabase/supabase-js";
import type { StorageAdapter } from "@core/storage/listManager";

/**
 * StorageAdapter backed by the per-user `library` row (jsonb blob).
 * Lets core's ListManager run unchanged against Supabase with RLS + Realtime.
 */
export class SupabaseLibraryAdapter implements StorageAdapter {
  constructor(
    private supabase: SupabaseClient,
    private userId: string
  ) {}

  async getItem(_key: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from("library")
      .select("data")
      .eq("user_id", this.userId)
      .maybeSingle();
    if (error) throw new Error(`Library read failed: ${error.message}`);
    if (!data) return null;
    const blob = (data as { data: unknown }).data;
    return JSON.stringify(blob ?? []);
  }

  async setItem(_key: string, value: string): Promise<void> {
    const parsed = JSON.parse(value) as unknown;
    const { error } = await this.supabase
      .from("library")
      .upsert(
        { user_id: this.userId, data: parsed, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
    if (error) throw new Error(`Library write failed: ${error.message}`);
  }

  async removeItem(_key: string): Promise<void> {
    const { error } = await this.supabase
      .from("library")
      .update({ data: [], updated_at: new Date().toISOString() })
      .eq("user_id", this.userId);
    if (error) throw new Error(`Library clear failed: ${error.message}`);
  }
}
