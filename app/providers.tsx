"use client";

import { ConfigProvider } from "antd-mobile";
import { useEffect } from "react";

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const applyScheme = (isDark: boolean) => {
      document.documentElement.setAttribute(
        "data-prefers-color-scheme",
        isDark ? "dark" : "light",
      );
      document.documentElement.setAttribute(
        "data-theme",
        isDark ? "dark" : "light",
      );
    };

    applyScheme(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      applyScheme(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return <ConfigProvider>{children}</ConfigProvider>;
}
