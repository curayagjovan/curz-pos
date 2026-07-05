"use client";

import { useEffect } from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { PageProvider } from "@/app/context/page-context";
import { CartProvider } from "@/app/context/cart-context";
import { ProductsProvider } from "@/app/context/products-context";
import { TransactionsProvider } from "@/app/context/transactions-context";
import appTheme from "@/app/theme";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const normalized = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(normalized);
  const output = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    output[i] = rawData.charCodeAt(i);
  }

  return output;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const syncPushSubscription = async () => {
      if (
        !("Notification" in window) ||
        !("PushManager" in window) ||
        !VAPID_PUBLIC_KEY
      ) {
        return;
      }

      if (Notification.permission !== "granted") {
        return;
      }

      const registration =
        (await navigator.serviceWorker.getRegistration()) ||
        (await navigator.serviceWorker.ready);

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      await fetch("/api/push-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userAgent: navigator.userAgent,
        }),
      });
    };

    const requestAndSync = async () => {
      if (!("Notification" in window) || !VAPID_PUBLIC_KEY) {
        return;
      }

      if (Notification.permission === "default") {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          return;
        }
      }

      await syncPushSubscription();
    };

    const registerAndPrime = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js");
      } catch {
        return;
      }

      syncPushSubscription().catch(() => undefined);

      const syncWhenVisible = () => {
        if (document.visibilityState !== "visible") {
          return;
        }

        syncPushSubscription().catch(() => undefined);
      };

      const onFocus = () => {
        syncPushSubscription().catch(() => undefined);
      };

      const onFirstInteraction = () => {
        requestAndSync().catch(() => undefined);
        window.removeEventListener("pointerdown", onFirstInteraction);
        window.removeEventListener("touchend", onFirstInteraction);
        window.removeEventListener("click", onFirstInteraction);
        window.removeEventListener("keydown", onFirstInteraction);
      };

      window.addEventListener("pointerdown", onFirstInteraction, {
        once: true,
      });
      window.addEventListener("touchend", onFirstInteraction, {
        once: true,
      });
      window.addEventListener("click", onFirstInteraction, {
        once: true,
      });
      window.addEventListener("keydown", onFirstInteraction, {
        once: true,
      });

      window.addEventListener("focus", onFocus);
      document.addEventListener("visibilitychange", syncWhenVisible);

      return () => {
        window.removeEventListener("focus", onFocus);
        document.removeEventListener("visibilitychange", syncWhenVisible);
      };
    };

    let cleanup: (() => void) | undefined;

    registerAndPrime()
      .then((dispose) => {
        cleanup = dispose;
      })
      .catch(() => undefined);

    return () => {
      cleanup?.();
    };
  }, []);

  return (
    <AppRouterCacheProvider options={{ enableCssLayer: true }}>
      <ThemeProvider
        theme={appTheme}
        defaultMode="system"
        disableTransitionOnChange
      >
        <CssBaseline enableColorScheme />
        <PageProvider>
          <ProductsProvider>
            <TransactionsProvider>
              <CartProvider>{children}</CartProvider>
            </TransactionsProvider>
          </ProductsProvider>
        </PageProvider>
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
