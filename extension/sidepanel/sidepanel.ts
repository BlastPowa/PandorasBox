import { sendMessage } from "../lib/messages";
import type { ReelItem } from "../../core/storage/schema";
import type { WatchOption } from "../../core/api/watchProviders";
import {
  formatProgress,
  getTypeLabel,
  getStatusLabel,
  getStatusColor,
  normaliseTitle,
} from "../../core/utils/formatters";

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

let typeFilter = "all";
let statusFilter = "all";
let textFilter = "";
let fullList: ReelItem[] = [];

function matchesFilters(item: ReelItem): boolean {
  if (typeFilter !== "all" && item.type !== typeFilter) {
    return false;
  }
  if (statusFilter !== "all" && item.status !== statusFilter) {
    return false;
  }
  if (textFilter && !normaliseTitle(item.title).includes(normaliseTitle(textFilter))) {
    return false;
  }
  return true;
}

async function refresh(): Promise<void> {
  try {
    fullList = await sendMessage({ type: "getList" });
    render();
  } catch (error) {
    const library = byId("library");
    library.replaceChildren();
    library.appendChild(
      el("div", "error-note", error instanceof Error ? error.message : "Failed to load library")
    );
  }
}

function render(): void {
  const library = byId("library");
  library.replaceChildren();

  const filtered = fullList.filter(matchesFilters);
  if (filtered.length === 0) {
    const empty = el("div", "empty-state");
    empty.appendChild(el("div", "empty-art", "🗂️"));
    empty.appendChild(el("p", "empty-title", "Nothing here yet"));
    empty.appendChild(el("p", "empty-sub", "Add titles from the popup search, then manage everything here."));
    library.appendChild(empty);
    return;
  }

  const gridItems = filtered.filter(
    (item) => item.type === "movie" || item.type === "series" || item.type === "anime"
  );
  const readingItems = filtered.filter((item) => item.type === "manga" || item.type === "manhwa");

  if (gridItems.length > 0) {
    const grid = el("div", "poster-grid");
    for (const item of gridItems) {
      grid.appendChild(buildPosterCard(item));
    }
    library.appendChild(grid);
  }

  if (readingItems.length > 0) {
    library.appendChild(el("div", "section-label", "Reading"));
    const list = el("div", "reading-list");
    for (const item of readingItems) {
      list.appendChild(buildReadingRow(item));
    }
    library.appendChild(list);
  }
}

function buildPosterCard(item: ReelItem): HTMLElement {
  const card = el("div", "poster-card");
  if (item.posterUrl) {
    const img = el("img") as HTMLImageElement;
    img.src = item.posterUrl;
    img.alt = item.title;
    img.loading = "lazy";
    card.appendChild(img);
  } else {
    card.appendChild(el("div", "poster-fallback", item.title.charAt(0).toUpperCase()));
  }

  const dot = el("div", "status-dot");
  dot.style.background = getStatusColor(item.status);
  card.appendChild(dot);

  const overlay = el("div", "card-overlay");
  overlay.appendChild(el("div", "card-title", item.title));
  card.appendChild(overlay);

  if (item.progress.percentComplete > 0) {
    const track = el("div", "card-progress");
    const fill = el("div", "card-progress-fill");
    fill.style.width = `${Math.round(item.progress.percentComplete)}%`;
    track.appendChild(fill);
    card.appendChild(track);
  }

  card.addEventListener("click", () => openDetail(item));
  return card;
}

function buildReadingRow(item: ReelItem): HTMLElement {
  const row = el("div", "reading-row");
  if (item.posterUrl) {
    const img = el("img", "reading-poster") as HTMLImageElement;
    img.src = item.posterUrl;
    img.alt = item.title;
    img.loading = "lazy";
    row.appendChild(img);
  } else {
    row.appendChild(el("div", "reading-poster poster-fallback", item.title.charAt(0).toUpperCase()));
  }
  const meta = el("div", "reading-meta");
  meta.appendChild(el("div", "reading-title", item.title));
  meta.appendChild(el("div", "reading-progress", formatProgress(item.progress, item.type)));
  row.appendChild(meta);
  row.appendChild(el("span", `badge badge-${item.status}`, getStatusLabel(item.status)));
  row.addEventListener("click", () => openDetail(item));
  return row;
}

