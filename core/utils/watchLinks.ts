export type SupportedSite =
  | "cinemaos"
  | "nepu"
  | "aniwave"
  | "mangadex"
  | "webtoon"
  | "mangaplus"
  | "tapas"
  | "crunchyroll"
  | "tubi";

export function getSiteSearchUrl(site: SupportedSite, title: string, id?: string): string {
  const encoded = encodeURIComponent(title);
  switch (site) {
    case "cinemaos":
      return `https://cinemaos.live/search?q=${encoded}`;
    case "nepu":
      return `https://nepu.to/search?q=${encoded}`;
    case "aniwave":
      return `https://aniwave.to/filter?keyword=${encoded}`;
    case "mangadex":
      return id ? `https://mangadex.org/title/${id}` : `https://mangadex.org/search?q=${encoded}`;
    case "webtoon":
      return `https://www.webtoons.com/en/search?keyword=${encoded}`;
    case "mangaplus":
      return `https://mangaplus.shueisha.co.jp/search_result?keyword=${encoded}`;
    case "tapas":
      return `https://tapas.io/search?q=${encoded}`;
    case "crunchyroll":
      return `https://www.crunchyroll.com/search?q=${encoded}`;
    case "tubi":
      return `https://tubitv.com/search/${encoded}`;
  }
}
