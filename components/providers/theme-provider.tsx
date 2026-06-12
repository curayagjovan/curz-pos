"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { App as AntdApp, ConfigProvider, theme } from "antd";

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

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(mediaQuery.matches);

    update();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", update);
      return () => mediaQuery.removeEventListener("change", update);
    }

    mediaQuery.addListener(update);
    return () => mediaQuery.removeListener(update);
  }, []);

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

  const token = useMemo(
    () => ({
      colorPrimary: "#0b6bcb",
      borderRadius: 12,
      fontFamily: "var(--font-inter), sans-serif",
      fontSize: isMobile ? 13 : 14,
      fontSizeSM: isMobile ? 12 : 13,
      fontSizeLG: isMobile ? 15 : 16,
      lineHeight: isMobile ? 1.4 : 1.5,
      lineHeightSM: isMobile ? 1.35 : 1.4,
      lineHeightLG: isMobile ? 1.45 : 1.55,
      controlHeight: isMobile ? 36 : 40,
      controlHeightSM: isMobile ? 30 : 32,
      controlHeightLG: isMobile ? 42 : 48,
    }),
    [isMobile],
  );

  return (
    <ThemeModeContext.Provider value={value}>
      <ConfigProvider
        theme={{
          algorithm:
            mode === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token,
        }}
      >
        <AntdApp>{children}</AntdApp>
      </ConfigProvider>
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
