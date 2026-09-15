import { sendMessage } from "../lib/messages";
import { createDefaultProgress, type ReelItem, type ReelSettings } from "../../core/storage/schema";
import { formatRuntime, normaliseTitle } from "../../core/utils/formatters";
import { validateDecodedList } from "../../core/sync/qrSync";
import type { UnifiedSearchResult } from "../../core/utils/search";

interface NetflixHistoryEntry {
  title: string;
  searchTitle: string;
  watchedAt: string | null;
  episodic: boolean;
}

const MAX_NETFLIX_IMPORT_TITLES = 200;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}

function byId<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) {
    throw new Error(`Missing element #${id}`);
  }
  return node as T;
}

function note(target: HTMLElement, message: string, isError = false): void {
  target.textContent = message;
  target.classList.remove("hidden");
  target.classList.toggle("error", isError);
  setTimeout(() => target.classList.add("hidden"), 5000);
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (char === "," && !quoted) {
      row.push(field);
      field = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") {
        index += 1;
      }
      row.push(field);
      if (row.some((value) => value.trim().length > 0)) {
        rows.push(row);
      }
      row = [];
      field = "";
      continue;
    }
    field += char;
  }

  row.push(field);
  if (row.some((value) => value.trim().length > 0)) {
    rows.push(row);
  }
  return rows;
}

