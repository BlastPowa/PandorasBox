import "server-only";

export interface ComicSeries {
  id: number;
  name: string;
  publisher: "marvel" | "dc";
  coverUrl: string | null;
  startYear: number | null;
  issueCount: number;
  synopsis: string | null;
  comicVineUrl: string;
}

interface ComicVineSearchResult {
  id: number;
  name: string;
  start_year: string | null;
  count_of_issues: number;
  description: string | null;
  site_detail_url?: string;
  image?: { medium_url: string | null };
  publisher?: { id: number; name: string };
}

const MARVEL_SERIES = [
  "The Amazing Spider-Man", "Uncanny X-Men", "Avengers", "Fantastic Four",
  "Invincible Iron Man", "Captain America", "Thor", "Wolverine", "Daredevil",
  "Guardians of the Galaxy", "Black Panther", "Ms. Marvel", "Deadpool", "Venom", "Incredible Hulk",
];

const DC_SERIES = [
  "Batman", "Superman", "Wonder Woman", "The Flash", "Green Lantern",
  "Justice League", "Aquaman", "Teen Titans", "Watchmen", "Green Arrow",
  "Suicide Squad", "Nightwing", "Shazam!", "Harley Quinn", "Batman: The Killing Joke",
];

const PUBLISHER_ID: Record<"marvel" | "dc", number> = { marvel: 31, dc: 10 };

function stripHtml(html: string | null): string | null {
  if (!html) return null;
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > 0 ? text.slice(0, 400) : null;
}

async function fetchSeries(query: string, publisher: "marvel" | "dc"): Promise<ComicSeries | null> {
  const key = process.env.COMICVINE_API_KEY ?? "";
  if (!key) return null;
  try {
    const res = await fetch(
      `https://comicvine.gamespot.com/api/search/?api_key=${key}&format=json&resources=volume&query=${encodeURIComponent(query)}&limit=5&field_list=id,name,start_year,count_of_issues,image,publisher,description,site_detail_url`,
      { headers: { "User-Agent": "PandorasBox/1.0 (https://pandoras-box-tau.vercel.app)" }, next: { revalidate: 60 * 60 * 24 } }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { results?: ComicVineSearchResult[] };
    const candidates = (json.results ?? []).filter((r) => r.publisher?.id === PUBLISHER_ID[publisher]);
    if (candidates.length === 0) return null;
    // Prefer the longest-running volume — the flagship series people actually
    // mean by the name, not an obscure reboot/mini-series that happens to share it.
    const match = candidates.reduce((best, c) => (c.count_of_issues > best.count_of_issues ? c : best));
    return {
      id: match.id,
      name: match.name,
      publisher,
      coverUrl: match.image?.medium_url ?? null,
      startYear: match.start_year ? Number.parseInt(match.start_year, 10) || null : null,
      issueCount: match.count_of_issues,
      synopsis: stripHtml(match.description),
      comicVineUrl: match.site_detail_url ?? `https://comicvine.gamespot.com/volume/4050-${match.id}/`,
    };
  } catch {
    return null;
  }
}

export async function getComics(publisher: "marvel" | "dc"): Promise<ComicSeries[]> {
  const names = publisher === "marvel" ? MARVEL_SERIES : DC_SERIES;
  const results = await Promise.all(names.map((n) => fetchSeries(n, publisher)));
  return results.filter((c): c is ComicSeries => c !== null);
}

export const READING_LINKS = {
  marvel: { name: "Marvel Unlimited", url: "https://www.marvel.com/unlimited" },
  dc: { name: "DC Universe Infinite", url: "https://www.dc.com/dcuniverseinfinite" },
} as const;