function openDetail(item: ReelItem): void {
  const overlay = byId("detailOverlay");
  const inner = byId("detailInner");
  inner.replaceChildren();

  const back = el("button", "detail-back", "← Library");
  back.addEventListener("click", () => overlay.classList.remove("open"));
  inner.appendChild(back);

  const hero = el("div", "detail-hero");
  if (item.posterUrl) {
    const img = el("img", "detail-poster") as HTMLImageElement;
    img.src = item.posterUrl;
    img.alt = item.title;
    hero.appendChild(img);
  } else {
    hero.appendChild(el("div", "detail-poster poster-fallback", item.title.charAt(0).toUpperCase()));
  }
  const headline = el("div", "detail-headline");
  headline.appendChild(el("div", "detail-title", item.title));
  const sub = el("div", "detail-sub");
  sub.appendChild(el("span", `badge badge-${item.type}`, getTypeLabel(item.type)));
  sub.appendChild(el("span", `badge badge-${item.status}`, getStatusLabel(item.status)));
  if (item.year !== null) {
    const year = el("span");
    year.style.color = "rgba(255,255,255,0.4)";
    year.style.fontSize = "11px";
    year.textContent = String(item.year);
    sub.appendChild(year);
  }
  headline.appendChild(sub);
  const progressText = el("div");
  progressText.style.marginTop = "10px";
  progressText.style.color = "rgba(255,255,255,0.6)";
  progressText.style.fontSize = "12px";
  progressText.textContent = formatProgress(item.progress, item.type);
  headline.appendChild(progressText);
  hero.appendChild(headline);
  inner.appendChild(hero);

  if (item.synopsis) {
    inner.appendChild(el("p", "detail-synopsis", item.synopsis));
  }

  const actions = el("div", "detail-actions");
  const isReading = item.type === "manga" || item.type === "manhwa";

  const markNext = el(
    "button",
    "action-btn primary",
    isReading ? "Mark Next Chapter" : "Mark Next Episode"
  );
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
        await refresh();
        const updated = fullList.find((entry) => entry.id === item.id);
        if (updated) {
          openDetail(updated);
        }
      } catch (error) {
        inner.prepend(el("div", "error-note", error instanceof Error ? error.message : "Failed"));
      }
    })();
  });
  actions.appendChild(markNext);

  const removeBtn = el("button", "action-btn", "Remove");
  removeBtn.addEventListener("click", () => {
    void (async () => {
      try {
        await sendMessage({ type: "removeItem", id: item.id });
        overlay.classList.remove("open");
        await refresh();
      } catch (error) {
        inner.prepend(el("div", "error-note", error instanceof Error ? error.message : "Failed"));
      }
    })();
  });
  actions.appendChild(removeBtn);
  inner.appendChild(actions);

  const watchSection = el("div", "watch-section");
  const watchBtn = el("button", "action-btn", isReading ? "Where to Read" : "Where to Watch");
  watchBtn.style.width = "100%";
  watchBtn.addEventListener("click", () => {
    void loadWatchOptions(item, watchSection, watchBtn);
  });
  watchSection.appendChild(watchBtn);
  inner.appendChild(watchSection);

  overlay.classList.add("open");
}

async function loadWatchOptions(
  item: ReelItem,
  container: HTMLElement,
  trigger: HTMLButtonElement
): Promise<void> {
  trigger.disabled = true;
  trigger.textContent = "Loading...";
  try {
    const options = await sendMessage({
      type: "getWatchProviders",
      tmdbId: item.tmdbId,
      itemType: item.type,
      title: item.title,
      ...(item.mangadexId !== null ? { mangadexId: item.mangadexId } : {}),
    });
    trigger.remove();
    renderWatchOptions(container, options);
  } catch (error) {
    trigger.disabled = false;
    trigger.textContent = "Where to Watch";
    container.prepend(
      el("div", "error-note", error instanceof Error ? error.message : "Failed to load options")
    );
  }
}

function renderWatchOptions(container: HTMLElement, options: WatchOption[]): void {
  if (options.length === 0) {
    container.appendChild(el("div", "error-note", "No watch options found."));
    return;
  }
  const paid = options.filter((option) => option.isPaid);
  const free = options.filter((option) => !option.isPaid && option.type === "free");
  const reading = options.filter((option) => option.type === "reading");

  const groups: { label: string; entries: WatchOption[] }[] = [
    { label: "Streaming Services", entries: paid },
    { label: "Free Options", entries: free },
    { label: "Read Online", entries: reading },
  ];

  for (const group of groups) {
    if (group.entries.length === 0) {
      continue;
    }
    container.appendChild(el("div", "watch-group-label", group.label));
    for (const option of group.entries) {
      container.appendChild(buildWatchOption(option));
    }
  }
}

function buildWatchOption(option: WatchOption): HTMLElement {
  const row = el("div", "watch-option");
  if (option.logoUrl) {
    const logo = el("img", "watch-logo") as HTMLImageElement;
    logo.src = option.logoUrl;
    logo.alt = option.name;
    row.appendChild(logo);
  } else {
    row.appendChild(el("div", "watch-logo watch-logo-fallback", option.name.charAt(0)));
  }
  row.appendChild(el("div", "watch-name", option.name));
  row.appendChild(el("span", "badge badge-planned", option.type));
  row.addEventListener("click", () => {
    void chrome.tabs.create({ url: option.url });
  });
  return row;
}

function setupFilters(): void {
  byId("typeFilters").addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    if (!target.dataset.type) {
      return;
    }
    typeFilter = target.dataset.type;
    document
      .querySelectorAll<HTMLButtonElement>("#typeFilters .pill")
      .forEach((pill) => pill.classList.toggle("active", pill.dataset.type === typeFilter));
    render();
  });

  byId("statusFilters").addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    if (!target.dataset.status) {
      return;
    }
    statusFilter = target.dataset.status;
    document
      .querySelectorAll<HTMLButtonElement>("#statusFilters .pill")
      .forEach((pill) => pill.classList.toggle("active", pill.dataset.status === statusFilter));
    render();
  });

  byId<HTMLInputElement>("filterInput").addEventListener("input", (event) => {
    textFilter = (event.target as HTMLInputElement).value;
    render();
  });
}

setupFilters();
void refresh();

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.reel_list) {
    void refresh();
  }
});
