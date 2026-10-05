export interface ThemeOption {
  id: string;
  name: string;
  /** Swatch color shown in the picker — matches that theme's --accent. */
  dot: string;
  accent2: string;
  gold: string;
}

export const THEMES: ThemeOption[] = [
  { id: "default", name: "Pandora", dot: "#8b5cf6", accent2: "#ec4899", gold: "#f5a524" },
  { id: "blue", name: "Blue", dot: "#3b82f6", accent2: "#06b6d4", gold: "#60a5fa" },
  { id: "teal", name: "Teal", dot: "#14b8a6", accent2: "#22d3ee", gold: "#2dd4bf" },
  { id: "green", name: "Green", dot: "#22c55e", accent2: "#84cc16", gold: "#4ade80" },
  { id: "mocha", name: "Mocha", dot: "#b45309", accent2: "#d97706", gold: "#f59e0b" },
  { id: "red", name: "Red", dot: "#ef4444", accent2: "#f43f5e", gold: "#fb923c" },
];

export const THEME_STORAGE_KEY = "pb_theme";
export const APPEARANCE_MODE_KEY = "pb_appearance_mode";
export const THEME_CHANGE_EVENT = "pbox:theme-change";

// Runs before the first paint, using the same saved preferences as ThemeRuntime.
export const THEME_INIT_SCRIPT = `(function(){var root=document.documentElement;var read=function(key){try{return localStorage.getItem(key)}catch(e){return null}};var mode=read('pb_appearance_mode');root.dataset.mode=mode==='dark'||mode==='light'?mode:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';var theme=read('pb_theme');if(${JSON.stringify(THEMES.map((theme) => theme.id))}.includes(theme)&&theme!=='default')root.dataset.theme=theme;root.classList.toggle('pb-compact',read('pb_compact_rows')==='1');root.classList.toggle('pb-reduce-motion',read('pb_reduce_motion')==='1');})();`;
