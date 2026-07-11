import type { UnifiedSearchResult } from "@core/utils/search";
import { getPosterUrl } from "@core/api/tmdb";

export interface FranchiseDef {
  slug: string;
  name: string;
  description: string;
  category: "Film saga" | "TV universe" | "World collection" | "Anime collection";
}

export const FRANCHISES: FranchiseDef[] = [
  { slug: "star-wars", name: "Star Wars", description: "Films from across the galaxy, ordered by release.", category: "Film saga" },
  { slug: "magical-fantasy", name: "Magical Fantasy", description: "Harry Potter, Narnia, Fantastic Beasts, Percy Jackson and Middle-earth.", category: "World collection" },
  { slug: "lord-of-the-rings", name: "Middle-earth", description: "The Lord of the Rings and Hobbit films in release order.", category: "Film saga" },
  { slug: "mcu", name: "Marvel Cinematic Universe", description: "Every available MCU film in release order.", category: "Film saga" },
  { slug: "dystopian", name: "Dystopian Worlds", description: "Movies and TV across broken societies, bleak futures and apocalyptic worlds.", category: "World collection" },
  { slug: "walking-dead", name: "The Walking Dead", description: "The original series and its connected television universe.", category: "TV universe" },
  { slug: "game-of-thrones", name: "Game of Thrones", description: "Westeros across Game of Thrones and its television successors.", category: "TV universe" },
  { slug: "star-trek", name: "Star Trek", description: "Major television series across generations.", category: "TV universe" },
  { slug: "jurassic", name: "Jurassic World", description: "The complete Jurassic Park and Jurassic World film saga.", category: "Film saga" },
  { slug: "matrix", name: "The Matrix", description: "Every film from the simulated world of The Matrix.", category: "Film saga" },
  { slug: "mission-impossible", name: "Mission: Impossible", description: "Ethan Hunt's missions in release order.", category: "Film saga" },
  { slug: "fast-furious", name: "Fast & Furious", description: "The complete high-speed film collection.", category: "Film saga" },
  { slug: "hunger-games", name: "The Hunger Games", description: "Panem's complete film story in release order.", category: "World collection" },
  { slug: "maze-runner", name: "The Maze Runner", description: "All films from the Maze Runner dystopian saga.", category: "World collection" },
  { slug: "pirates-caribbean", name: "Pirates of the Caribbean", description: "Every voyage with pirates, curses and lost treasure.", category: "Film saga" },
  { slug: "transformers", name: "Transformers", description: "Autobots and Decepticons across the film collection.", category: "Film saga" },
  { slug: "alien-adventures", name: "Alien Adventures", description: "Visitors, invasions and first contact—from E.T. to Men in Black and Alien.", category: "World collection" },
  { slug: "naruto-anime", name: "Naruto", description: "Naruto, Shippuden and Boruto continuations.", category: "Anime collection" },
  { slug: "dragon-ball-anime", name: "Dragon Ball", description: "Dragon Ball across Z, GT, Super and Daima.", category: "Anime collection" },
  { slug: "demon-slayer-anime", name: "Demon Slayer", description: "Every available animated Demon Slayer arc and season.", category: "Anime collection" },
  { slug: "jujutsu-kaisen-anime", name: "Jujutsu Kaisen", description: "The television seasons and animated movie.", category: "Anime collection" },
  { slug: "bleach-anime", name: "Bleach", description: "The original anime and Thousand-Year Blood War seasons.", category: "Anime collection" },
  { slug: "my-hero-anime", name: "My Hero Academia", description: "All available seasons and animated movies.", category: "Anime collection" },
  { slug: "supernatural-anime", name: "Supernatural Anime", description: "Safe supernatural adventures without adult or Ecchi results.", category: "Anime collection" },
];

export function getFranchise(slug: string): FranchiseDef | null {
  return FRANCHISES.find((f) => f.slug === slug) ?? null;
}

interface TMDBCollectionPart {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  release_date: string | null;
  vote_average: number;
  adult?: boolean;
}

