import "server-only";
import { createServiceClient } from "@/lib/supabase/admin";

const MODEL = "gemini-2.5-flash-lite";

// The free Gemini tier for this project is capped at ~20 requests/day and
// 10/minute (see ai.google.dev usage dashboard) — PER PROJECT, not per user.
// A handful of people searching at once (or one abusive client hammering the
// endpoint) could burn the whole day's budget for everyone. GEMINI_DAILY_LIMIT
// stays a few requests under the real cap so a manual test here and there
// doesn't tip it over, and DAILY_LIMIT_KEY is the shared counter row in
// Supabase (atomic across serverless instances, unlike an in-memory counter).
const GEMINI_DAILY_LIMIT = 15;
const USAGE_KEY = "gemini-memory-search";

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

export interface TitleGuessResult {
  titles: string[];
  /** True once today's shared Gemini budget is used up — the caller should
   * fall back to the free keyword index and can surface a friendly notice. */
  budgetExceeded: boolean;
}

async function underDailyBudget(): Promise<boolean> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.rpc("increment_usage_counter", { p_key: USAGE_KEY });
    if (error) return true; // fail open — don't break the feature over a counter hiccup
    return (data as number) <= GEMINI_DAILY_LIMIT;
  } catch {
    return true;
  }
}

/**
 * Asks Gemini to recognize a movie/TV/anime/manga from a vague, half-remembered
 * description — the same "world knowledge" trick Google Search's AI Overview
 * uses, which is fundamentally something keyword full-text search can never do
 * (it has no idea "time is life and currency" describes the plot of In Time).
 * Returns candidate titles only; real metadata is resolved afterward via the
 * app's existing unified search so results always have accurate posters/years.
 */
export async function guessTitlesFromDescription(description: string): Promise<TitleGuessResult> {
  const key = process.env.GEMINI_API_KEY ?? "";
  if (!key) return { titles: [], budgetExceeded: false };

  if (!(await underDailyBudget())) {
    return { titles: [], budgetExceeded: true };
  }

  const prompt = `Someone is trying to remember a movie, TV show, anime, or manga based on a vague description. Identify what they're describing.

Description: "${description}"

Reply with ONLY a JSON array of up to 4 title guesses, most likely first, no other text. Example: ["In Time", "Gattaca"]. Use official English titles. If you have no reasonable guess, reply with [].`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 200 },
        }),
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return { titles: [], budgetExceeded: false };
    const json = (await res.json()) as GeminiResponse;
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return { titles: [], budgetExceeded: false };
    const parsed = JSON.parse(match[0]) as unknown;
    if (!Array.isArray(parsed)) return { titles: [], budgetExceeded: false };
    const titles = parsed.filter((t): t is string => typeof t === "string" && t.trim().length > 0).slice(0, 4);
    return { titles, budgetExceeded: false };
  } catch {
    return { titles: [], budgetExceeded: false };
  }
}
