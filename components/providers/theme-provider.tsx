"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type ThemeMode = "light" | "dark";

type ThemeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
};

const ThemeModeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "curz-theme-mode";

type ThemeProviderProps = {
  children: React.ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [mode, setModeState] = useState<ThemeMode>("light");
  const [hydratedFromSettings, setHydratedFromSettings] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Load theme mode on mount
  useEffect(() => {
    const loadThemeMode = async () => {
      try {
        const response = await fetch("/api/settings", { cache: "no-store" });
        if (response.ok) {
          const data = (await response.json()) as { themeMode?: ThemeMode };
          if (data.themeMode === "light" || data.themeMode === "dark") {
            setModeState(data.themeMode);
            setHydratedFromSettings(true);
            return;
          }
        }
      } catch {
        // Ignore and fallback to local preference.
      }

      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "light" || saved === "dark") {
        setModeState(saved);
        setHydratedFromSettings(true);
        return;
      }

      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      setModeState(prefersDark ? "dark" : "light");
      setHydratedFromSettings(true);
    };

    void loadThemeMode();
  }, []);

  useEffect(() => {
    if (!hydratedFromSettings) {
      return;
    }

    document.documentElement.setAttribute("data-theme", mode);
    window.localStorage.setItem(STORAGE_KEY, mode);

    void fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ themeMode: mode }),
    });
  }, [mode, hydratedFromSettings]);

  const value = useMemo(
    () => ({
      mode,
      setMode: (nextMode: ThemeMode) => setModeState(nextMode),
      toggleMode: () => {
        setModeState((current) => (current === "light" ? "dark" : "light"));
      },
    }),
    [mode],
  );

  return (
    <ThemeModeContext.Provider value={value}>
      {children}
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode() {
  const context = useContext(ThemeModeContext);
  if (!context) {
    throw new Error("useThemeMode must be used within ThemeProvider");
  }

  return context;
}
