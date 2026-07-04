import type { TMDBWatchProviders } from "./tmdb";

export interface WatchOption {
  name: string;
  url: string;
  type: "subscription" | "rent" | "buy" | "free" | "reading";
  logoUrl: string | null;
  isPaid: boolean;
}

export function buildTMDBWatchOptions(providers: TMDBWatchProviders, title: string): WatchOption[] {
  const options: WatchOption[] = [];
  for (const provider of providers.flatrate ?? []) {
    options.push({
      name: provider.provider_name,
      url: providers.link,
      type: "subscription",
      logoUrl: `https://image.tmdb.org/t/p/original${provider.logo_path}`,
      isPaid: true,
    });
  }
  for (const provider of providers.rent ?? []) {
    options.push({
      name: provider.provider_name,
      url: providers.link,
      type: "rent",
      logoUrl: `https://image.tmdb.org/t/p/original${provider.logo_path}`,
      isPaid: true,
    });
  }
  for (const provider of providers.buy ?? []) {
    options.push({
      name: provider.provider_name,
      url: providers.link,
      type: "buy",
      logoUrl: `https://image.tmdb.org/t/p/original${provider.logo_path}`,
      isPaid: true,
    });
  }
  return options;
}

export function buildFreeMovieLinks(title: string): WatchOption[] {
  const encoded = encodeURIComponent(title);
  return [
    {
      name: "CinemaOS",
      url: `https://cinemaos.live/search?q=${encoded}`,
      type: "free",
      logoUrl: null,
      isPaid: false,
    },
    {
      name: "Nepu",
      url: `https://nepu.to/search?q=${encoded}`,
      type: "free",
      logoUrl: null,
      isPaid: false,
    },
  ];
}

export function buildFreeAnimeLinks(title: string): WatchOption[] {
  const encoded = encodeURIComponent(title);
  return [
    {
      name: "CinemaOS",
      url: `https://cinemaos.live/search?q=${encoded}`,
      type: "free",
      logoUrl: null,
      isPaid: false,
    },
    {
      name: "Nepu",
      url: `https://nepu.to/search?q=${encoded}`,
      type: "free",
      logoUrl: null,
      isPaid: false,
    },
    {
      name: "Aniwave",
      url: `https://aniwave.to/filter?keyword=${encoded}`,
      type: "free",
      logoUrl: null,
      isPaid: false,
    },
    {
      name: "Crunchyroll",
      url: `https://www.crunchyroll.com/search?q=${encoded}`,
      type: "free",
      logoUrl: null,
      isPaid: false,
    },
  ];
}

export function buildMangaReadLinks(title: string, mangaDexId?: string): WatchOption[] {
  const encoded = encodeURIComponent(title);
  return [
    {
      name: "MangaDex",
      url: mangaDexId
        ? `https://mangadex.org/title/${mangaDexId}`
        : `https://mangadex.org/search?q=${encoded}`,
      type: "reading",
      logoUrl: null,
      isPaid: false,
    },
    {
      name: "MangaPlus",
      url: `https://mangaplus.shueisha.co.jp/search_result?keyword=${encoded}`,
      type: "reading",
      logoUrl: null,
      isPaid: false,
    },
    {
      name: "Webtoon",
      url: `https://www.webtoons.com/en/search?keyword=${encoded}`,
      type: "reading",
      logoUrl: null,
      isPaid: false,
    },
    {
      name: "Tapas",
      url: `https://tapas.io/search?q=${encoded}`,
      type: "reading",
      logoUrl: null,
      isPaid: false,
    },
  ];
}

export function getAllWatchOptions(params: {
  type: "movie" | "series" | "anime" | "manga" | "manhwa";
  title: string;
  tmdbProviders?: TMDBWatchProviders | null;
  mangaDexId?: string;
}): WatchOption[] {
  const { type, title, tmdbProviders, mangaDexId } = params;
  if (type === "manga" || type === "manhwa") {
    return buildMangaReadLinks(title, mangaDexId);
  }
  const options: WatchOption[] = [];
  if (tmdbProviders) {
    options.push(...buildTMDBWatchOptions(tmdbProviders, title));
  }
  if (type === "anime") {
    options.push(...buildFreeAnimeLinks(title));
  } else {
    options.push(...buildFreeMovieLinks(title));
  }
  return options;
}
