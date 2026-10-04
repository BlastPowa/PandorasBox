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
let returnFocus: HTMLElement | null = null;

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

  const filtered = fullList.filter(matchesFilters).sort((a,b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
  byId("resultsLabel").textContent = `${filtered.length} ${filtered.length === 1 ? "title" : "titles"}`;
  byId("librarySummary").replaceChildren(...[
    ["Saved", fullList.length], ["Active", fullList.filter(i => ["watching", "rewatching", "reading"].includes(i.status)).length],
    ["Finished", fullList.filter(i => i.status === "completed").length],
  ].map(([label,count]) => { const stat = el("div", "summary-stat"); stat.append(el("strong", "", String(count)), el("span", "", String(label))); return stat; }));
  if (filtered.length === 0) {
    const empty = el("div", "empty-state");
    empty.appendChild(el("div", "empty-art", "🗂️"));
    empty.appendChild(el("p", "empty-title", fullList.length ? "No matching titles" : "Your next story starts here"));
    empty.appendChild(el("p", "empty-sub", fullList.length ? "Try another filter or search to find your titles." : "Add a title from the extension search, or start watching with tracking enabled."));
    const reset = el("button", "action-btn primary", fullList.length ? "Clear filters" : "Explore Pandora’s Box");
    reset.addEventListener("click", () => {
      if (!fullList.length) { void chrome.tabs.create({ url: "https://www.pandorasbox.live/browse" }); return; }
      typeFilter = statusFilter = "all"; textFilter = "";
      byId<HTMLInputElement>("filterInput").value = ""; byId<HTMLSelectElement>("statusFilter").value = "all";
      updateTypeFilters(); render();
    }); empty.appendChild(reset); library.appendChild(empty);
    return;
  }

  const gridItems = filtered.filter(
    (item) => item.type === "movie" || item.type === "series" || item.type === "anime"
  );
  const readingItems = filtered.filter((item) => item.type === "manga" || item.type === "manhwa" || item.type === "comic");

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
  const card = el("button", "poster-card");
  card.setAttribute("aria-label", `${item.title}, ${getStatusLabel(item.status)}`);
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
  overlay.appendChild(el("div", "card-meta", `${getTypeLabel(item.type)} · ${getStatusLabel(item.status)}`));
  overlay.appendChild(el("div", "card-meta", formatProgress(item.progress, item.type)));
  card.appendChild(overlay);

  if (item.progress.percentComplete > 0) {
    const track = el("div", "card-progress");
    const fill = el("div", "card-progress-fill");
    fill.style.width = `${Math.max(0, Math.min(100, Math.round(item.progress.percentComplete)))}%`;
    track.appendChild(fill);
    card.appendChild(track);
  }

  card.addEventListener("click", () => openDetail(item));
  return card;
}

function buildReadingRow(item: ReelItem): HTMLElement {
  const row = el("button", "reading-row");
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
  if (overlay.hidden) returnFocus = document.activeElement as HTMLElement;
  const inner = byId("detailInner");
  inner.replaceChildren();

  const back = el("button", "detail-back", "← Library");
  back.addEventListener("click", closeDetail);
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
  const isReading = item.type === "manga" || item.type === "manhwa" || item.type === "comic";

  const markNext = el(
    "button",
    "action-btn primary",
    item.type === "movie" ? "Mark completed" : isReading ? "Mark next chapter" : "Mark next episode"
  );
  markNext.addEventListener("click", () => {
    void (async () => {
      try {
        if (item.type === "movie") {
          await sendMessage({ type: "markComplete", id: item.id });
        } else if (isReading) {
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
        closeDetail();
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

  overlay.hidden = false;
  overlay.classList.add("open");
  document.querySelectorAll<HTMLElement>("body > :not(#detailOverlay):not(script)").forEach(node => node.inert = true);
  back.focus();
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
  const row = el("button", "watch-option");
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
    updateTypeFilters();
    render();
  });

  byId<HTMLSelectElement>("statusFilter").addEventListener("change", event => {
    statusFilter = (event.target as HTMLSelectElement).value; render();
  });

  byId<HTMLInputElement>("filterInput").addEventListener("input", (event) => {
    textFilter = (event.target as HTMLInputElement).value;
    render();
  });
}

function updateTypeFilters(): void {
  document.querySelectorAll<HTMLButtonElement>("#typeFilters .pill").forEach(pill => {
    const active = pill.dataset.type === typeFilter; pill.classList.toggle("active", active); pill.setAttribute("aria-pressed", String(active));
  });
}
function closeDetail(): void {
  byId("detailOverlay").classList.remove("open"); byId("detailOverlay").hidden = true;
  document.querySelectorAll<HTMLElement>("body > :not(#detailOverlay):not(script)").forEach(node => node.inert = false);
  if (returnFocus?.isConnected) returnFocus.focus(); else byId<HTMLInputElement>("filterInput").focus();
}
document.addEventListener("keydown", event => {
  const overlay = byId("detailOverlay"); if (overlay.hidden) return;
  if (event.key === "Escape") closeDetail();
  if (event.key === "Tab") {
    const nodes = Array.from(overlay.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
    const first = nodes[0], last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
});
byId("extensionVersion").textContent = `v${chrome.runtime.getManifest().version}`;
byId("openWeb").addEventListener("click", () => { void chrome.tabs.create({ url: "https://www.pandorasbox.live/library" }); });
updateTypeFilters();
setupFilters();
void refresh();

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.reel_list) {
    void refresh();
  }
});
