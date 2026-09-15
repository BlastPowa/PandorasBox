(function () {
  try {
    var mode = localStorage.getItem("pb_appearance_mode") || "system";
    var resolvedMode = mode === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : mode;
    document.documentElement.setAttribute("data-mode", resolvedMode);
    var theme = localStorage.getItem("pb_theme");
    if (theme && theme !== "default") document.documentElement.setAttribute("data-theme", theme);
    var palettes = {
      default: ["#8b5cf6", "#ec4899", "#f5a524"],
      blue: ["#3b82f6", "#06b6d4", "#60a5fa"],
      teal: ["#14b8a6", "#22d3ee", "#2dd4bf"],
      green: ["#22c55e", "#84cc16", "#4ade80"],
      mocha: ["#b45309", "#d97706", "#f59e0b"],
      red: ["#ef4444", "#f43f5e", "#fb923c"]
    };
    function updatePBoxFavicon() {
      var id = localStorage.getItem("pb_theme") || "default";
      var palette = palettes[id] || palettes.default;
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="2" y="2" width="44" height="44" rx="13" fill="'+palette[0]+'"/><path d="M24 2h9c7 0 13 6 13 13v18c0 7-6 13-13 13h-9V2Z" fill="'+palette[1]+'" opacity=".72"/><path d="M12 19.5 24 14l12 5.5-12 5.7-12-5.7Z" fill="white"/><path d="M12 23.4 22.4 28v9L12 32.2v-8.8Zm24 0L25.6 28v9L36 32.2v-8.8Z" fill="%230a0a0f"/><path d="M19 18v13M29 17v14" stroke="'+palette[2]+'" stroke-width="2.4" stroke-linecap="round"/></svg>';
      var link = document.querySelector('link[data-pbox-favicon="true"]') || document.createElement("link");
      link.rel = "icon";
      link.type = "image/svg+xml";
      link.setAttribute("data-pbox-favicon", "true");
      link.href = "data:image/svg+xml," + encodeURIComponent(svg);
      if (!link.parentNode) document.head.appendChild(link);
    }
    updatePBoxFavicon();
    window.addEventListener("pbox:theme-change", updatePBoxFavicon);
    if (localStorage.getItem("pb_compact_rows") === "1") document.documentElement.classList.add("pb-compact");
    if (localStorage.getItem("pb_reduce_motion") === "1") document.documentElement.classList.add("pb-reduce-motion");
  } catch (_) {}
})();
