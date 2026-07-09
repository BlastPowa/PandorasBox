export type Publisher = "marvel" | "dc" | "image" | "darkhorse" | "idw";

export interface ComicSeries {
  id: number;
  name: string;
  publisher: Publisher | "other";
  coverUrl: string | null;
  startYear: number | null;
  issueCount: number;
  synopsis: string | null;
  comicVineUrl: string;
}

export interface ComicCredit {
  id: number;
  name: string;
}

export interface ComicIssue {
  id: number;
  name: string | null;
  issueNumber: string | null;
  coverDate: string | null;
  coverUrl: string | null;
  comicVineUrl: string;
}

export interface ComicDetail extends ComicSeries {
  characters: ComicCredit[];
  people: ComicCredit[];
}

export const PUBLISHER_ID: Record<Publisher, number> = {
  marvel: 31,
  dc: 10,
  image: 513,
  darkhorse: 364,
  idw: 1190,
};

export const PUBLISHER_LABEL: Record<Publisher, string> = {
  marvel: "Marvel",
  dc: "DC",
  image: "Image",
  darkhorse: "Dark Horse",
  idw: "IDW",
};

export const PUBLISHERS = Object.keys(PUBLISHER_ID) as Publisher[];

export const READING_LINKS: Record<Publisher | "other", { name: string; url: string }> = {
  marvel: { name: "Marvel Unlimited", url: "https://www.marvel.com/unlimited" },
  dc: { name: "DC Universe Infinite", url: "https://www.dc.com/dcuniverseinfinite" },
  image: { name: "Image Comics", url: "https://imagecomics.com/comics/library" },
  darkhorse: { name: "Dark Horse Digital", url: "https://digital.darkhorse.com" },
  idw: { name: "IDW", url: "https://www.idwpublishing.com" },
  other: { name: "ComiXology", url: "https://www.comixology.com" },
};
