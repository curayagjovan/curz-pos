"use client";

import { useEffect } from "react";
import { App } from "konsta/react";

export default function KonstaProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = (isDark: boolean) => {
      const root = document.documentElement;
      root.dataset.theme = isDark ? "dark" : "light";
      root.classList.toggle("dark", isDark);
    };

    applyTheme(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      applyTheme(event.matches);
    };

    const syncFromSystem = () => {
      applyTheme(window.matchMedia("(prefers-color-scheme: dark)").matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    document.addEventListener("visibilitychange", syncFromSystem);
    window.addEventListener("pageshow", syncFromSystem);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
      document.removeEventListener("visibilitychange", syncFromSystem);
      window.removeEventListener("pageshow", syncFromSystem);
    };
  }, []);

  return (
    <App safeAreas theme="ios">
      {children}
    </App>
  );
}
