"use client";

import { useEffect, useRef } from "react";

// Preloads this device's push subscription endpoint so order creation can
// tell the server which device made the sale — that device is excluded from
// the checkout push notification. A ref (not state) because the value is
// only read inside submit handlers and must never block rendering.
export function useSenderPushEndpoint() {
  const endpointRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    let active = true;

    const preloadSenderEndpoint = async () => {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window)
      ) {
        return;
      }

      try {
        const registration =
          (await navigator.serviceWorker.getRegistration()) ||
          (await navigator.serviceWorker.ready);
        const subscription = await registration.pushManager.getSubscription();

        if (active) {
          endpointRef.current = subscription?.endpoint;
        }
      } catch {
        if (active) {
          endpointRef.current = undefined;
        }
      }
    };

    void preloadSenderEndpoint();

    return () => {
      active = false;
    };
  }, []);

  return endpointRef;
}
