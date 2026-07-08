export interface ThemeOption {
  id: string;
  name: string;
  /** Swatch color shown in the picker — matches that theme's --accent. */
  dot: string;
}

export const THEMES: ThemeOption[] = [
  { id: "default", name: "Default", dot: "#a855f7" },
  { id: "blue", name: "Blue", dot: "#3b82f6" },
  { id: "teal", name: "Teal", dot: "#14b8a6" },
  { id: "green", name: "Green", dot: "#22c55e" },
  { id: "mocha", name: "Mocha", dot: "#b45309" },
  { id: "red", name: "Red", dot: "#ef4444" },
];

export const THEME_STORAGE_KEY = "pb_theme";

/** Inline, pre-hydration script — applies the saved theme + density/motion
 * classes to <html> before paint so there's no flash of the wrong appearance
 * on load. Must stay dependency-free (runs before React/hydration). */
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var t = localStorage.getItem("${THEME_STORAGE_KEY}");
    if (t && t !== "default") document.documentElement.setAttribute("data-theme", t);
    if (localStorage.getItem("pb_compact_rows") === "1") document.documentElement.classList.add("pb-compact");
    if (localStorage.getItem("pb_reduce_motion") === "1") document.documentElement.classList.add("pb-reduce-motion");
  } catch (e) {}
})();
`;
