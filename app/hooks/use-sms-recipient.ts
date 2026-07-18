"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_SMS_RECIPIENT } from "@/lib/sms-link";

export function useSmsRecipient() {
  const [number, setNumber] = useState(DEFAULT_SMS_RECIPIENT);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/sms-recipient")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled && data && typeof data.number === "string") {
          setNumber(data.number);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  const updateNumber = useCallback(async (next: string) => {
    const response = await fetch("/api/sms-recipient", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ number: next }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.message || "Unable to save recipient number");
    }

    setNumber(data.number);
  }, []);

  return { number, updateNumber };
}
