"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_EWALLET_FEE_SETTINGS,
  type EWalletFeeSettings,
} from "@/lib/ewallet-fee";

export function useEwalletFeeSettings() {
  const [settings, setSettings] = useState<EWalletFeeSettings>(
    DEFAULT_EWALLET_FEE_SETTINGS,
  );

  useEffect(() => {
    let cancelled = false;

    fetch("/api/ewallet-fee")
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

  const updateSettings = useCallback(async (next: EWalletFeeSettings) => {
    const response = await fetch("/api/ewallet-fee", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.message || "Unable to save fee settings");
    }

    setSettings(data);
  }, []);

  return { settings, updateSettings };
}
