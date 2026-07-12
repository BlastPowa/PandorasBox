import "server-only";
import {
  PUBLISHER_ID,
  type Publisher,
  type ComicSeries,
  type ComicDetail,
  type ComicIssue,
} from "./comics-shared";

export * from "./comics-shared";

interface ComicVineVolume {
  id: number;
  name: string;
  start_year: string | null;
  count_of_issues: number;
  description: string | null;
  site_detail_url?: string;
  image?: { medium_url: string | null };
  publisher?: { id: number; name: string };
}

const ID_TO_PUBLISHER: Record<number, Publisher> = Object.fromEntries(
  Object.entries(PUBLISHER_ID).map(([k, v]) => [v, k as Publisher])
) as Record<number, Publisher>;

const CURATED: Record<Publisher, string[]> = {
  marvel: [
    "The Amazing Spider-Man", "Uncanny X-Men", "Avengers", "Fantastic Four",
    "Invincible Iron Man", "Captain America", "The Mighty Thor", "Wolverine",
    "Daredevil", "Guardians of the Galaxy", "Black Panther", "Ms. Marvel",
    "Deadpool", "Venom", "The Incredible Hulk", "Doctor Strange", "Silver Surfer",
    "Moon Knight", "Punisher", "X-Force", "New Mutants", "Ghost Rider",
  ],
  dc: [
    "Batman", "Superman", "Wonder Woman", "The Flash", "Green Lantern",
    "Justice League", "Aquaman", "Teen Titans", "Watchmen", "Green Arrow",
    "Suicide Squad", "Nightwing", "Shazam!", "Harley Quinn", "The Sandman",
    "Detective Comics", "Batgirl", "Swamp Thing", "Hawkman", "Constantine",
    "Catwoman", "Doom Patrol",
  ],
  image: [
    "The Walking Dead", "Invincible", "Saga", "Spawn", "Paper Girls",
    "Chew", "Descender", "Monstress", "Deadly Class", "The Wicked + The Divine",
    "East of West", "Nailbiter", "Gideon Falls", "Rat Queens", "Sex Criminals",
    "Black Science",
  ],
  darkhorse: [
    "Hellboy", "Sin City", "The Umbrella Academy", "B.P.R.D.", "300",
    "Buffy the Vampire Slayer", "The Mask", "Aliens", "Predator", "Star Wars",
    "Grendel", "Concrete", "The Goon", "Usagi Yojimbo",
  ],
  idw: [
    "Teenage Mutant Ninja Turtles", "Transformers", "Locke & Key", "30 Days of Night",
    "G.I. Joe", "My Little Pony: Friendship Is Magic", "Star Trek", "Ghostbusters",
    "Sonic the Hedgehog", "Godzilla", "Judge Dredd", "The Crow",
  ],
};

const UA = "PandorasBox/1.0 (https://pandoras-box-tau.vercel.app)";
const DAY = 60 * 60 * 24;

function stripHtml(html: string | null): string | null {
  if (!html) return null;
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > 0 ? text.slice(0, 500) : null;
}

function cvUrl(path: string, params: Record<string, string>): string | null {
  const key = process.env.COMICVINE_API_KEY ?? "";
  if (!key) return null;
  const search = new URLSearchParams({ api_key: key, format: "json", ...params });
  return `https://comicvine.gamespot.com/api/${path}/?${search.toString()}`;
}

function mapVolume(v: ComicVineVolume, publisher: Publisher | "other"): ComicSeries {
  return {
    id: v.id,
    name: v.name,
    publisher,
    coverUrl: v.image?.medium_url ?? null,
    startYear: v.start_year ? Number.parseInt(v.start_year, 10) || null : null,
    issueCount: v.count_of_issues ?? 0,
    synopsis: stripHtml(v.description ?? null),
    comicVineUrl: v.site_detail_url ?? `https://comicvine.gamespot.com/volume/4050-${v.id}/`,
  };
}

const VOLUME_FIELDS = "id,name,start_year,count_of_issues,image,publisher,description,site_detail_url";

async function fetchSeries(query: string, publisher: Publisher): Promise<ComicSeries | null> {
  const url = cvUrl("search", {
    resources: "volume",
    query,
    limit: "8",
    field_list: VOLUME_FIELDS,
  });
  if (!url) return null;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, next: { revalidate: DAY } });
    if (!res.ok) return null;
    const json = (await res.json()) as { results?: ComicVineVolume[] };
    const candidates = (json.results ?? []).filter((r) => r.publisher?.id === PUBLISHER_ID[publisher]);
    if (candidates.length === 0) return null;
    const match = candidates.reduce((best, c) => (c.count_of_issues > best.count_of_issues ? c : best));
    return mapVolume(match, publisher);
  } catch {
    return null;
  }
}

