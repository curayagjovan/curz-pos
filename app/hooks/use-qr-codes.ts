"use client";

import { useCallback, useEffect, useState } from "react";
import type { EWalletProvider } from "@/lib/ewallet-catalog";

export type QrCodeUrls = Record<EWalletProvider, string | null>;

export function useQrCodes() {
  const [urls, setUrls] = useState<QrCodeUrls>({ GCASH: null, MAYA: null });

  useEffect(() => {
    let cancelled = false;

    fetch("/api/qr-codes")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled && data) {
          setUrls({ GCASH: data.GCASH ?? null, MAYA: data.MAYA ?? null });
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  const uploadQrCode = useCallback(
    async (provider: EWalletProvider, file: File) => {
      const form = new FormData();
      form.append("provider", provider);
      form.append("file", file);

      const response = await fetch("/api/qr-codes", {
        method: "POST",
        body: form,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || "Unable to upload QR code");
      }

      setUrls((current) => ({ ...current, [provider]: data.url }));
    },
    [],
  );

  return { qrCodeUrls: urls, uploadQrCode };
}
