"use client";

import { useEffect, useState } from "react";
import { App } from "konsta/react";

export default function KonstaProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = (matches: boolean) => {
      setIsDark(matches);
      document.documentElement.dataset.theme = matches ? "dark" : "light";
    };

    applyTheme(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      applyTheme(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return (
    <App dark={isDark} safeAreas theme="ios">
      {children}
    </App>
  );
}
