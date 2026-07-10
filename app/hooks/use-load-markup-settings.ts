"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_LOAD_MARKUP_SETTINGS,
  type LoadMarkupSettings,
} from "@/lib/load-markup";

export function useLoadMarkupSettings() {
  const [settings, setSettings] = useState<LoadMarkupSettings>(
    DEFAULT_LOAD_MARKUP_SETTINGS,
  );

  useEffect(() => {
    let cancelled = false;

    fetch("/api/load-markup")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled && data) {
          setSettings(data);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  const updateSettings = useCallback(async (next: LoadMarkupSettings) => {
    const response = await fetch("/api/load-markup", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.message || "Unable to save markup settings");
    }

    setSettings(data);
  }, []);

  return { settings, updateSettings };
}
