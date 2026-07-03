import { sendMessage } from "../lib/messages";
import type { ReelItem, ReelItemStatus } from "../../core/storage/schema";
import { createDefaultProgress } from "../../core/storage/schema";
import type { UnifiedSearchResult } from "../../core/utils/search";
import { formatProgress, getTypeLabel, getStatusLabel, truncateText } from "../../core/utils/formatters";

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

function poster(url: string | null, className: string, title: string): HTMLElement {
  if (url) {
    const img = el("img", className) as HTMLImageElement;
    img.src = url;
    img.alt = title;
    img.loading = "lazy";
    return img;
  }
  const placeholder = el("div", `${className} poster-placeholder`);
  placeholder.textContent = title.charAt(0).toUpperCase() || "?";
  return placeholder;
}

function typeBadge(type: ReelItem["type"]): HTMLElement {
  return el("span", `badge badge-${type}`, getTypeLabel(type));
}

function statusBadge(status: ReelItemStatus): HTMLElement {
  return el("span", `badge badge-${status}`, getStatusLabel(status));
}

function showError(container: HTMLElement, message: string): void {
  const note = el("div", "error-note", message);
  container.prepend(note);
  setTimeout(() => note.remove(), 6000);
}

let activeTab = "home";

function switchTab(tab: string): void {
  activeTab = tab;
  document.querySelectorAll<HTMLButtonElement>(".tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tab);
  });
  document.querySelectorAll<HTMLElement>(".panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `panel-${tab}`);
  });
  if (tab === "home") {
    void loadHome();
  } else if (tab === "list") {
    void loadList();
  } else if (tab === "search") {
    byId<HTMLInputElement>("searchInput").focus();
  }
}

async function loadHome(): Promise<void> {
  const continueSection = byId("continueSection");
  const continueList = byId("continueList");
  const airingSection = byId("airingSection");
  const airingList = byId("airingList");
  const homeEmpty = byId("homeEmpty");
  const statsRow = byId("statsRow");

  try {
    const [inProgress, stats] = await Promise.all([
      sendMessage({ type: "getInProgress" }),
      sendMessage({ type: "getStats" }),
    ]);

    continueList.replaceChildren();
    const top = inProgress.slice(0, 3);
    if (top.length > 0) {
      continueSection.classList.remove("hidden");
      homeEmpty.classList.add("hidden");
      for (const item of top) {
        continueList.appendChild(buildContinueCard(item));
      }
    } else {
      continueSection.classList.add("hidden");
    }

    statsRow.replaceChildren();
    const chips: { value: number; label: string }[] = [
      { value: stats.totalItems, label: "Tracked" },
      { value: stats.watching, label: "Watching" },
      { value: stats.completed, label: "Completed" },
    ];
    for (const chip of chips) {
      const chipEl = el("div", "stat-chip");
      chipEl.appendChild(el("div", "stat-value", String(chip.value)));
      chipEl.appendChild(el("div", "stat-label", chip.label));
      statsRow.appendChild(chipEl);
    }

    homeEmpty.classList.toggle("hidden", stats.totalItems > 0);

    try {
      const airing = await sendMessage({ type: "getAiringToday" });
      airingList.replaceChildren();
      if (airing.length > 0) {
        airingSection.classList.remove("hidden");
        for (const entry of airing.slice(0, 3)) {
          const card = el("div", "airing-card");
          card.appendChild(poster(entry.posterUrl, "airing-poster", entry.title));
          const meta = el("div", "airing-meta");
          meta.appendChild(el("div", "airing-title", entry.title));
          meta.appendChild(el("div", "airing-ep", `Episode ${entry.episode}`));
          card.appendChild(meta);
          const time = new Date(entry.airingAt * 1000).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
          card.appendChild(el("div", "airing-time", time));
          airingList.appendChild(card);
        }
      } else {
        airingSection.classList.add("hidden");
      }
    } catch {
      airingSection.classList.add("hidden");
    }
  } catch (error) {
    showError(byId("panel-home"), error instanceof Error ? error.message : "Failed to load");
  }
}

function buildContinueCard(item: ReelItem): HTMLElement {
  const card = el("div", "continue-card");
  card.appendChild(poster(item.posterUrl, "poster-60", item.title));

  const meta = el("div", "continue-meta");
  meta.appendChild(el("div", "continue-title", truncateText(item.title, 25)));
  meta.appendChild(el("div", "continue-progress-text", formatProgress(item.progress, item.type)));
  const track = el("div", "progress-track");
  const fill = el("div", "progress-fill");
  fill.style.width = `${Math.round(item.progress.percentComplete)}%`;
  track.appendChild(fill);
  meta.appendChild(track);
  card.appendChild(meta);

  const resume = el("button", "resume-btn", "Resume") as HTMLButtonElement;
  resume.addEventListener("click", () => {
    void (async () => {
      try {
        const list = await sendMessage({ type: "getList" });
        const fresh = list.find((entry) => entry.id === item.id) ?? item;
        const url = buildResumeUrlFromItem(fresh);
        if (url) {
          await chrome.tabs.create({ url });
        } else {
          resume.textContent = "No link";
          resume.disabled = true;
        }
      } catch {
        resume.disabled = true;
      }
    })();
  });
  card.appendChild(resume);
  return card;
}

