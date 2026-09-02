"use client";

import { useEffect } from "react";
import { useSyncExternalStore } from "react";
import { installConnectivityFetchTracking } from "@/lib/connectivity-fetch";
import {
  getIsOnline,
  getServerIsOnline,
  markOffline,
  markOnline,
  subscribeConnectivity,
} from "@/lib/connectivity-store";

export function useConnectivity() {
  const isOnline = useSyncExternalStore(
    subscribeConnectivity,
    getIsOnline,
    getServerIsOnline,
  );

  useEffect(() => {
    installConnectivityFetchTracking();

    if (!navigator.onLine) {
      markOffline();
    }

    const handleOnline = () => {
      // The interface coming back up doesn't guarantee the network is
      // actually reachable yet — confirm with a real request instead of
      // assuming. Use HEAD so the service worker's GET-only fetch handler
      // (public/sw.js) doesn't intercept it and mask a real outage behind
      // a cached response; connectivity-fetch marks us offline again if
      // this fails.
      fetch("/api/orders", { method: "HEAD", cache: "no-store" }).catch(
        () => undefined,
      );
    };
    const handleOffline = () => markOffline();

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}

export { markOnline, markOffline };