async function fetchCollection(collectionId: number): Promise<UnifiedSearchResult[]> {
  const key = process.env.TMDB_API_KEY ?? "";
  if (!key) return [];
  try {
    const res = await fetch(`https://api.themoviedb.org/3/collection/${collectionId}?api_key=${key}`, {
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { parts?: TMDBCollectionPart[] };
    return toResults(json.parts ?? []);
  } catch {
    return [];
  }
}

async function fetchByCompanyChronological(companyId: number, limit = 40): Promise<UnifiedSearchResult[]> {
  const key = process.env.TMDB_API_KEY ?? "";
  if (!key) return [];
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/discover/movie?api_key=${key}&with_companies=${companyId}&include_adult=false&sort_by=release_date.asc&vote_count.gte=5&page=1`,
      { next: { revalidate: 60 * 60 * 24 } }
    );
    if (!res.ok) return [];
    const json = (await res.json()) as { results?: TMDBCollectionPart[] };
    return toResults((json.results ?? []).slice(0, limit));
  } catch {
    return [];
  }
}

interface TMDBDiscoverResult extends TMDBCollectionPart {
  name?: string;
  first_air_date?: string;
  popularity?: number;
}

/** Movies + TV matching dystopian/post-apocalyptic keywords, ranked by popularity (not chronological — this spans many unrelated stories). */
async function fetchDystopian(limit = 120): Promise<UnifiedSearchResult[]> {
  const key = process.env.TMDB_API_KEY ?? "";
  if (!key) return [];
  // TMDB keyword ids: 4565 = dystopia, 4458 = post-apocalyptic future.
  const keywords = "4565|4458";
  try {
    const requests = await Promise.all(["movie", "tv"].flatMap((kind) => [1, 2, 3].map(async (page) => { const response = await fetch(`https://api.themoviedb.org/3/discover/${kind}?api_key=${key}&with_keywords=${keywords}&include_adult=false&sort_by=primary_release_date.asc&vote_count.gte=10&page=${page}`, { next: { revalidate: 60 * 60 * 24 } }); const json = response.ok ? await response.json() as { results?: TMDBDiscoverResult[] } : { results: [] }; return { kind, results: json.results ?? [] }; })));
    const movies = requests.filter((row) => row.kind === "movie").flatMap((row) => row.results).filter((p) => !p.adult);
    const tv = requests.filter((row) => row.kind === "tv").flatMap((row) => row.results).filter((p) => !p.adult);
    const mapped: UnifiedSearchResult[] = [
      ...movies.map((p) => mapDiscoverResult(p, "movie")),
      ...tv.map((p) => mapDiscoverResult(p, "series")),
    ];
    return mapped
      .sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999))
      .slice(0, limit);
  } catch {
    return [];
  }
}

async function fetchTvQueries(queries: string[]): Promise<UnifiedSearchResult[]> {
  const key = process.env.TMDB_API_KEY ?? "";
  if (!key) return [];
  const rows = await Promise.all(queries.map(async (query) => {
    try {
      const response = await fetch(`https://api.themoviedb.org/3/search/tv?api_key=${key}&query=${encodeURIComponent(query)}&include_adult=false`, { next: { revalidate: 60 * 60 * 24 } });
      if (!response.ok) return null;
      const json = await response.json() as { results?: TMDBDiscoverResult[] };
      const match = (json.results ?? []).find((item) => item.name?.toLowerCase() === query.toLowerCase()) ?? json.results?.[0];
      return match ? mapDiscoverResult(match, "series") : null;
    } catch { return null; }
  }));
  return rows.filter((item): item is UnifiedSearchResult => item !== null).sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999));
}

