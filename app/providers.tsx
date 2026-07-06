"use client";

import { useEffect, useState } from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import Button from "@mui/material/Button";
import CssBaseline from "@mui/material/CssBaseline";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
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
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return false;
    }

    return Notification.permission !== "granted";
  });
  const [notificationBusy, setNotificationBusy] = useState(false);
  const [notificationError, setNotificationError] = useState<string | null>(
    null,
  );
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | "unsupported"
  >(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "unsupported";
    }

    return Notification.permission;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    if (!("Notification" in window)) {
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
        setNotificationPermission(Notification.permission);
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

      setNotificationPermission("granted");
      setNotificationDialogOpen(false);
    };

    const requestAndSync = async () => {
      if (!("Notification" in window) || !VAPID_PUBLIC_KEY) {
        return;
      }

      if (Notification.permission === "default") {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        if (permission !== "granted") {
          setNotificationDialogOpen(true);
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

  const handleEnableNotifications = async () => {
    setNotificationError(null);

    if (notificationPermission === "unsupported") {
      return;
    }

    if (typeof window === "undefined" || !("Notification" in window)) {
      return;
    }

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setNotificationError(
        "This browser does not fully support push notifications.",
      );
      setNotificationDialogOpen(true);
      return;
    }

    if (!VAPID_PUBLIC_KEY) {
      setNotificationError(
        "Push notifications are not configured for this app yet.",
      );
      setNotificationDialogOpen(true);
      return;
    }

    if (Notification.permission === "denied") {
      setNotificationPermission("denied");
      setNotificationError(
        "Notifications are blocked in Chrome. Re-enable notifications for this site in Chrome settings.",
      );
      setNotificationDialogOpen(true);
      return;
    }

    setNotificationBusy(true);

    try {
      if (Notification.permission === "default") {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);

        if (permission !== "granted") {
          if (permission === "denied") {
            setNotificationError(
              "Notifications are blocked in Chrome. Re-enable notifications for this site in Chrome settings.",
            );
          }

          setNotificationDialogOpen(true);
          return;
        }
      }

      if (Notification.permission !== "granted") {
        setNotificationDialogOpen(true);
        return;
      }

      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register("/sw.js");
      }

      if (!registration) {
        registration = await navigator.serviceWorker.ready;
      }

      if (!registration) {
        throw new Error("Service worker registration is unavailable");
      }

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      if (subscription) {
        const response = await fetch("/api/push-subscriptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscription: subscription.toJSON(),
            userAgent: navigator.userAgent,
          }),
        });

        if (!response.ok) {
          throw new Error("Unable to save push subscription");
        }
      }

      setNotificationPermission("granted");
      setNotificationDialogOpen(false);
      setNotificationError(null);
    } catch {
      setNotificationError(
        "Unable to enable notifications right now. Please try again.",
      );
      setNotificationDialogOpen(true);
    } finally {
      setNotificationBusy(false);
    }
  };

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
        <Dialog
          open={notificationDialogOpen}
          onClose={() => setNotificationDialogOpen(false)}
          fullWidth
          maxWidth="xs"
        >
          <DialogTitle>Enable Notifications</DialogTitle>
          <DialogContent>
            <DialogContentText>
              {notificationPermission === "denied"
                ? "Notifications are currently blocked for SHOPMAE. Re-enable them in your device settings or reinstall the Home Screen app, then try again."
                : "Turn on notifications so checkout alerts and cross-device updates reach this device."}
            </DialogContentText>
            {notificationError ? (
              <DialogContentText sx={{ mt: 1.25, color: "error.main" }}>
                {notificationError}
              </DialogContentText>
            ) : null}
          </DialogContent>
          <DialogActions sx={{ px: 2, pb: 2 }}>
            <Button onClick={() => setNotificationDialogOpen(false)}>
              Not now
            </Button>
            <Button
              variant="contained"
              disabled={notificationBusy}
              onClick={() => void handleEnableNotifications()}
            >
              {notificationBusy ? "Enabling..." : "Enable notifications"}
            </Button>
          </DialogActions>
        </Dialog>
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
