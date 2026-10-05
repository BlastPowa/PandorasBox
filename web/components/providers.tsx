"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { Toaster } from "sonner";
import { InstallTip, PwaInstallProvider } from "@/components/pwa/install-manager";
import { StartupSplash } from "@/components/pwa/pbox-loader";
import { APPEARANCE_MODE_KEY, THEMES, THEME_CHANGE_EVENT, THEME_STORAGE_KEY } from "@/lib/theme";

function ThemeRuntime() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const read = (key: string) => { try { return window.localStorage.getItem(key); } catch { return null; } };
    const applyStoredTheme = () => {
      const mode = read(APPEARANCE_MODE_KEY) ?? "system";
      const resolvedMode = mode === "dark" || mode === "light" ? mode : (media.matches ? "dark" : "light");
      document.documentElement.setAttribute("data-mode", resolvedMode);

      const themeId = read(THEME_STORAGE_KEY) ?? "default";
      if (themeId === "default" || !THEMES.some((theme) => theme.id === themeId)) document.documentElement.removeAttribute("data-theme");
      else document.documentElement.setAttribute("data-theme", themeId);

      document.documentElement.classList.toggle("pb-compact", read("pb_compact_rows") === "1");
      document.documentElement.classList.toggle("pb-reduce-motion", read("pb_reduce_motion") === "1");
    };

    const updateFavicon = () => {
      const themeId = read(THEME_STORAGE_KEY) ?? "default";
      const theme = THEMES.find((item) => item.id === themeId) ?? THEMES[0];
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="2" y="2" width="44" height="44" rx="13" fill="${theme.dot}"/><path d="M24 2h9c7 0 13 6 13 13v18c0 7-6 13-13 13h-9V2Z" fill="${theme.accent2}" opacity=".72"/><path d="M12 19.5 24 14l12 5.5-12 5.7-12-5.7Z" fill="white"/><path d="M12 23.4 22.4 28v9L12 32.2v-8.8Zm24 0L25.6 28v9L36 32.2v-8.8Z" fill="#0a0a0f"/><path d="M19 18v13M29 17v14" stroke="${theme.gold}" stroke-width="2.4" stroke-linecap="round"/></svg>`;
      const existing = document.querySelector<HTMLLinkElement>('link[data-pbox-favicon="true"]');
      const link = existing ?? document.createElement("link");
      link.rel = "icon";
      link.type = "image/svg+xml";
      link.dataset.pboxFavicon = "true";
      link.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
      if (!existing) document.head.appendChild(link);
    };

    const syncSystemMode = () => {
      if ((read(APPEARANCE_MODE_KEY) ?? "system") === "system") {
        document.documentElement.setAttribute("data-mode", media.matches ? "dark" : "light");
      }
    };

    const updateBrowserColor = () => {
      const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
      if (meta) meta.content = getComputedStyle(document.documentElement).getPropertyValue("--bg-base").trim();
    };
    const sync = () => { applyStoredTheme(); updateFavicon(); updateBrowserColor(); };
    const observer = new MutationObserver(updateBrowserColor);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-mode", "data-theme"] });
    sync();
    media.addEventListener("change", syncSystemMode);
    window.addEventListener(THEME_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);

    return () => {
      media.removeEventListener("change", syncSystemMode);
      window.removeEventListener(THEME_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
      observer.disconnect();
    };
  }, []);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5,
            gcTime: 1000 * 60 * 30,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <PwaInstallProvider>
      <QueryClientProvider client={client}>
        <ThemeRuntime />
        <StartupSplash />
        {children}
        <InstallTip />
        <Toaster
          theme="dark"
          position="bottom-right"
          mobileOffset={{
            bottom: "calc(var(--app-bottom-nav-height) + 12px)",
            left: "max(12px, var(--safe-left))",
            right: "max(12px, var(--safe-right))",
          }}
          offset={{ bottom: "max(24px, var(--safe-bottom))", right: "max(24px, var(--safe-right))" }}
          toastOptions={{
            style: {
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            },
          }}
        />
      </QueryClientProvider>
    </PwaInstallProvider>
  );
}