async function fetchMovieQueries(queries: string[]): Promise<UnifiedSearchResult[]> {
  const key = process.env.TMDB_API_KEY ?? "";
  if (!key) return [];
  const rows = await Promise.all(queries.map(async (query) => { try { const response = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${key}&query=${encodeURIComponent(query)}&include_adult=false`, { next: { revalidate: 60 * 60 * 24 } }); if (!response.ok) return null; const json = await response.json() as { results?: TMDBDiscoverResult[] }; const match = (json.results ?? []).find((item) => item.title?.toLowerCase() === query.toLowerCase()) ?? json.results?.[0]; return match ? mapDiscoverResult(match, "movie") : null; } catch { return null; } }));
  return rows.filter((item): item is UnifiedSearchResult => item !== null).sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999));
}

async function fetchAnimeQueries(queries: string[]): Promise<UnifiedSearchResult[]> {
  const query = `query ($search: String) { Media(search: $search, type: ANIME, isAdult: false) { id title { english romaji } coverImage { large } bannerImage seasonYear averageScore episodes genres format description } }`;
  const rows = await Promise.all(queries.map(async (search) => { try { const response = await fetch("https://graphql.anilist.co", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query, variables: { search } }), next: { revalidate: 60 * 60 * 24 } }); if (!response.ok) return null; const json = await response.json() as { data?: { Media?: { id: number; title: { english?: string; romaji: string }; coverImage: { large: string }; bannerImage?: string; seasonYear?: number; averageScore?: number; episodes?: number; genres?: string[]; description?: string } } }; const media = json.data?.Media; if (!media || media.genres?.some((genre) => genre.toLowerCase() === "ecchi")) return null; return { id: `anilist-${media.id}`, source: "anilist" as const, type: "anime" as const, title: media.title.english ?? media.title.romaji, posterUrl: media.coverImage.large, backdropUrl: media.bannerImage ?? null, year: media.seasonYear ?? null, synopsis: media.description?.replace(/<[^>]+>/g, "") ?? null, score: media.averageScore ? media.averageScore / 10 : null, totalEpisodes: media.episodes ?? null, totalChapters: null, anilistId: media.id, tmdbId: null, mangadexId: null, malId: null } satisfies UnifiedSearchResult; } catch { return null; } }));
  const seen = new Set<string>();
  const valid = rows.filter((item) => item !== null) as UnifiedSearchResult[];
  return valid.filter((item) => !seen.has(item.id) && seen.add(item.id)).sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999));
}

export async function getMagicalFantasyGroups() {
  const definitions = [{ title: "Harry Potter", id: 1241 }, { title: "Fantastic Beasts", id: 435259 }, { title: "The Chronicles of Narnia", id: 420 }, { title: "Percy Jackson", id: 179919 }, { title: "Middle-earth", id: 119 }];
  const sagaGroups = await Promise.all(definitions.map(async (group) => ({ title: group.title, items: await fetchCollection(group.id) })));
  const [sorcery, animation, television] = await Promise.all([
    fetchMovieQueries(["The Sorcerer's Apprentice", "Willow", "Stardust", "The Golden Compass", "The Last Witch Hunter", "Warcraft", "Dungeons & Dragons: Honor Among Thieves", "The Kid Who Would Be King"]),
    fetchMovieQueries(["Onward", "Raya and the Last Dragon", "Kubo and the Two Strings", "The Book of Life", "Howl's Moving Castle", "The Sea Beast", "Nimona"]),
    fetchTvQueries(["Merlin", "Once Upon a Time", "The Magicians", "The Wheel of Time", "Shadow and Bone", "The Dragon Prince", "The Owl House"]),
  ]);
  const groups = [...sagaGroups, { title: "Magic & Sorcery", items: sorcery }, { title: "Animated Magical Worlds", items: animation }, { title: "Magical TV Series", items: television }];
  return groups.filter((group) => group.items.length > 0);
}

function mapDiscoverResult(p: TMDBDiscoverResult, type: "movie" | "series"): UnifiedSearchResult {
  const date = p.release_date ?? p.first_air_date ?? null;
  return {
    id: `tmdb-${p.id}`,
    source: "tmdb",
    type,
    title: p.title ?? p.name ?? "Untitled",
    posterUrl: p.poster_path ? getPosterUrl(p.poster_path) : null,
    year: date ? Number.parseInt(date.slice(0, 4), 10) || null : null,
    synopsis: p.overview || null,
    score: p.vote_average > 0 ? p.vote_average : null,
    totalEpisodes: null,
    totalChapters: null,
    anilistId: null,
    tmdbId: p.id,
    mangadexId: null,
    malId: null,
  };
}

function toResults(parts: TMDBCollectionPart[]): UnifiedSearchResult[] {
  return parts
    .filter((p) => !p.adult)
    .sort((a, b) => new Date(a.release_date ?? "9999").getTime() - new Date(b.release_date ?? "9999").getTime())
    .map((p) => ({
      id: `tmdb-${p.id}`,
      source: "tmdb" as const,
      type: "movie" as const,
      title: p.title,
      posterUrl: p.poster_path ? getPosterUrl(p.poster_path) : null,
      year: p.release_date ? Number.parseInt(p.release_date.slice(0, 4), 10) || null : null,
      synopsis: p.overview || null,
      score: p.vote_average > 0 ? p.vote_average : null,
      totalEpisodes: null,
      totalChapters: null,
      anilistId: null,
      tmdbId: p.id,
      mangadexId: null,
      malId: null,
    }));
}

// TMDB collection ids: Star Wars = 10, Harry Potter = 1241, LOTR = 119.
// MCU has no single TMDB collection, so it's built from Marvel Studios (company 420),
// chronological = release order.
export async function getFranchiseItems(slug: string): Promise<UnifiedSearchResult[]> {
  switch (slug) {
    case "star-wars":
      return fetchCollection(10);
    case "harry-potter":
      return fetchCollection(1241);
    case "magical-fantasy":
      return (await getMagicalFantasyGroups()).flatMap((group) => group.items);
    case "lord-of-the-rings":
      return fetchCollection(119);
    case "mcu":
      return fetchByCompanyChronological(420);
    case "dystopian":
      return fetchDystopian();
    case "jurassic": return fetchCollection(328);
    case "matrix": return fetchCollection(2344);
    case "mission-impossible": return fetchCollection(87359);
    case "fast-furious": return fetchCollection(9485);
    case "hunger-games": return fetchCollection(131635);
    case "maze-runner": return fetchCollection(295130);
    case "pirates-caribbean": return fetchCollection(295);
    case "transformers": return fetchCollection(8650);
    case "alien-adventures": {
      const [menInBlack, alien, standalone] = await Promise.all([fetchCollection(86055), fetchCollection(8091), fetchMovieQueries(["E.T. the Extra-Terrestrial", "Earth to Echo", "The Great Wall", "Arrival", "District 9", "Super 8", "The Day the Earth Stood Still", "Close Encounters of the Third Kind"])]);
      const seen = new Set<string>();
      return [...menInBlack, ...alien, ...standalone].filter((item) => !seen.has(item.id) && seen.add(item.id)).sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999));
    }
    case "naruto-anime": return fetchAnimeQueries(["Naruto", "Naruto: Shippuden", "Boruto: Naruto Next Generations"]);
    case "dragon-ball-anime": return fetchAnimeQueries(["Dragon Ball", "Dragon Ball Z", "Dragon Ball GT", "Dragon Ball Super", "Dragon Ball Daima"]);
    case "demon-slayer-anime": return fetchAnimeQueries(["Demon Slayer: Kimetsu no Yaiba", "Demon Slayer: Mugen Train", "Demon Slayer: Entertainment District Arc", "Demon Slayer: Swordsmith Village Arc", "Demon Slayer: Hashira Training Arc"]);
    case "jujutsu-kaisen-anime": return fetchAnimeQueries(["Jujutsu Kaisen", "Jujutsu Kaisen 0", "Jujutsu Kaisen 2nd Season"]);
    case "bleach-anime": return fetchAnimeQueries(["Bleach", "Bleach: Thousand-Year Blood War", "Bleach: Thousand-Year Blood War - The Separation", "Bleach: Thousand-Year Blood War - The Conflict"]);
    case "my-hero-anime": return fetchAnimeQueries(["My Hero Academia", "My Hero Academia 2", "My Hero Academia 3", "My Hero Academia 4", "My Hero Academia 5", "My Hero Academia 6", "My Hero Academia 7"]);
    case "supernatural-anime": return fetchAnimeQueries(["Mob Psycho 100", "Blue Exorcist", "Noragami", "Inuyasha", "Shaman King", "Natsume's Book of Friends", "Yu Yu Hakusho", "Soul Eater"]);
    case "walking-dead":
      return fetchTvQueries(["The Walking Dead", "Fear the Walking Dead", "The Walking Dead: World Beyond", "Tales of the Walking Dead", "The Walking Dead: Dead City", "The Walking Dead: Daryl Dixon", "The Walking Dead: The Ones Who Live"]);
    case "game-of-thrones":
      return fetchTvQueries(["Game of Thrones", "House of the Dragon", "A Knight of the Seven Kingdoms"]);
    case "star-trek":
      return fetchTvQueries(["Star Trek", "Star Trek: The Next Generation", "Star Trek: Deep Space Nine", "Star Trek: Voyager", "Star Trek: Enterprise", "Star Trek: Discovery", "Star Trek: Picard", "Star Trek: Strange New Worlds", "Star Trek: Lower Decks", "Star Trek: Prodigy"]);
    default:
      return [];
  }
}