function buildResumeUrlFromItem(item: ReelItem): string | null {
  if (!item.lastWatchedSite) {
    return null;
  }
  const site = item.lastWatchedSite.toLowerCase();
  const encoded = encodeURIComponent(item.title);
  switch (site) {
    case "netflix":
      return "https://www.netflix.com/browse";
    case "disneyplus":
      return "https://www.disneyplus.com/home";
    case "crunchyroll":
      return `https://www.crunchyroll.com/search?q=${encoded}`;
    case "cinemaos":
      return `https://cinemaos.live/search?q=${encoded}`;
    case "nepu":
      return `https://nepu.to/search?q=${encoded}`;
    case "aniwave":
      return `https://aniwave.to/filter?keyword=${encoded}`;
    case "mangadex":
      return item.mangadexId
        ? `https://mangadex.org/title/${item.mangadexId}`
        : `https://mangadex.org/search?q=${encoded}`;
    case "webtoon":
      return `https://www.webtoons.com/en/search?keyword=${encoded}`;
    default:
      return `https://${site}`;
  }
}

let searchTimer: number | null = null;

function setupSearch(): void {
  const input = byId<HTMLInputElement>("searchInput");
  const spinner = byId("searchSpinner");
  const results = byId("searchResults");

  input.addEventListener("input", () => {
    if (searchTimer !== null) {
      clearTimeout(searchTimer);
    }
    const query = input.value.trim();
    if (query.length === 0) {
      results.replaceChildren();
      return;
    }
    searchTimer = window.setTimeout(() => {
      void runSearch(query, spinner, results);
    }, 300);
  });
}

async function runSearch(query: string, spinner: HTMLElement, results: HTMLElement): Promise<void> {
  spinner.classList.remove("hidden");
  try {
    const found = await sendMessage({ type: "search", query });
    results.replaceChildren();
    if (found.length === 0) {
      const hint = el("div", "search-hint");
      hint.appendChild(el("p", "empty-title", "No results"));
      hint.appendChild(el("p", "empty-sub", "Try a different title, or check your TMDB API key in settings."));
      results.appendChild(hint);
      return;
    }
    for (const result of found) {
      results.appendChild(buildResultRow(result));
    }
  } catch (error) {
    results.replaceChildren();
    showError(results, error instanceof Error ? error.message : "Search failed");
  } finally {
    spinner.classList.add("hidden");
  }
}

function buildResultRow(result: UnifiedSearchResult): HTMLElement {
  const row = el("div", "result-row");
  row.appendChild(poster(result.posterUrl, "poster-48", result.title));
  const meta = el("div", "result-meta");
  meta.appendChild(el("div", "result-title", result.title));
  const sub = el("div", "result-sub");
  sub.appendChild(typeBadge(result.type));
  if (result.year !== null) {
    sub.appendChild(el("span", "result-year", String(result.year)));
  }
  meta.appendChild(sub);
  row.appendChild(meta);
  row.addEventListener("click", () => openDetail(result));
  return row;
}

function openDetail(result: UnifiedSearchResult): void {
  const panel = byId("detailPanel");
  const inner = byId("detailInner");
  inner.replaceChildren();

  const back = el("button", "detail-back", "← Back");
  back.addEventListener("click", () => panel.classList.remove("open"));
  inner.appendChild(back);

  const hero = el("div", "detail-hero");
  hero.appendChild(poster(result.posterUrl, "detail-poster", result.title));
  const headline = el("div", "detail-headline");
  headline.appendChild(el("div", "detail-title", result.title));
  const sub = el("div", "detail-sub");
  sub.appendChild(typeBadge(result.type));
  if (result.year !== null) {
    sub.appendChild(el("span", "result-year", String(result.year)));
  }
  if (result.score !== null) {
    sub.appendChild(el("span", "result-year", `★ ${result.score.toFixed(1)}`));
  }
  headline.appendChild(sub);
  hero.appendChild(headline);
  inner.appendChild(hero);

  if (result.synopsis) {
    inner.appendChild(el("p", "detail-synopsis", result.synopsis));
  }

  const addBtn = el("button", "add-btn", "+ Add to List") as HTMLButtonElement;
  addBtn.addEventListener("click", () => {
    void (async () => {
      addBtn.disabled = true;
      try {
        await sendMessage({ type: "addItem", item: searchResultToItem(result) });
        addBtn.textContent = "✓ Added to List";
        addBtn.classList.add("added");
      } catch (error) {
        addBtn.disabled = false;
        const message = error instanceof Error ? error.message : "Failed to add";
        if (message.includes("already exists")) {
          addBtn.textContent = "✓ Already in List";
          addBtn.classList.add("added");
          addBtn.disabled = true;
        } else {
          showError(inner, message);
        }
      }
    })();
  });
  inner.appendChild(addBtn);

  panel.classList.add("open");
}

