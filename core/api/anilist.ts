const ANILIST_BASE_URL = "https://graphql.anilist.co";

export interface AniListMedia {
  id: number;
  idMal: number | null;
  title: {
    romaji: string;
    english: string | null;
    native: string;
  };
  description: string | null;
  coverImage: {
    large: string;
    extraLarge: string;
    color: string | null;
  };
  bannerImage: string | null;
  episodes: number | null;
  chapters: number | null;
  volumes: number | null;
  status: string;
  averageScore: number | null;
  genres: string[];
  format: string;
  season: string | null;
  seasonYear: number | null;
  studios: {
    nodes: {
      name: string;
      isAnimationStudio: boolean;
    }[];
  };
  relations: {
    edges: {
      relationType: string;
      node: {
        id: number;
        title: { romaji: string };
        format: string;
        coverImage: { large: string };
      };
    }[];
  };
  nextAiringEpisode: {
    airingAt: number;
    episode: number;
  } | null;
  siteUrl: string;
}

const MEDIA_FIELDS = `
  id
  idMal
  title {
    romaji
    english
    native
  }
  description
  coverImage {
    large
    extraLarge
    color
  }
  bannerImage
  episodes
  chapters
  volumes
  status
  averageScore
  genres
  format
  season
  seasonYear
  studios {
    nodes {
      name
      isAnimationStudio
    }
  }
  relations {
    edges {
      relationType
      node {
        id
        title {
          romaji
        }
        format
        coverImage {
          large
        }
      }
    }
  }
  nextAiringEpisode {
    airingAt
    episode
  }
  siteUrl
`;

interface AniListGraphQLError {
  message: string;
}

async function aniListRequest<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  try {
    const response = await fetch(ANILIST_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`AniList request failed with status ${response.status}`);
    }
    const payload = (await response.json()) as {
      data: T | null;
      errors?: AniListGraphQLError[];
    };
    if (payload.errors && payload.errors.length > 0) {
      throw new Error(`AniList GraphQL error: ${payload.errors.map((e) => e.message).join("; ")}`);
    }
    if (payload.data === null) {
      throw new Error("AniList returned no data");
    }
    return payload.data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`AniList request error: ${error.message}`);
    }
    throw new Error("AniList request error: unknown error");
  }
}

export async function searchAniList(query: string, type?: "ANIME" | "MANGA"): Promise<AniListMedia[]> {
  const gqlQuery = `
    query ($search: String, $type: MediaType) {
      Page(page: 1, perPage: 10) {
        media(search: $search, type: $type, isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const variables: Record<string, unknown> = { search: query };
  if (type !== undefined) {
    variables.type = type;
  }
  const data = await aniListRequest<{ Page: { media: AniListMedia[] } }>(gqlQuery, variables);
  return data.Page.media;
}

export async function getAniListMedia(id: number): Promise<AniListMedia> {
  const gqlQuery = `
    query ($id: Int) {
      Media(id: $id) {
        ${MEDIA_FIELDS}
      }
    }
  `;
  const data = await aniListRequest<{ Media: AniListMedia }>(gqlQuery, { id });
  return data.Media;
}

export async function getAniListMediaByMalId(malId: number): Promise<AniListMedia | null> {
  const gqlQuery = `
    query ($idMal: Int) {
      Media(idMal: $idMal) {
        ${MEDIA_FIELDS}
      }
    }
  `;
  try {
    const data = await aniListRequest<{ Media: AniListMedia | null }>(gqlQuery, { idMal: malId });
    return data.Media;
  } catch (error) {
    if (error instanceof Error && error.message.includes("Not Found")) {
      return null;
    }
    throw error;
  }
}

export async function getAiringSchedule(
  mediaId: number
): Promise<{ airingAt: number; episode: number } | null> {
  const gqlQuery = `
    query ($id: Int) {
      Media(id: $id) {
        nextAiringEpisode {
          airingAt
          episode
        }
      }
    }
  `;
  const data = await aniListRequest<{
    Media: { nextAiringEpisode: { airingAt: number; episode: number } | null };
  }>(gqlQuery, { id: mediaId });
  return data.Media.nextAiringEpisode;
}

export function formatAniListDescription(description: string): string {
  return description
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?[a-zA-Z][^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
