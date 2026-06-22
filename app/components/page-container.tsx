"use client";

import { type ReactNode, useRef, useState } from "react";
import { Page, Preloader } from "konsta/react";
import BottomSearchBar from "./bottom-search-bar";
import PageHeader from "./page-header";

type PageContainerProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string | React.ReactNode;
  onSearch?: (query: string) => void;
  onRefresh?: () => Promise<void> | void;
  isRefreshing?: boolean;
  isLoading?: boolean;
};

export default function PageContainer({
  children,
  title,
  subtitle,
  onSearch,
  onRefresh,
  isRefreshing = false,
  isLoading = false,
}: PageContainerProps) {
  const pageRef = useRef<HTMLDivElement | null>(null);
  const pullStartYRef = useRef<number | null>(null);
  const pullTriggeredRef = useRef(false);
  const [pullDistance, setPullDistance] = useState(0);

  const maxPullDistance = 72;
  const refreshThreshold = 52;
  const canPullToRefresh = Boolean(onRefresh) && !isRefreshing;

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!canPullToRefresh) {
      return;
    }

    if ((pageRef.current?.scrollTop ?? 0) > 0) {
      pullStartYRef.current = null;
      return;
    }

    pullStartYRef.current = event.touches[0]?.clientY ?? null;
    pullTriggeredRef.current = false;
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!canPullToRefresh || pullStartYRef.current === null) {
      return;
    }

    if ((pageRef.current?.scrollTop ?? 0) > 0) {
      pullStartYRef.current = null;
      setPullDistance(0);
      return;
    }

    const currentY = event.touches[0]?.clientY ?? pullStartYRef.current;
    const deltaY = currentY - pullStartYRef.current;

    if (deltaY <= 0) {
      setPullDistance(0);
      return;
    }

    const nextDistance = Math.min(maxPullDistance, deltaY * 0.45);
    setPullDistance(nextDistance);

    if (event.cancelable) {
      event.preventDefault();
    }
  };

  const resetPullState = () => {
    pullStartYRef.current = null;
    pullTriggeredRef.current = false;
    setPullDistance(0);
  };

  const handleTouchEnd = () => {
    if (!canPullToRefresh) {
      resetPullState();
      return;
    }

    if (
      pullDistance >= refreshThreshold &&
      onRefresh &&
      !pullTriggeredRef.current
    ) {
      pullTriggeredRef.current = true;
      void Promise.resolve(onRefresh()).finally(() => {
        pullTriggeredRef.current = false;
      });
    }

    resetPullState();
  };

  const showPullIndicator = isRefreshing || pullDistance > 0;
  const indicatorOffset = isRefreshing
    ? refreshThreshold
    : Math.min(pullDistance, refreshThreshold);

  return (
    <Page
      ref={pageRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <PageHeader title={title} subtitle={subtitle} isLoading={isLoading} />

      <div
        className="pointer-events-none sticky top-[max(16px,var(--k-safe-area-top))] z-20 flex justify-center"
        style={{
          height: 0,
          opacity: showPullIndicator ? 1 : 0,
          transform: `translateY(${indicatorOffset}px + 4px)`,
          transition:
            pullDistance > 0
              ? "none"
              : "opacity 180ms ease, transform 180ms ease",
        }}
      >
        <div className="rounded-full  px-3 py-2 shadow-sm backdrop-blur-sm ">
          <Preloader className="scale-75 text-foreground/75" />
        </div>
      </div>

      <main
        className="transition-opacity duration-500"
        style={{
          opacity: 1,
          visibility: "visible",
          transform: showPullIndicator
            ? `translateY(${indicatorOffset}px)`
            : "translateY(0)",
          transition:
            pullDistance > 0
              ? "none"
              : "transform 180ms ease, opacity 500ms ease",
        }}
        aria-hidden={false}
      >
        {children}
      </main>
      <BottomSearchBar onSearch={onSearch} />
    </Page>
  );
}
