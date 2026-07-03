import { sendMessage } from "../lib/messages";
import type { ReelItem, ReelSettings } from "../../core/storage/schema";
import { formatRuntime } from "../../core/utils/formatters";
import { validateDecodedList } from "../../core/sync/qrSync";

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
        anchor.download = `reel-list-${new Date().toISOString().slice(0, 10)}.json`;
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
          note(byId("dataNote"), "That file is not a valid Reel list export.", true);
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
}

setupSettingsForm();
setupDataActions();
void loadSettings();
void loadOverview();
