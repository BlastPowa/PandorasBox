import type { TMDBWatchProviders } from "./tmdb";
import type { ReelItemType } from "../storage/schema";

export interface WatchOption {
  name: string;
  url: string;
  type: "subscription" | "rent" | "buy" | "free" | "reading";
  logoUrl: string | null;
  isPaid: boolean;
}

function freeLink(name: string, url: string): WatchOption {
  return {
    name,
    url,
    type: "free",
    logoUrl: null,
    isPaid: false,
  };
}

function dedupeWatchOptions(options: WatchOption[]): WatchOption[] {
  const seen = new Set<string>();
  return options.filter((option) => {
    const key = `${option.name.toLowerCase()}|${option.url.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildOpenMediaLinks(title: string): WatchOption[] {
  const encoded = encodeURIComponent(title);
  return [
    freeLink("Internet Archive", `https://archive.org/search?query=${encoded}`),
    freeLink("PeerTube / SepiaSearch", `https://sepiasearch.org/search?search=${encoded}`),
    freeLink("YouTube", `https://www.youtube.com/results?search_query=${encoded}`),
  ];
}

function buildInternationalFreeLinks(title: string): WatchOption[] {
  const encoded = encodeURIComponent(title);
  return [
    freeLink("Plex Free Movies & TV", `https://watch.plex.tv/search?q=${encoded}`),
    freeLink("Pluto TV", "https://pluto.tv/"),
    freeLink("Rakuten TV Free", `https://www.rakuten.tv/ie/search?q=${encoded}`),
    freeLink("Filmzie", "https://filmzie.com/"),
    freeLink("Runtime", "https://www.runtime.tv/"),
    freeLink("DistroTV", "https://www.distro.tv/"),
    freeLink("Fawesome", "https://fawesome.tv/"),
    freeLink("FilmRise", "https://filmrise.com/"),
    freeLink("Samsung TV Plus", "https://www.samsungtvplus.com/"),
    freeLink("Tubi", `https://tubitv.com/search/${encoded}`),
    freeLink("The Roku Channel", "https://therokuchannel.roku.com/"),
    freeLink("Kanopy", "https://www.kanopy.com/"),
    freeLink("Hoopla", "https://www.hoopladigital.com/"),
  ];
}

function buildIrelandFreeLinks(): WatchOption[] {
  return [
    freeLink("RTÉ Player", "https://www.rte.ie/player/"),
    freeLink("Virgin Media Play", "https://www.virginmediatelevision.ie/player/"),
    freeLink("TG4 Player", "https://www.tg4.ie/en/player/"),
    freeLink("ARTE", "https://www.arte.tv/en/"),
    freeLink("TV5MONDEplus", "https://www.tv5mondeplus.com/"),
  ];
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
  return dedupeWatchOptions([
    ...buildInternationalFreeLinks(title),
    ...buildIrelandFreeLinks(),
    ...buildOpenMediaLinks(title),
  ]);
}

export function buildFreeSeriesLinks(title: string): WatchOption[] {
  const encoded = encodeURIComponent(title);
  return dedupeWatchOptions([
    ...buildInternationalFreeLinks(title),
    ...buildIrelandFreeLinks(),
    freeLink("iQIYI", `https://www.iq.com/search?query=${encoded}`),
    freeLink("Viki", `https://www.viki.com/search?q=${encoded}`),
    ...buildOpenMediaLinks(title),
  ]);
}

export function buildFreeAnimeLinks(title: string): WatchOption[] {
  const encoded = encodeURIComponent(title);
  return dedupeWatchOptions([
    freeLink("iQIYI", `https://www.iq.com/search?query=${encoded}`),
    freeLink("Viki", `https://www.viki.com/search?q=${encoded}`),
    ...buildInternationalFreeLinks(title),
    ...buildOpenMediaLinks(title),
  ]);
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
  type: ReelItemType;
  title: string;
  tmdbProviders?: TMDBWatchProviders | null;
  mangaDexId?: string;
}): WatchOption[] {
  const { type, title, tmdbProviders, mangaDexId } = params;
  if (type === "manga" || type === "manhwa" || type === "comic") {
    return buildMangaReadLinks(title, mangaDexId);
  }

  const options: WatchOption[] = [];
  if (tmdbProviders) {
    options.push(...buildTMDBWatchOptions(tmdbProviders, title));
  }

  if (type === "anime") {
    options.push(...buildFreeAnimeLinks(title));
  } else if (type === "series") {
    options.push(...buildFreeSeriesLinks(title));
  } else {
    options.push(...buildFreeMovieLinks(title));
  }

  return dedupeWatchOptions(options);
}
