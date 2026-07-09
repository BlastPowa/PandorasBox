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
  const results = await Promise.all(CURATED[publisher].map((n) => fetchSeries(n, publisher)));
  return results.filter((c): c is ComicSeries => c !== null);
}

/** Free-text search across Comic Vine volumes, newest/most-issued first. */
export async function searchComics(query: string): Promise<ComicSeries[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const url = cvUrl("search", {
    resources: "volume",
    query: trimmed,
    limit: "40",
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
      .slice(0, 30)
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

/** Recent issues for a series, newest first. */
export async function getComicIssues(volumeId: number): Promise<ComicIssue[]> {
  const url = cvUrl("issues", {
    filter: `volume:${volumeId}`,
    sort: "cover_date:desc",
    limit: "24",
    field_list: "id,name,issue_number,cover_date,image,site_detail_url",
  });
  if (!url) return [];
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, next: { revalidate: DAY } });
    if (!res.ok) return [];
    const json = (await res.json()) as { results?: ComicVineIssue[] };
    return (json.results ?? []).map((i) => ({
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