function searchResultToItem(result: UnifiedSearchResult): Omit<ReelItem, "addedAt" | "updatedAt"> {
  const progress = createDefaultProgress();
  progress.totalEpisodes = result.totalEpisodes;
  progress.totalChapters = result.totalChapters;
  return {
    id: result.id,
    source: result.source,
    type: result.type,
    title: result.title,
    posterUrl: result.posterUrl,
    backdropUrl: null,
    synopsis: result.synopsis,
    status: "planned",
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
    completedAt: null,
    lastWatchedSite: null,
  };
}

let activeStatusFilter: string = "all";
let openMenu: HTMLElement | null = null;

function setupListFilters(): void {
  byId("statusFilters").addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    if (!target.dataset.status) {
      return;
    }
    activeStatusFilter = target.dataset.status;
    document
      .querySelectorAll<HTMLButtonElement>("#statusFilters .pill")
      .forEach((pill) => pill.classList.toggle("active", pill.dataset.status === activeStatusFilter));
    void loadList();
  });
}

async function loadList(): Promise<void> {
  const container = byId("listItems");
  try {
    const list = await sendMessage({ type: "getList" });
    const filtered =
      activeStatusFilter === "all"
        ? list
        : list.filter((item) => item.status === activeStatusFilter);
    container.replaceChildren();
    if (filtered.length === 0) {
      const empty = el("div", "empty-state");
      empty.appendChild(el("div", "empty-art", "📼"));
      empty.appendChild(el("p", "empty-title", "Nothing here yet"));
      empty.appendChild(el("p", "empty-sub", "Add titles from the Search tab to start tracking."));
      container.appendChild(empty);
      return;
    }
    for (const item of filtered) {
      container.appendChild(buildListRow(item));
    }
  } catch (error) {
    showError(container, error instanceof Error ? error.message : "Failed to load list");
  }
}

function buildListRow(item: ReelItem): HTMLElement {
  const row = el("div", "list-row");
  row.appendChild(poster(item.posterUrl, "poster-48", item.title));
  const meta = el("div", "list-meta");
  meta.appendChild(el("div", "list-title", item.title));
  meta.appendChild(el("div", "list-progress", formatProgress(item.progress, item.type)));
  row.appendChild(meta);
  row.appendChild(statusBadge(item.status));

  const menuBtn = el("button", "menu-btn", "⋮");
  menuBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleMenu(row, item);
  });
  row.appendChild(menuBtn);
  return row;
}

function toggleMenu(row: HTMLElement, item: ReelItem): void {
  if (openMenu) {
    openMenu.remove();
    openMenu = null;
    return;
  }
  const menu = el("div", "menu-pop");
  const isReading = item.type === "manga" || item.type === "manhwa";

  const markNext = el("button", "", isReading ? "Mark Next Chapter Read" : "Mark Next Episode Watched");
  markNext.addEventListener("click", () => {
    void (async () => {
      try {
        if (isReading) {
          const next = (item.progress.currentChapter ?? 0) + 1;
          await sendMessage({ type: "markChapterRead", id: item.id, chapter: next });
        } else {
          const next = (item.progress.currentEpisode ?? 0) + 1;
          await sendMessage({ type: "markEpisodeWatched", id: item.id, episode: next });
        }
        await loadList();
      } catch (error) {
        showError(byId("panel-list"), error instanceof Error ? error.message : "Failed");
      }
    })();
  });
  menu.appendChild(markNext);

  const markComplete = el("button", "", "Mark Complete");
  markComplete.addEventListener("click", () => {
    void (async () => {
      try {
        await sendMessage({ type: "markComplete", id: item.id });
        await loadList();
      } catch (error) {
        showError(byId("panel-list"), error instanceof Error ? error.message : "Failed");
      }
    })();
  });
  menu.appendChild(markComplete);

  const remove = el("button", "danger", "Remove from List");
  remove.addEventListener("click", () => {
    void (async () => {
      try {
        await sendMessage({ type: "removeItem", id: item.id });
        await loadList();
      } catch (error) {
        showError(byId("panel-list"), error instanceof Error ? error.message : "Failed");
      }
    })();
  });
  menu.appendChild(remove);

  row.appendChild(menu);
  openMenu = menu;
}

document.addEventListener("click", (event) => {
  if (openMenu && !(event.target as HTMLElement).closest(".menu-pop")) {
    openMenu.remove();
    openMenu = null;
  }
});

function setupChrome(): void {
  byId("tabs").addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    if (target.dataset.tab) {
      switchTab(target.dataset.tab);
    }
  });

  byId("openSidebarBtn").addEventListener("click", () => {
    void (async () => {
      try {
        const currentWindow = await chrome.windows.getCurrent();
        if (currentWindow.id !== undefined) {
          await chrome.sidePanel.open({ windowId: currentWindow.id });
          window.close();
        }
      } catch (error) {
        showError(byId(`panel-${activeTab}`), error instanceof Error ? error.message : "Could not open sidebar");
      }
    })();
  });

  byId("profileBtn").addEventListener("click", () => {
    void (async () => {
      try {
        await chrome.tabs.create({ url: chrome.runtime.getURL("pages/profile.html") });
      } catch (error) {
        console.error(error);
      }
    })();
  });
}

setupChrome();
setupSearch();
setupListFilters();
void loadHome();
