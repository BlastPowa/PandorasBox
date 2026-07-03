import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReelItem } from "../storage/schema";

interface ReelListRow {
  user_id: string;
  list_data: ReelItem[];
  updated_at: string;
}

export class SupabaseSync {
  private client: SupabaseClient;
  private userId: string;

  constructor(supabaseUrl: string, supabaseAnonKey: string, userId: string) {
    this.client = createClient(supabaseUrl, supabaseAnonKey);
    this.userId = userId;
  }

  async push(list: ReelItem[]): Promise<void> {
    try {
      const row: ReelListRow = {
        user_id: this.userId,
        list_data: list,
        updated_at: new Date().toISOString(),
      };
      const { error } = await this.client
        .from("reel_lists")
        .upsert(row, { onConflict: "user_id" });
      if (error) {
        throw new Error(`Supabase push failed: ${error.message}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Supabase push error: ${error.message}`);
      }
      throw new Error("Supabase push error: unknown error");
    }
  }

  async pull(): Promise<ReelItem[] | null> {
    try {
      const { data, error } = await this.client
        .from("reel_lists")
        .select("list_data")
        .eq("user_id", this.userId)
        .maybeSingle();
      if (error) {
        throw new Error(`Supabase pull failed: ${error.message}`);
      }
      if (data === null) {
        return null;
      }
      const row = data as Pick<ReelListRow, "list_data">;
      if (typeof row.list_data === "string") {
        return JSON.parse(row.list_data) as ReelItem[];
      }
      return row.list_data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Supabase pull error: ${error.message}`);
      }
      throw new Error("Supabase pull error: unknown error");
    }
  }

  async sync(localList: ReelItem[]): Promise<ReelItem[]> {
    const remoteList = await this.pull();
    if (remoteList === null) {
      await this.push(localList);
      return localList;
    }

    const mergedById = new Map<string, ReelItem>();
    for (const item of remoteList) {
      mergedById.set(item.id, item);
    }
    for (const localItem of localList) {
      const remoteItem = mergedById.get(localItem.id);
      if (!remoteItem) {
        mergedById.set(localItem.id, localItem);
        continue;
      }
      const localUpdated = new Date(localItem.updatedAt).getTime();
      const remoteUpdated = new Date(remoteItem.updatedAt).getTime();
      if (localUpdated >= remoteUpdated) {
        mergedById.set(localItem.id, localItem);
      }
    }

    const merged = Array.from(mergedById.values());
    await this.push(merged);
    return merged;
  }
}