export async function getComics(publisher: Publisher): Promise<ComicSeries[]> {
  const url = cvUrl("volumes", {
    filter: `publisher:${PUBLISHER_ID[publisher]}`,
    sort: "start_year:desc",
    limit: "100",
    field_list: VOLUME_FIELDS,
  });
  if (url) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA }, next: { revalidate: DAY } });
      if (res.ok) {
        const json = (await res.json()) as { results?: ComicVineVolume[] };
        const seen = new Set<number>();
        const catalog = (json.results ?? [])
          .filter((volume) => volume.count_of_issues > 0 && !seen.has(volume.id) && seen.add(volume.id))
          .map((volume) => mapVolume(volume, publisher));
        if (catalog.length > 0) return catalog;
      }
    } catch {
      // Preserve the curated fallback when Comic Vine's catalog endpoint fails.
    }
  }
  const results = await Promise.all(CURATED[publisher].map((name) => fetchSeries(name, publisher)));
  return results.filter((comic): comic is ComicSeries => comic !== null);
}

/** Free-text search across Comic Vine volumes, newest/most-issued first. */
export async function searchComics(query: string): Promise<ComicSeries[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const url = cvUrl("search", {
    resources: "volume",
    query: trimmed,
    limit: "100",
    field_list: VOLUME_FIELDS,
  });
  if (!url) return [];
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, next: { revalidate: 60 * 60 } });
    if (!res.ok) return [];
    const json = (await res.json()) as { results?: ComicVineVolume[] };
    return (json.results ?? [])
      .filter((v) => v.count_of_issues > 0)
      .sort((a, b) => b.count_of_issues - a.count_of_issues)
      .slice(0, 75)
      .map((v) => {
        const pub = v.publisher ? ID_TO_PUBLISHER[v.publisher.id] : undefined;
        return mapVolume(v, pub ?? "other");
      });
  } catch {
    return [];
  }
}

// ---------- Series detail ----------

interface ComicVineVolumeDetail extends ComicVineVolume {
  characters?: { id: number; name: string; count?: number }[];
  people?: { id: number; name: string }[];
}

export async function getComicDetail(id: number): Promise<ComicDetail | null> {
  const url = cvUrl(`volume/4050-${id}`, {
    field_list: `${VOLUME_FIELDS},characters,people`,
  });
  if (!url) return null;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, next: { revalidate: DAY } });
    if (!res.ok) return null;
    const json = (await res.json()) as { results?: ComicVineVolumeDetail };
    const v = json.results;
    if (!v || !v.id) return null;
    const pub = v.publisher ? ID_TO_PUBLISHER[v.publisher.id] : undefined;
    const base = mapVolume(v, pub ?? "other");

    const characters = (v.characters ?? [])
      .slice()
      .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
      .slice(0, 18)
      .map((c) => ({ id: c.id, name: c.name }));
    const people = (v.people ?? []).slice(0, 12).map((p) => ({ id: p.id, name: p.name }));

    return { ...base, characters, people };
  } catch {
    return null;
  }
}

interface ComicVineIssue {
  id: number;
  name: string | null;
  issue_number: string | null;
  cover_date: string | null;
  image?: { medium_url: string | null };
  site_detail_url?: string;
}

/** Ordered issue catalog for a series, oldest first, capped for exceptionally long-running volumes. */
export async function getComicIssues(volumeId: number): Promise<ComicIssue[]> {
  const fields = "id,name,issue_number,cover_date,image,site_detail_url";
  const buildUrl = (offset: number) => cvUrl("issues", {
    filter: `volume:${volumeId}`,
    sort: "cover_date:asc",
    limit: "100",
    offset: String(offset),
    field_list: fields,
  });
  const firstUrl = buildUrl(0);
  if (!firstUrl) return [];
  try {
    const res = await fetch(firstUrl, { headers: { "User-Agent": UA }, next: { revalidate: DAY } });
    if (!res.ok) return [];
    const first = (await res.json()) as { results?: ComicVineIssue[]; number_of_total_results?: number };
    const total = Math.min(first.number_of_total_results ?? first.results?.length ?? 0, 1000);
    const offsets = Array.from({ length: Math.max(0, Math.ceil(total / 100) - 1) }, (_, index) => (index + 1) * 100);
    const additional = await Promise.all(offsets.map(async (offset) => {
      const url = buildUrl(offset);
      if (!url) return [];
      const page = await fetch(url, { headers: { "User-Agent": UA }, next: { revalidate: DAY } });
      if (!page.ok) return [];
      const json = (await page.json()) as { results?: ComicVineIssue[] };
      return json.results ?? [];
    }));
    const seen = new Set<number>();
    const issues = [...(first.results ?? []), ...additional.flat()]
      .filter((issue) => !seen.has(issue.id) && seen.add(issue.id))
      .sort((a, b) => {
        const byDate = (a.cover_date ?? "9999-12-31").localeCompare(b.cover_date ?? "9999-12-31");
        if (byDate !== 0) return byDate;
        return (Number.parseFloat(a.issue_number ?? "") || Number.MAX_SAFE_INTEGER) - (Number.parseFloat(b.issue_number ?? "") || Number.MAX_SAFE_INTEGER);
      });
    return issues.map((i) => ({
      id: i.id,
      name: i.name,
      issueNumber: i.issue_number,
      coverDate: i.cover_date,
      coverUrl: i.image?.medium_url ?? null,
      comicVineUrl: i.site_detail_url ?? `https://comicvine.gamespot.com/issue/4000-${i.id}/`,
    }));
  } catch {
    return [];
  }
}
