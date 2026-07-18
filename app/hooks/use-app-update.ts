"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// The service worker (public/sw.js) calls self.skipWaiting() + clients.claim()
// unconditionally, so a new deploy silently takes over the page's network
// layer in the background. What it can't do is swap the JS/HTML this tab
// already has in memory — that still needs a reload. This hook detects that
// a newer service worker has taken control while the tab stayed open, so the
// UI can prompt for a reload instead of the user having to close and reopen.
export function useAppUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    // A controllerchange only means "an update just took over" when this tab
    // was already being controlled by some worker before it fired — the very
    // first activation (fresh install) fires one too, and that's not an
    // update worth prompting for. Deliberately NOT checking registration.waiting
    // at mount time here: two update checks racing in quick succession (e.g. a
    // reload landing right after this tab's own update finished) can leave a
    // byte-identical, permanently-stale worker parked in .waiting that never
    // progresses — treating that as "update available" produces a banner that
    // never goes away. Only react to updates that happen while this hook is
    // actually watching.
    let hadController = Boolean(navigator.serviceWorker.controller);
    let disposed = false;

    const handleControllerChange = () => {
      if (hadController) {
        setUpdateAvailable(true);
      }
      hadController = true;
    };

    const trackInstallingWorker = (worker: ServiceWorker | null) => {
      if (!worker) {
        return;
      }

      worker.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          setUpdateAvailable(true);
        }
      });
    };

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        if (disposed) {
          return;
        }

        registrationRef.current = registration;

        trackInstallingWorker(registration.installing);
        registration.addEventListener("updatefound", () => {
          trackInstallingWorker(registration.installing);
        });
      } catch {
        // Registration is best-effort here — providers.tsx already owns the
        // primary registration for push notifications.
      }
    };

    void register();

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      handleControllerChange,
    );

    // The browser only checks for a new sw.js on navigation and roughly every
    // 24h on its own, which is too slow for a tab left open all day. Poking
    // registration.update() whenever the tab regains focus catches deploys
    // much sooner.
    const checkForUpdate = () => {
      registrationRef.current?.update().catch(() => undefined);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkForUpdate();
      }
    };

    window.addEventListener("focus", checkForUpdate);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      disposed = true;
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange,
      );
      window.removeEventListener("focus", checkForUpdate);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const applyUpdate = useCallback(() => {
    registrationRef.current?.waiting?.postMessage({ type: "SKIP_WAITING" });
    window.location.reload();
  }, []);

  return { updateAvailable, applyUpdate };
}
