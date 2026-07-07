"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Cake, MapPin, Link2, Film } from "lucide-react";
import type { PersonDetail, PersonCredit } from "@/lib/person";
import { GlassCard } from "@/components/ui-fx/glass-card";
import { Pill, TypeBadge } from "@/components/ui-fx/badge";
import { EmptyState } from "@/components/ui-fx/feedback";
import { ExpandableText } from "@/components/detail/expandable-text";

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
  }, [person.credits, department, typeFilter, sort]);

  const knownFor = person.credits.slice().sort((a, b) => b.popularity - a.popularity).slice(0, 3);
  const yrs = age(person.birthday, person.deathday);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 md:px-8">
      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <div className="relative mx-auto aspect-[2/3] w-40 shrink-0 overflow-hidden rounded-[var(--radius-lg)] bg-[var(--bg-elevated)] md:mx-0 md:w-full">
          {person.photoUrl ? (
            <Image src={person.photoUrl} alt={person.name} fill sizes="220px" className="object-cover" />
          ) : (
            <div className="grid size-full place-items-center font-display text-4xl font-bold text-[var(--text-muted)]">
              {person.name.charAt(0)}
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-3">
          <h1 className="font-display text-2xl font-bold md:text-3xl">{person.name}</h1>
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
              Known for{" "}
              {knownFor.map((c, i) => (
                <span key={c.id}>
                  <Link href={`/title/${c.type}/${c.source}/${c.tmdbId}`} className="font-semibold text-[var(--text)] hover:text-[var(--accent)]">
                    {c.title}
                  </Link>
                  {i < knownFor.length - 1 ? ", " : ""}
                </span>
              ))}
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

      <GlassCard macDots title={`Filmography (${person.credits.length})`}>
        <div className="space-y-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              {departments.map((d) => (
                <Pill key={d} active={department === d} onClick={() => setDepartment(d)}>
                  {d === "all" ? "All Roles" : d}
                </Pill>
              ))}
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-semibold outline-none"
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
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
            <EmptyState icon={<Film className="size-10" />} title="No credits found" description="Try a different filter." />
          ) : (
            <CreditGrid credits={filtered} />
          )}
        </div>
      </GlassCard>
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
