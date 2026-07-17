"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Download, Share, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui-fx/button";

const TIP_KEY = "pbox-install-tip-dismissed-v1";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type InstallResult = "accepted" | "dismissed" | "ios" | "unavailable" | "installed";

type InstallContextValue = {
  installed: boolean;
  canPrompt: boolean;
  isIos: boolean;
  install: () => Promise<InstallResult>;
};

const InstallContext = createContext<InstallContextValue | null>(null);

function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches
    || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
}

function isIosDevice() {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
    || (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
}

export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const [installed, setInstalled] = useState(false);
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setInstalled(isStandalone());
      setIsIos(isIosDevice());
    });

    const displayMode = window.matchMedia("(display-mode: standalone)");
    const onDisplayMode = () => setInstalled(isStandalone());
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };

    displayMode.addEventListener("change", onDisplayMode);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // Installation remains optional if registration is unavailable.
      });
    }

    return () => {
      displayMode.removeEventListener("change", onDisplayMode);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async (): Promise<InstallResult> => {
    if (installed) return "installed";
    if (promptEvent) {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "accepted") setPromptEvent(null);
      return choice.outcome;
    }
    if (isIos) return "ios";
    return "unavailable";
  }, [installed, isIos, promptEvent]);

  const value = useMemo(() => ({ installed, canPrompt: Boolean(promptEvent), isIos, install }), [installed, promptEvent, isIos, install]);
  return <InstallContext.Provider value={value}>{children}</InstallContext.Provider>;
}

export function usePwaInstall() {
  const value = useContext(InstallContext);
  if (!value) throw new Error("usePwaInstall must be used inside PwaInstallProvider");
  return value;
}

export function InstallPBoxControl() {
  const { installed, canPrompt, isIos, install } = usePwaInstall();
  const [instructions, setInstructions] = useState(false);

  async function beginInstall() {
    const result = await install();
    setInstructions(result === "ios" || result === "unavailable");
  }

  return (
    <section className="rounded-[var(--radius-md)] border border-[rgb(var(--accent-rgb)/0.25)] bg-[rgb(var(--accent-rgb)/0.07)] p-4" aria-labelledby="install-pbox-title">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[rgb(var(--accent-rgb)/0.16)] text-[var(--accent)]"><Smartphone className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <h3 id="install-pbox-title" className="font-bold">Install PBox</h3>
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">Add PBox to your home screen for a full-screen, safe-area-aware experience and an offline fallback.</p>
        </div>
      </div>
      {installed ? (
        <p className="mt-3 rounded-xl bg-[var(--glass)] p-3 text-sm font-semibold text-[var(--completed)]">PBox is already running as an installed app.</p>
      ) : (
        <Button type="button" className="mt-4 w-full sm:w-auto" onClick={() => void beginInstall()}>
          <Download className="size-4" /> {canPrompt ? "Install PBox" : isIos ? "How to install on iPhone" : "Installation help"}
        </Button>
      )}
      {instructions && !installed && (
        <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--bg-base)] p-3 text-sm leading-relaxed text-[var(--text-secondary)]">
          {isIos ? <><Share className="mr-1 inline size-4 text-[var(--accent)]" />In Safari, tap <strong className="text-[var(--text)]">Share</strong>, then choose <strong className="text-[var(--text)]">Add to Home Screen</strong>.</> : <>Open your browser menu and choose <strong className="text-[var(--text)]">Install app</strong> or <strong className="text-[var(--text)]">Add to Home screen</strong>. If it is unavailable, your browser may not support installation yet.</>}
        </div>
      )}
    </section>
  );
}

export function InstallTip() {
  const { installed, canPrompt, isIos, install } = usePwaInstall();
  const [visible, setVisible] = useState(false);
  const [instructions, setInstructions] = useState(false);

  useEffect(() => {
    if (installed || (!canPrompt && !isIos) || !window.matchMedia("(max-width: 767px)").matches) return;
    try {
      if (localStorage.getItem(TIP_KEY)) return;
    } catch { /* A disabled localStorage should not prevent installation. */ }
    const timer = window.setTimeout(() => setVisible(true), 1400);
    return () => window.clearTimeout(timer);
  }, [installed, canPrompt, isIos]);

  function dismiss() {
    setVisible(false);
    try { localStorage.setItem(TIP_KEY, "1"); } catch { /* non-critical preference */ }
  }

  async function beginInstall() {
    const result = await install();
    if (result === "accepted" || result === "installed") dismiss();
    else if (result === "ios") setInstructions(true);
  }

  if (!visible || installed) return null;
  return (
    <aside className="fixed bottom-[calc(var(--app-bottom-nav-height)+0.75rem)] left-[max(0.75rem,var(--safe-left))] right-[max(0.75rem,var(--safe-right))] z-[45] mx-auto max-w-md rounded-2xl border border-[rgb(var(--accent-rgb)/0.35)] bg-[var(--bg-elevated)] p-4 shadow-2xl backdrop-blur-xl" aria-label="Install PBox">
      <button type="button" onClick={dismiss} className="absolute right-1 top-1 grid size-11 place-items-center rounded-full text-[var(--text-muted)]" aria-label="Dismiss installation tip"><X className="size-4" /></button>
      <div className="pr-9"><p className="font-display font-bold">Keep PBox close</p><p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">{instructions ? "In Safari, tap Share, then Add to Home Screen." : "Install PBox for a cleaner full-screen experience on this phone."}</p></div>
      {!instructions && <Button size="sm" className="mt-3 min-h-11" onClick={() => void beginInstall()}><Download className="size-4" /> Install</Button>}
    </aside>
  );
}
