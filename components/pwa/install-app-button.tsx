"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Button, Modal, Typography } from "antd";
import { DownloadOutlined } from "@ant-design/icons";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type InstallAppButtonProps = {
  size?: "small" | "middle" | "large";
};

function isIosDevice() {
  if (typeof navigator === "undefined") {
    return false;
  }

  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua);
}

function isStandaloneMode() {
  if (typeof window === "undefined") {
    return false;
  }

  const navigatorWithStandalone = navigator as Navigator & {
    standalone?: boolean;
  };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  );
}

function subscribeStandaloneMode(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const mediaQuery = window.matchMedia("(display-mode: standalone)");
  const onChange = () => onStoreChange();

  if (typeof mediaQuery.addEventListener === "function") {
    mediaQuery.addEventListener("change", onChange);
  } else {
    mediaQuery.addListener(onChange);
  }

  window.addEventListener("appinstalled", onChange);

  return () => {
    if (typeof mediaQuery.removeEventListener === "function") {
      mediaQuery.removeEventListener("change", onChange);
    } else {
      mediaQuery.removeListener(onChange);
    }
    window.removeEventListener("appinstalled", onChange);
  };
}

export function InstallAppButton({ size = "middle" }: InstallAppButtonProps) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const hasMounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const isStandalone = useSyncExternalStore(
    subscribeStandaloneMode,
    isStandaloneMode,
    () => false,
  );

  const isiOS = useMemo(() => isIosDevice(), []);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  if (!hasMounted) {
    return null;
  }

  if (isStandalone) {
    return null;
  }

  const onInstallClick = async () => {
    if (isiOS) {
      setShowIosHelp(true);
      return;
    }

    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
      return;
    }
    setDeferredPrompt(null);
  };

  if (!isiOS && !deferredPrompt) {
    return null;
  }

  return (
    <>
      <Button
        size={size}
        icon={<DownloadOutlined />}
        onClick={() => {
          void onInstallClick();
        }}
      >
        Download App
      </Button>
      <Modal
        title="Install Curz POS"
        open={showIosHelp}
        onCancel={() => setShowIosHelp(false)}
        onOk={() => setShowIosHelp(false)}
        okText="Got it"
        cancelButtonProps={{ style: { display: "none" } }}
      >
        <Typography.Paragraph style={{ marginBottom: 8 }}>
          On iPhone/iPad, install works through Safari Share menu.
        </Typography.Paragraph>
        <Typography.Paragraph style={{ marginBottom: 0 }}>
          Tap <strong>Share</strong>, then choose{" "}
          <strong>Add to Home Screen</strong>.
        </Typography.Paragraph>
      </Modal>
    </>
  );
}
