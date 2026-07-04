"use client";

import dynamic from "next/dynamic";

// Code-split the command palette out of every page's initial bundle — it's
// only needed once the user presses Cmd/Ctrl+K, not on first paint.
const CommandPalette = dynamic(() => import("./command-palette").then((m) => m.CommandPalette), {
  ssr: false,
});

export function CommandPaletteLoader() {
  return <CommandPalette />;
}