function parseNetflixDate(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;

  const slashDate = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(raw);
  if (slashDate) {
    let first = Number(slashDate[1]);
    let second = Number(slashDate[2]);
    let year = Number(slashDate[3]);
    if (year < 100) year += 2000;
    let month = first;
    let day = second;
    if (first > 12 && second <= 12) {
      day = first;
      month = second;
    }
    const parsed = new Date(Date.UTC(year, month - 1, day, 12));
    if (
      parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month - 1 &&
      parsed.getUTCDate() === day
    ) {
      return parsed.toISOString();
    }
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function getNetflixSearchTitle(title: string): { searchTitle: string; episodic: boolean } {
  const seasonMarker = /:\s*(?:season|series|limited series|book|part|episode)\b/i.exec(title);
  if (!seasonMarker || seasonMarker.index <= 0) {
    return { searchTitle: title.trim(), episodic: false };
  }
  return {
    searchTitle: title.slice(0, seasonMarker.index).trim(),
    episodic: true,
  };
}

function parseNetflixHistory(text: string): NetflixHistoryEntry[] {
  const rows = parseCsvRows(text);
  const header = rows.shift();
  if (!header) {
    throw new Error("The Netflix CSV is empty.");
  }
  const normalisedHeader = header.map((value) => value.replace(/^\uFEFF/, "").trim().toLowerCase());
  const titleIndex = normalisedHeader.indexOf("title");
  const dateIndex = normalisedHeader.indexOf("date");
  if (titleIndex < 0) {
    throw new Error("This does not look like a Netflix ViewingActivity.csv file.");
  }

  const deduped = new Map<string, NetflixHistoryEntry>();
  for (const row of rows) {
    const title = (row[titleIndex] ?? "").trim();
    if (!title) continue;
    const { searchTitle, episodic } = getNetflixSearchTitle(title);
    const key = normaliseTitle(searchTitle);
    if (!key) continue;
    const watchedAt = dateIndex >= 0 ? parseNetflixDate(row[dateIndex] ?? "") : null;
    const existing = deduped.get(key);
    if (!existing) {
      deduped.set(key, { title, searchTitle, watchedAt, episodic });
      continue;
    }
    const existingTime = existing.watchedAt ? new Date(existing.watchedAt).getTime() : 0;
    const incomingTime = watchedAt ? new Date(watchedAt).getTime() : 0;
    if (incomingTime >= existingTime) {
      deduped.set(key, {
        title,
        searchTitle,
        watchedAt,
        episodic: existing.episodic || episodic,
      });
    } else if (episodic && !existing.episodic) {
      existing.episodic = true;
    }
  }
  return Array.from(deduped.values());
}

function chooseExactNetflixMatch(
  entry: NetflixHistoryEntry,
  results: UnifiedSearchResult[]
): UnifiedSearchResult | null {
  const wanted = normaliseTitle(entry.searchTitle);
  const exact = results.filter((result) => normaliseTitle(result.title) === wanted);
  if (exact.length === 0) return null;

  if (entry.episodic) {
    const episodic = exact.filter((result) => result.type === "series" || result.type === "anime");
    const tmdb = episodic.filter((result) => result.source === "tmdb");
    if (tmdb.length === 1) return tmdb[0];
    if (episodic.length === 1) return episodic[0];
    return null;
  }

  const movies = exact.filter((result) => result.type === "movie");
  if (movies.length === 1) return movies[0];
  if (exact.length === 1) return exact[0];
  return null;
}

function netflixResultToItem(
  result: UnifiedSearchResult,
  watchedAt: string | null
): Omit<ReelItem, "addedAt" | "updatedAt"> {
  const progress = createDefaultProgress();
  progress.totalEpisodes = result.totalEpisodes;
  progress.totalChapters = result.totalChapters;
  const completed = result.type === "movie";
  if (completed) progress.percentComplete = 100;
  return {
    id: result.id,
    source: result.source,
    type: result.type,
    title: result.title,
    posterUrl: result.posterUrl,
    backdropUrl: result.backdropUrl ?? null,
    synopsis: result.synopsis,
    status: completed ? "completed" : "watching",
    progress,
    rating: null,
    genres: [],
    totalEpisodes: result.totalEpisodes,
    totalChapters: result.totalChapters,
    totalSeasons: null,
    year: result.year,
    anilistId: result.anilistId,
    tmdbId: result.tmdbId,
    mangadexId: result.mangadexId,
    malId: result.malId,
    completedAt: completed ? watchedAt : null,
    lastWatchedSite: "netflix.com",
  };
}

async function loadOverview(): Promise<void> {
  const grid = byId("overviewGrid");
  try {
    const [stats, list] = await Promise.all([
      sendMessage({ type: "getStats" }),
      sendMessage({ type: "getList" }),
    ]);

    const moviesCompleted = list.filter(
      (item) => item.type === "movie" && item.status === "completed"
    ).length;
    const seriesCompleted = list.filter(
      (item) => (item.type === "series" || item.type === "anime") && item.status === "completed"
    ).length;
    const completionRate =
      stats.totalItems > 0 ? Math.round((stats.completed / stats.totalItems) * 100) : 0;
    const watchHours = Math.round(stats.totalWatchTimeMinutes / 60);

    grid.replaceChildren();
    const cards: { value: string; label: string }[] = [
      { value: watchHours >= 1 ? `${watchHours} hours` : formatRuntime(stats.totalWatchTimeMinutes), label: "Watch Time" },
      { value: String(stats.totalEpisodesWatched), label: "Episodes Watched" },
      { value: String(stats.totalChaptersRead), label: "Chapters Read" },
      { value: String(moviesCompleted), label: "Movies Completed" },
      { value: String(seriesCompleted), label: "Series Completed" },
      { value: `${completionRate}%`, label: "Completion Rate" },
    ];
    for (const card of cards) {
      const cardEl = el("div", "overview-card");
      cardEl.appendChild(el("div", "overview-value", card.value));
      cardEl.appendChild(el("div", "overview-label", card.label));
      grid.appendChild(cardEl);
    }

    renderGenres(stats.topGenres);
    renderRecent(list);
  } catch (error) {
    grid.replaceChildren();
    grid.appendChild(
      el("div", "empty-sub", error instanceof Error ? error.message : "Failed to load stats")
    );
  }
}

function renderGenres(genres: { genre: string; count: number }[]): void {
  const container = byId("genreBars");
  container.replaceChildren();
  const top = genres.slice(0, 8);
  if (top.length === 0) {
    container.appendChild(el("p", "empty-sub", "Genres appear here once you add titles."));
    return;
  }
  const max = top[0]?.count ?? 1;
  for (const entry of top) {
    const row = el("div", "genre-row");
    row.appendChild(el("div", "genre-name", entry.genre));
    const track = el("div", "genre-track");
    const fill = el("div", "genre-fill");
    fill.style.width = `${Math.round((entry.count / max) * 100)}%`;
    track.appendChild(fill);
    row.appendChild(track);
    row.appendChild(el("div", "genre-count", String(entry.count)));
    container.appendChild(row);
  }
}

function renderRecent(list: ReelItem[]): void {
  const container = byId("recentList");
  container.replaceChildren();
  const recent = list
    .filter((item) => item.status === "completed" && item.completedAt !== null)
    .sort(
      (a, b) => new Date(b.completedAt as string).getTime() - new Date(a.completedAt as string).getTime()
    )
    .slice(0, 5);

  if (recent.length === 0) {
    container.appendChild(el("p", "empty-sub", "Completed titles show up here."));
    return;
  }

  for (const item of recent) {
    const row = el("div", "recent-row");
    if (item.posterUrl) {
      const img = el("img", "recent-poster") as HTMLImageElement;
      img.src = item.posterUrl;
      img.alt = item.title;
      row.appendChild(img);
    } else {
      row.appendChild(el("div", "recent-poster poster-fallback", item.title.charAt(0).toUpperCase()));
    }
    const meta = el("div", "recent-meta");
    meta.appendChild(el("div", "recent-title", item.title));
    const completedDate = new Date(item.completedAt as string).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    meta.appendChild(el("div", "recent-date", `Completed ${completedDate}`));
    row.appendChild(meta);
    row.appendChild(buildStars(item));
    container.appendChild(row);
  }
}

function buildStars(item: ReelItem): HTMLElement {
  const wrap = el("div", "stars");
  const rating = item.rating ?? 0;
  for (let starIndex = 1; starIndex <= 5; starIndex += 1) {
    const star = el("span", "star", "★");
    if (rating >= starIndex * 2) {
      star.classList.add("filled");
    }
    star.addEventListener("click", () => {
      void (async () => {
        try {
          await sendMessage({ type: "updateItem", id: item.id, updates: { rating: starIndex * 2 } });
          item.rating = starIndex * 2;
          const fresh = buildStars(item);
          wrap.replaceWith(fresh);
        } catch (error) {
          console.error(error);
        }
      })();
    });
    wrap.appendChild(star);
  }
  return wrap;
}

async function loadSettings(): Promise<void> {
  try {
    const settings = await sendMessage({ type: "getSettings" });
    byId<HTMLInputElement>("tmdbApiKey").value = settings.tmdbApiKey;
    byId<HTMLSelectElement>("country").value = settings.country;
    byId<HTMLInputElement>("notificationsEnabled").checked = settings.notificationsEnabled;
    byId<HTMLInputElement>("autoTrack").checked = settings.autoTrack;
    byId<HTMLInputElement>("syncEnabled").checked = settings.syncEnabled;
    byId<HTMLInputElement>("supabaseUrl").value = settings.supabaseUrl ?? "";
    byId<HTMLInputElement>("supabaseAnonKey").value = settings.supabaseAnonKey ?? "";
    byId("syncFields").classList.toggle("hidden", !settings.syncEnabled);
  } catch (error) {
    note(byId("saveNote"), error instanceof Error ? error.message : "Failed to load settings", true);
  }
}

function setupSettingsForm(): void {
  byId<HTMLInputElement>("syncEnabled").addEventListener("change", (event) => {
    byId("syncFields").classList.toggle("hidden", !(event.target as HTMLInputElement).checked);
  });

  byId<HTMLFormElement>("settingsForm").addEventListener("submit", (event) => {
    event.preventDefault();
    void (async () => {
      try {
        const supabaseUrl = byId<HTMLInputElement>("supabaseUrl").value.trim();
        const supabaseAnonKey = byId<HTMLInputElement>("supabaseAnonKey").value.trim();
        const partial: Partial<ReelSettings> = {
          tmdbApiKey: byId<HTMLInputElement>("tmdbApiKey").value.trim(),
          country: byId<HTMLSelectElement>("country").value,
          notificationsEnabled: byId<HTMLInputElement>("notificationsEnabled").checked,
          autoTrack: byId<HTMLInputElement>("autoTrack").checked,
          syncEnabled: byId<HTMLInputElement>("syncEnabled").checked,
          supabaseUrl: supabaseUrl.length > 0 ? supabaseUrl : null,
          supabaseAnonKey: supabaseAnonKey.length > 0 ? supabaseAnonKey : null,
        };
        await sendMessage({ type: "updateSettings", settings: partial });
        note(byId("saveNote"), "Settings saved.");
      } catch (error) {
        note(byId("saveNote"), error instanceof Error ? error.message : "Failed to save", true);
      }
    })();
  });

  byId("syncNowBtn").addEventListener("click", () => {
    void (async () => {
      try {
        const result = await sendMessage({ type: "syncNow" });
        note(byId("saveNote"), result.message, !result.success);
      } catch (error) {
        note(byId("saveNote"), error instanceof Error ? error.message : "Sync failed", true);
      }
    })();
  });
}

function setupDataActions(): void {
  byId("exportBtn").addEventListener("click", () => {
    void (async () => {
      try {
        const list = await sendMessage({ type: "getList" });
        const blob = new Blob([JSON.stringify(list, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const anchor = el("a") as HTMLAnchorElement;
        anchor.href = url;
        anchor.download = `pandoras-box-list-${new Date().toISOString().slice(0, 10)}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
        note(byId("dataNote"), `Exported ${list.length} items.`);
      } catch (error) {
        note(byId("dataNote"), error instanceof Error ? error.message : "Export failed", true);
      }
    })();
  });

  const fileInput = byId<HTMLInputElement>("importFile");
  byId("importBtn").addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (!file) {
      return;
    }
    void (async () => {
      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as unknown;
        if (!validateDecodedList(parsed)) {
          note(byId("dataNote"), "That file is not a valid Pandora's Box list export.", true);
          return;
        }
        const existing = await sendMessage({ type: "getList" });
        const existingIds = new Set(existing.map((item) => item.id));
        let imported = 0;
        for (const item of parsed) {
          if (existingIds.has(item.id)) {
            continue;
          }
          const { addedAt, updatedAt, ...rest } = item;
          await sendMessage({ type: "addItem", item: rest });
          imported += 1;
        }
        note(byId("dataNote"), `Imported ${imported} new items (${parsed.length - imported} already in list).`);
        await loadOverview();
      } catch (error) {
        note(byId("dataNote"), error instanceof Error ? error.message : "Import failed", true);
      } finally {
        fileInput.value = "";
      }
    })();
  });

  const netflixFileInput = byId<HTMLInputElement>("netflixImportFile");
  byId("netflixImportBtn").addEventListener("click", () => netflixFileInput.click());
  netflixFileInput.addEventListener("change", () => {
    const file = netflixFileInput.files?.[0];
    if (!file) return;

    void (async () => {
      const dataNote = byId("dataNote");
      try {
        const entries = parseNetflixHistory(await file.text());
        if (entries.length === 0) {
          note(dataNote, "No Netflix viewing-history titles were found in that CSV.", true);
          return;
        }

        const selected = entries.slice(0, MAX_NETFLIX_IMPORT_TITLES);
        const existing = await sendMessage({ type: "getList" });
        const existingIds = new Set(existing.map((item) => item.id));
        let imported = 0;
        let alreadyThere = 0;
        let unmatched = 0;

        dataNote.classList.remove("hidden", "error");
        for (let index = 0; index < selected.length; index += 1) {
          if (index % 10 === 0) {
            dataNote.textContent = `Matching Netflix history… ${index}/${selected.length}`;
          }
          const entry = selected[index];
          const results = await sendMessage({ type: "search", query: entry.searchTitle });
          const match = chooseExactNetflixMatch(entry, results);
          if (!match) {
            unmatched += 1;
            continue;
          }
          if (existingIds.has(match.id)) {
            alreadyThere += 1;
            continue;
          }
          try {
            await sendMessage({ type: "addItem", item: netflixResultToItem(match, entry.watchedAt) });
            existingIds.add(match.id);
            imported += 1;
          } catch (error) {
            const message = error instanceof Error ? error.message : "";
            if (message.includes("already exists")) {
              alreadyThere += 1;
            } else {
              unmatched += 1;
            }
          }
        }

        const capped = entries.length > selected.length
          ? ` Limited to the newest ${MAX_NETFLIX_IMPORT_TITLES} unique titles for this import.`
          : "";
        note(
          dataNote,
          `Netflix import: ${imported} added, ${alreadyThere} already in Pandora's Box, ${unmatched} skipped because no exact match was safe.${capped}`
        );
        await loadOverview();
      } catch (error) {
        note(dataNote, error instanceof Error ? error.message : "Netflix history import failed", true);
      } finally {
        netflixFileInput.value = "";
      }
    })();
  });
}

setupSettingsForm();
setupDataActions();
void loadSettings();
void loadOverview();
