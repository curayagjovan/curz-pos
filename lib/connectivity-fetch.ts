import { markOffline, markOnline } from "@/lib/connectivity-store";

type PatchedFetch = typeof fetch & { __connectivityPatched?: boolean };

// navigator.onLine only reflects whether a network interface is up, not
// whether requests actually succeed (e.g. a weak wifi signal that's
// "connected" but can't reach the server). Wrapping fetch lets every
// request the app already makes double as a connectivity probe, without
// touching each call site.
export function installConnectivityFetchTracking() {
  if (typeof window === "undefined") {
    return;
  }

  const currentFetch = window.fetch as PatchedFetch;
  if (currentFetch.__connectivityPatched) {
    return;
  }

  const originalFetch = window.fetch.bind(window);

  const patchedFetch: PatchedFetch = async (...args) => {
    try {
      const response = await originalFetch(...args);
      markOnline();
      return response;
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        markOffline();
      }
      throw error;
    }
  };

  patchedFetch.__connectivityPatched = true;
  window.fetch = patchedFetch;
}
