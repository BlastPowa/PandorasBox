"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Briefcase, Cake, Clapperboard, Film, Link2, MapPin, Search, Star, Tv } from "lucide-react";
import type { PersonDetail, PersonCredit } from "@/lib/person";
import { Pill, TypeBadge } from "@/components/ui-fx/badge";
import { EmptyState } from "@/components/ui-fx/feedback";
import { ExpandableText } from "@/components/detail/expandable-text";
import { BackButton } from "@/components/shell/back-button";

type SortKey = "popularity" | "date" | "rating" | "az";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "popularity", label: "Popularity" },
  { key: "date", label: "Release Date" },
  { key: "rating", label: "Rating" },
  { key: "az", label: "Alphabetical" },
];

function age(birthday: string | null, deathday: string | null): number | null {
  if (!birthday) return null;
  const end = deathday ? new Date(deathday) : new Date();
  const start = new Date(birthday);
  let years = end.getFullYear() - start.getFullYear();
  const m = end.getMonth() - start.getMonth();
  if (m < 0 || (m === 0 && end.getDate() < start.getDate())) years -= 1;
  return years;
}

export function PersonView({ person }: { person: PersonDetail }) {
  const [department, setDepartment] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("popularity");
  const [query, setQuery] = useState("");

  const departments = useMemo(() => {
    const set = new Set(person.credits.map((c) => c.department));
    return ["all", ...Array.from(set)];
  }, [person.credits]);

  const types = useMemo(() => {
    const set = new Set(person.credits.map((c) => c.type));
    return ["all", ...Array.from(set)];
  }, [person.credits]);

  const filtered = useMemo(() => {
    let list = person.credits.slice();
    if (department !== "all") list = list.filter((c) => c.department === department);
    if (typeFilter !== "all") list = list.filter((c) => c.type === typeFilter);
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery) {
      list = list.filter((c) =>
        c.title.toLowerCase().includes(normalizedQuery) ||
        c.role.toLowerCase().includes(normalizedQuery) ||
        c.department.toLowerCase().includes(normalizedQuery)
      );
    }
    list.sort((a, b) => {
      switch (sort) {
        case "date":
          return (b.releaseDate ?? "").localeCompare(a.releaseDate ?? "");
        case "rating":
          return (b.score ?? 0) - (a.score ?? 0);
        case "az":
          return a.title.localeCompare(b.title);
        default:
          return b.popularity - a.popularity;
      }
    });
    return list;
  }, [person.credits, department, typeFilter, sort, query]);

  const knownFor = person.credits.slice().sort((a, b) => b.popularity - a.popularity).slice(0, 5);
  const yrs = age(person.birthday, person.deathday);
  const movieCount = person.credits.filter((credit) => credit.type === "movie").length;
  const seriesCount = person.credits.filter((credit) => credit.type === "series").length;
  const actingCount = person.credits.filter((credit) => credit.department === "Acting").length;
  const scoredCredits = person.credits.filter((credit) => credit.score !== null);
  const averageScore = scoredCredits.length > 0
    ? scoredCredits.reduce((total, credit) => total + (credit.score ?? 0), 0) / scoredCredits.length
    : null;
  const datedCredits = person.credits.filter((credit) => credit.year !== null);
  const firstYear = datedCredits.length > 0 ? Math.min(...datedCredits.map((credit) => credit.year ?? Number.POSITIVE_INFINITY)) : null;
  const latestYear = datedCredits.length > 0 ? Math.max(...datedCredits.map((credit) => credit.year ?? Number.NEGATIVE_INFINITY)) : null;

  return (
    <div className="pb-14">
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        {person.photoUrl ? (
          <>
            <Image src={person.photoUrl} alt="" fill priority sizes="100vw" className="object-cover object-[center_24%] opacity-30 saturate-[.82]" />
            <div className="absolute inset-0 bg-[linear-gradient(to_top,var(--bg-base)_0%,color-mix(in_srgb,var(--bg-base)_72%,transparent)_42%,rgba(8,8,12,.3)_100%),linear-gradient(90deg,rgba(8,8,12,.38),transparent_58%)]" />
          </>
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_24%,rgb(var(--accent-rgb)/0.22),transparent_40%),linear-gradient(145deg,var(--bg-elevated),var(--bg-base))]" />
        )}

        <div className="relative z-10 mx-auto max-w-[1400px] px-4 pb-9 pt-5 md:px-8 lg:pb-12">
          <BackButton className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--glass)] px-3 py-1.5 text-sm font-semibold text-[var(--text-secondary)] shadow-sm backdrop-blur-md transition hover:bg-[var(--glass-strong)] hover:text-[var(--text)]" />
          <div className="mt-8 grid gap-6 md:grid-cols-[220px_1fr] md:items-end lg:mt-12">
            <div className="relative mx-auto aspect-[2/3] w-40 shrink-0 overflow-hidden rounded-[22px] border border-white/20 bg-[var(--bg-elevated)] shadow-[0_26px_70px_rgba(0,0,0,.25)] md:mx-0 md:w-full">
              {person.photoUrl ? (
                <Image src={person.photoUrl} alt={person.name} fill sizes="220px" className="object-cover" />
              ) : (
                <div className="grid size-full place-items-center font-display text-5xl font-bold text-[var(--text-muted)]">
                  {person.name.charAt(0)}
                </div>
              )}
            </div>

            <div className="min-w-0 max-w-4xl space-y-4 pb-1">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Cast & creator</p>
                <h1 className="font-display text-4xl font-extrabold leading-[.96] tracking-tight sm:text-6xl">{person.name}</h1>
              </div>
          <div className="flex flex-wrap gap-2 text-xs text-[var(--text-secondary)]">
            {person.knownForDepartment && <Pill active>{person.knownForDepartment}</Pill>}
            {person.birthday && (
              <span className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5">
                <Cake className="size-3.5" />
                {person.birthday}
                {yrs !== null && ` (${person.deathday ? "died at" : "age"} ${yrs})`}
              </span>
            )}
            {person.placeOfBirth && (
              <span className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5">
                <MapPin className="size-3.5" /> {person.placeOfBirth}
              </span>
            )}
            {person.homepage && (
              <a
                href={person.homepage}
                target="_blank"
                rel="noopener noreferrer"
                className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 hover:text-[var(--accent)]"
              >
                <Link2 className="size-3.5" /> Website
              </a>
            )}
            {person.imdbId && (
              <a
                href={`https://www.imdb.com/name/${person.imdbId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 hover:text-[var(--accent)]"
              >
                IMDb
              </a>
            )}
          </div>

          {knownFor.length > 0 && (
            <p className="text-sm text-[var(--text-secondary)]">
              Best known for <span className="font-semibold text-[var(--text)]">{knownFor.slice(0, 3).map((credit) => credit.title).join(", ")}</span>
            </p>
          )}

          {person.biography && (
            <div className="max-w-2xl">
              <ExpandableText text={person.biography} clamp={5} />
            </div>
          )}

          {person.alsoKnownAs.length > 0 && (
            <p className="text-xs text-[var(--text-muted)]">
              Also known as: {person.alsoKnownAs.slice(0, 5).join(", ")}
            </p>
          )}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto mt-8 max-w-[1400px] px-4 md:px-8">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="pb-uiverse-card rounded-[20px] p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)]"><Clapperboard className="size-4 text-[var(--accent)]" /> Movies</div>
            <p className="mt-2 font-display text-2xl font-black tabular-nums">{movieCount}</p>
            <p className="text-[11px] text-[var(--text-muted)]">film credits</p>
          </div>
          <div className="pb-uiverse-card rounded-[20px] p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)]"><Tv className="size-4 text-[var(--accent)]" /> Series</div>
            <p className="mt-2 font-display text-2xl font-black tabular-nums">{seriesCount}</p>
            <p className="text-[11px] text-[var(--text-muted)]">television credits</p>
          </div>
          <div className="pb-uiverse-card rounded-[20px] p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)]"><Briefcase className="size-4 text-[var(--accent)]" /> Career</div>
            <p className="mt-2 font-display text-2xl font-black tabular-nums">{actingCount}</p>
            <p className="text-[11px] text-[var(--text-muted)]">
              {firstYear !== null && latestYear !== null ? `${firstYear}–${latestYear} · acting roles` : "acting roles"}
            </p>
          </div>
          <div className="pb-uiverse-card rounded-[20px] p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)]"><Star className="size-4 text-[var(--gold)]" /> Credit score</div>
            <p className="mt-2 font-display text-2xl font-black tabular-nums">{averageScore !== null ? averageScore.toFixed(1) : "—"}</p>
            <p className="text-[11px] text-[var(--text-muted)]">average across scored titles</p>
          </div>
        </section>

        {knownFor.length > 0 && (
          <section className="mt-6 space-y-3">
            <div className="flex items-end justify-between gap-3 px-1">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--accent)]">Signature credits</p>
                <h2 className="mt-1 font-display text-xl font-bold">Known for</h2>
              </div>
              <span className="text-xs text-[var(--text-muted)]">Ordered by popularity</span>
            </div>
            <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {knownFor.map((credit) => (
                <Link
                  key={`${credit.id}-${credit.department}-${credit.role}`}
                  href={`/title/${credit.type}/${credit.source}/${credit.tmdbId}`}
                  className="group relative w-[62vw] max-w-[240px] shrink-0 snap-start overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--bg-surface)] sm:w-[210px]"
                >
                  <div className="relative aspect-[16/10] overflow-hidden">
                    {credit.posterUrl ? (
                      <Image src={credit.posterUrl} alt={credit.title} fill sizes="240px" className="object-cover object-top transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <div className="grid size-full place-items-center bg-[var(--bg-elevated)] font-display text-2xl font-bold text-[var(--text-muted)]">{credit.title.charAt(0)}</div>
                    )}
                    <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(8,8,12,.88),transparent_65%)]" />
                    {credit.score !== null && (
                      <span className="absolute right-2 top-2 rounded-full bg-black/65 px-2 py-1 text-[10px] font-bold text-[var(--gold)] backdrop-blur">★ {credit.score.toFixed(1)}</span>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="line-clamp-1 text-sm font-bold">{credit.title}</h3>
                    <p className="mt-1 line-clamp-1 text-[11px] text-[var(--text-muted)]">{credit.role || credit.department}{credit.year !== null ? ` · ${credit.year}` : ""}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-[0_18px_55px_rgba(15,23,42,.06)] sm:p-6">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">Across film & television</p>
              <h2 className="mt-1 font-display text-2xl font-bold">Filmography <span className="text-[var(--text-muted)]">({person.credits.length})</span></h2>
            </div>
          </div>
          <div className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 lg:pb-0">
              {departments.map((d) => (
                <Pill key={d} active={department === d} onClick={() => setDepartment(d)}>
                  {d === "all" ? "All Roles" : d}
                </Pill>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="relative min-w-0 sm:w-64">
                <span className="sr-only">Search filmography</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search titles or roles"
                  className="min-h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-base)] pl-9 pr-3 text-xs font-medium text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
                />
              </label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-semibold outline-none focus:border-[var(--accent)]"
              >
                {SORTS.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {types.length > 2 && (
            <div className="flex flex-wrap gap-2">
              {types.map((t) => (
                <Pill key={t} active={typeFilter === t} onClick={() => setTypeFilter(t)}>
                  {t === "all" ? "All Types" : t.charAt(0).toUpperCase() + t.slice(1)}
                </Pill>
              ))}
            </div>
          )}

          {filtered.length === 0 ? (
            <EmptyState icon={<Film className="size-10" />} title="No credits found" description="Try a different role, media type or search term." />
          ) : (
            <>
              <p className="text-xs font-medium text-[var(--text-muted)]">Showing {filtered.length} of {person.credits.length} credits</p>
              <CreditGrid credits={filtered} />
            </>
          )}
        </div>
        </section>
      </div>
    </div>
  );
}

function CreditGrid({ credits }: { credits: PersonCredit[] }) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
      {credits.map((c) => (
        <Link
          key={`${c.id}-${c.department}-${c.role}`}
          href={`/title/${c.type}/${c.source}/${c.tmdbId}`}
          className="group glow-ring relative block overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)]"
        >
          <div className="relative aspect-[2/3] w-full">
            {c.posterUrl ? (
              <Image
                src={c.posterUrl}
                alt={c.title}
                fill
                sizes="(max-width: 768px) 40vw, 180px"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="grid size-full place-items-center bg-[linear-gradient(160deg,#16121f,#1c1230)] font-display text-3xl font-bold text-[var(--text-muted)]">
                {c.title.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(10,10,15,0.95),rgba(10,10,15,0.15)_50%,transparent)]" />
            <div className="absolute left-2 top-2">
              <TypeBadge type={c.type} />
            </div>
            {c.score !== null && (
              <div className="absolute right-2 top-2 rounded-full bg-[rgba(10,10,15,0.7)] px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--gold)] backdrop-blur">
                ★ {c.score.toFixed(1)}
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 p-2.5">
              <h3 className="line-clamp-2 text-[13px] font-semibold leading-tight text-white">{c.title}</h3>
              {c.role && <p className="mt-0.5 line-clamp-1 text-[11px] text-[var(--text-muted)]">{c.role}</p>}
              {c.year !== null && (
                <span className="mt-0.5 block font-mono text-[10px] text-[var(--text-muted)]">{c.year}</span>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
