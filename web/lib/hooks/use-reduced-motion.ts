"use client";

import { useEffect, useState } from "react";

/** Combines the OS preference with PBox's explicit Appearance setting. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const read = () => setReduced(media.matches || document.documentElement.classList.contains("pb-reduce-motion"));
    const observer = new MutationObserver(read);
    read();
    media.addEventListener("change", read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => {
      media.removeEventListener("change", read);
      observer.disconnect();
    };
  }, []);

  return reduced;
}
