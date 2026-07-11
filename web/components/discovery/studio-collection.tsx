"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { UnifiedSearchResult } from "@core/utils/search";
import { PosterGrid } from "./poster-row";
import { EmptyState } from "@/components/ui-fx/feedback";
import { SearchInput } from "@/components/ui-fx/input";
import { cn } from "@/lib/utils";

type Studio = "marvel" | "disney";
type Order = "popular" | "timeline" | "oldest" | "newest";
const MARVEL_CATEGORIES = ["All", "X-Men", "Avengers", "Spider-Man", "Thor", "Doctor Strange"] as const;
const DISNEY_CATEGORIES = ["All", "Animation", "Pixar", "Disney Channel", "Princesses", "Live Action"] as const;
const MCU_TIMELINE = ["captain america: the first avenger", "captain marvel", "iron man", "iron man 2", "the incredible hulk", "thor", "the avengers", "iron man 3", "thor: the dark world", "captain america: the winter soldier", "guardians of the galaxy", "avengers: age of ultron", "ant-man", "captain america: civil war", "black widow", "black panther", "spider-man: homecoming", "doctor strange", "thor: ragnarok", "avengers: infinity war", "avengers: endgame", "loki", "wandavision", "the falcon and the winter soldier", "shang-chi", "eternals", "spider-man: no way home", "doctor strange in the multiverse of madness", "black panther: wakanda forever"];

function text(item: UnifiedSearchResult) { return `${item.title} ${item.synopsis ?? ""}`.toLowerCase(); }
function contains(item: UnifiedSearchResult, terms: string[]) { const value = text(item); return terms.some((term) => value.includes(term)); }

export function StudioCollection({ studio, items }: { studio: Studio; items: UnifiedSearchResult[] }) {
  const categories = studio === "marvel" ? MARVEL_CATEGORIES : DISNEY_CATEGORIES;
  const [category, setCategory] = useState<string>("All");
  const [order, setOrder] = useState<Order>("popular");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    let list = [...items];
    if (query.trim()) list = list.filter((item) => text(item).includes(query.trim().toLowerCase()));
    if (studio === "marvel" && category !== "All") list = list.filter((item) => contains(item, category === "X-Men" ? ["x-men", "wolverine", "deadpool", "mutant"] : category === "Spider-Man" ? ["spider-man", "spider man", "venom", "miles morales"] : [category.toLowerCase()]));
    if (studio === "disney" && category !== "All") {
      if (category === "Animation") list = list.filter((item) => contains(item, ["animated", "animation"]) || item.type === "series");
      else if (category === "Pixar") list = list.filter((item) => contains(item, ["toy story", "incredibles", "cars", "monsters", "finding", "inside out", "coco", "lightyear", "elemental", "pixar"]));
      else if (category === "Disney Channel") list = list.filter((item) => item.type === "series" || contains(item, ["high school musical", "descendants", "camp rock", "zombies"]));
      else if (category === "Princesses") list = list.filter((item) => contains(item, ["princess", "cinderella", "frozen", "moana", "mulan", "mermaid", "beauty and the beast", "tangled", "pocahontas", "aladdin"]));
      else if (category === "Live Action") list = list.filter((item) => !contains(item, ["animated", "animation", "pixar"]));
    }
    if (order === "oldest") list.sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999));
    if (order === "newest") list.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
    if (order === "timeline" && studio === "marvel") list = list.filter((item) => MCU_TIMELINE.includes(item.title.toLowerCase())).sort((a, b) => MCU_TIMELINE.indexOf(a.title.toLowerCase()) - MCU_TIMELINE.indexOf(b.title.toLowerCase()));
    return list;
  }, [category, items, order, query, studio]);

  return <div className="space-y-5"><div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--glass)] p-3"><div className="flex flex-col gap-3 lg:flex-row"><SearchInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${studio === "marvel" ? "Marvel" : "Disney"} movies and TV…`} aria-label={`Search ${studio} collection`} icon={<Search className="size-4" />} className="lg:w-80" /><select value={order} onChange={(event) => setOrder(event.target.value as Order)} aria-label="Collection order" className="h-11 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-4 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"><option value="popular">Popular first</option>{studio === "marvel" && <option value="timeline">MCU timeline order</option>}<option value="oldest">Release date: oldest</option><option value="newest">Release date: newest</option></select></div><div className="mt-3 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">{categories.map((option) => <button key={option} type="button" onClick={() => setCategory(option)} aria-pressed={category === option} className={cn("h-9 shrink-0 rounded-full border px-4 text-xs font-bold transition", category === option ? "border-[var(--accent)] bg-[var(--accent)] text-[#08090d]" : "border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-secondary)]")}>{option}</button>)}</div></div>{visible.length > 0 ? <PosterGrid items={visible} /> : <EmptyState title="No matching titles" description="Try another search, category, or ordering option." />}</div>;
}
