export interface ThemeOption {
  id: string;
  name: string;
  /** Swatch color shown in the picker — matches that theme's --accent. */
  dot: string;
  accent2: string;
  gold: string;
}

export const THEMES: ThemeOption[] = [
  { id: "default", name: "Default", dot: "#a855f7", accent2: "#ec4899", gold: "#f5a524" },
  { id: "blue", name: "Blue", dot: "#3b82f6", accent2: "#06b6d4", gold: "#60a5fa" },
  { id: "teal", name: "Teal", dot: "#14b8a6", accent2: "#22d3ee", gold: "#2dd4bf" },
  { id: "green", name: "Green", dot: "#22c55e", accent2: "#84cc16", gold: "#4ade80" },
  { id: "mocha", name: "Mocha", dot: "#b45309", accent2: "#d97706", gold: "#f59e0b" },
  { id: "red", name: "Red", dot: "#ef4444", accent2: "#f43f5e", gold: "#fb923c" },
];

export const THEME_STORAGE_KEY = "pb_theme";
export const THEME_CHANGE_EVENT = "pbox:theme-change";

/** Inline, pre-hydration script — applies the saved theme + density/motion
 * classes to <html> before paint so there's no flash of the wrong appearance
 * on load. Must stay dependency-free (runs before React/hydration). */
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var t = localStorage.getItem("${THEME_STORAGE_KEY}");
    if (t && t !== "default") document.documentElement.setAttribute("data-theme", t);
    var palettes = ${JSON.stringify(Object.fromEntries(THEMES.map((theme) => [theme.id, [theme.dot, theme.accent2, theme.gold]])))};
    function updatePBoxFavicon() {
      var id = localStorage.getItem("${THEME_STORAGE_KEY}") || "default";
      var p = palettes[id] || palettes.default;
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="2" y="2" width="44" height="44" rx="13" fill="'+p[0]+'"/><path d="M24 2h9c7 0 13 6 13 13v18c0 7-6 13-13 13h-9V2Z" fill="'+p[1]+'" opacity=".72"/><path d="M12 19.5 24 14l12 5.5-12 5.7-12-5.7Z" fill="white"/><path d="M12 23.4 22.4 28v9L12 32.2v-8.8Zm24 0L25.6 28v9L36 32.2v-8.8Z" fill="%230a0a0f"/><path d="M19 18v13M29 17v14" stroke="'+p[2]+'" stroke-width="2.4" stroke-linecap="round"/></svg>';
      var link = document.querySelector('link[data-pbox-favicon="true"]') || document.createElement('link');
      link.rel = 'icon'; link.type = 'image/svg+xml'; link.setAttribute('data-pbox-favicon', 'true');
      link.href = 'data:image/svg+xml,' + encodeURIComponent(svg);
      if (!link.parentNode) document.head.appendChild(link);
    }
    updatePBoxFavicon();
    window.addEventListener("${THEME_CHANGE_EVENT}", updatePBoxFavicon);
    if (localStorage.getItem("pb_compact_rows") === "1") document.documentElement.classList.add("pb-compact");
    if (localStorage.getItem("pb_reduce_motion") === "1") document.documentElement.classList.add("pb-reduce-motion");
  } catch (e) {}
})();
`;
