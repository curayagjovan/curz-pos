"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
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

const SPLASH_ROUTES = new Set(["/products"]);
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
  const [hasSeenSplashThisSession] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.sessionStorage.getItem(SPLASH_SESSION_KEY) === "1";
  });

  const showSplash = useMemo(() => {
    if (splashMode === "always") {
      return true;
    }

    if (splashMode === "never") {
      return false;
    }

    return SPLASH_ROUTES.has(pathname) && !hasSeenSplashThisSession;
  }, [hasSeenSplashThisSession, pathname, splashMode]);

  const [splashDone, setSplashDone] = useState(() => !showSplash);

  useEffect(() => {
    if (!showSplash) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSplashDone(true);

      if (splashMode === "auto") {
        window.sessionStorage.setItem(SPLASH_SESSION_KEY, "1");
      }
    }, splashDurationMs);

    return () => window.clearTimeout(timeoutId);
  }, [showSplash, splashDurationMs, splashMode]);

  return (
    <Page>
      <PageHeader title={title} subtitle={subtitle} />

      <main
        className="transition-opacity duration-500"
        style={{
          opacity: splashDone ? 1 : 0,
          visibility: splashDone ? "visible" : "hidden",
        }}
        aria-hidden={!splashDone}
      >
        {children}
      </main>
      <BottomSearchBar />
      <SplashScreen
        visible={!splashDone}
        appName={splashAppName}
        label={splashLabel}
      />
    </Page>
  );
}
