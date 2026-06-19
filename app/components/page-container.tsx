"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Page } from "konsta/react";
import BottomSearchBar from "./bottom-search-bar";
import PageHeader from "./page-header";
import SplashScreen from "./splash-screen";

type PageContainerProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  splashMode?: "auto" | "always" | "never";
  splashDurationMs?: number;
  splashAppName?: string;
  splashLabel?: string;
};

const SPLASH_ROUTES = new Set(["/", "/products"]);
const SPLASH_SESSION_KEY = "shopmae:splash-seen";

export default function PageContainer({
  children,
  title,
  subtitle,
  splashMode = "auto",
  splashDurationMs = 1700,
  splashAppName,
  splashLabel,
}: PageContainerProps) {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  // Keep initial SSR/client render deterministic, then compute splash on mount.
  const [splashVisible, setSplashVisible] = useState(false);
  const [contentVisible, setContentVisible] = useState(true);

  useEffect(() => {
    const mountId = window.setTimeout(() => {
      setIsMounted(true);
    }, 0);

    return () => window.clearTimeout(mountId);
  }, []);

  useEffect(() => {
    if (!isMounted) {
      return;
    }

    const hasSeenSplashThisSession =
      window.sessionStorage.getItem(SPLASH_SESSION_KEY) === "1";

    const shouldShowSplash =
      splashMode === "always" ||
      (splashMode === "auto" &&
        SPLASH_ROUTES.has(pathname) &&
        !hasSeenSplashThisSession);

    const showOrResetId = window.setTimeout(() => {
      if (!shouldShowSplash) {
        setSplashVisible(false);
        setContentVisible(true);
        return;
      }

      setSplashVisible(true);
      setContentVisible(false);
    }, 0);

    if (!shouldShowSplash) {
      return () => window.clearTimeout(showOrResetId);
    }

    const hideId = window.setTimeout(() => {
      setSplashVisible(false);
      setContentVisible(true);

      if (splashMode === "auto") {
        window.sessionStorage.setItem(SPLASH_SESSION_KEY, "1");
      }
    }, splashDurationMs);

    return () => {
      window.clearTimeout(showOrResetId);
      window.clearTimeout(hideId);
    };
  }, [isMounted, pathname, splashDurationMs, splashMode]);

  return (
    <Page>
      <PageHeader title={title} subtitle={subtitle} />

      <main
        className="transition-opacity duration-500"
        style={{
          opacity: contentVisible ? 1 : 0,
          visibility: contentVisible ? "visible" : "hidden",
        }}
        aria-hidden={!contentVisible}
      >
        {children}
      </main>
      <BottomSearchBar />
      <SplashScreen
        visible={splashVisible}
        appName={splashAppName}
        label={splashLabel}
      />
    </Page>
  );
}
