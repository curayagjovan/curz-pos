"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export type SalesPeriodSummary = {
  rangeStart: string;
  rangeEnd: string;
  salesTotal: number;
  netSalesTotal: number;
  refundedTotal: number;
  voidedTotal: number;
  voidedCount: number;
  pendingTotal: number;
  pendingCount: number;
  orderCount: number;
};

export type SalesSummary = {
  day: SalesPeriodSummary;
  week: SalesPeriodSummary;
  month: SalesPeriodSummary;
  year: SalesPeriodSummary;
};

async function fetchSalesSummary(dateIso: string): Promise<SalesSummary> {
  const params = new URLSearchParams({ date: dateIso });
  const response = await fetch(`/api/orders/summary?${params.toString()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to load the sales report");
  }

  return (await response.json()) as SalesSummary;
}

// Day/week/month/year totals anchored to whatever date the sales page has
// selected — a single aggregate request instead of pulling raw order rows
// for a month or year's worth of sales onto the client.
export function useSalesSummary(dateIso: string) {
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  // Silent background refreshes (realtime/poll/focus) update the data
  // without flipping the loading flag — the report is already on screen,
  // so there's nothing useful a spinner would communicate there.
  const runFetch = useCallback(
    async (silent: boolean) => {
      const requestId = (requestIdRef.current += 1);
      if (!silent) {
        setLoading(true);
      }
      setError(null);

      try {
        const data = await fetchSalesSummary(dateIso);
        if (requestIdRef.current === requestId) {
          setSummary(data);
        }
      } catch (err) {
        if (requestIdRef.current === requestId) {
          setError(
            err instanceof Error ? err.message : "Unable to load the sales report",
          );
        }
      } finally {
        if (requestIdRef.current === requestId && !silent) {
          setLoading(false);
        }
      }
    },
    [dateIso],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!cancelled) {
        await runFetch(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [runFetch]);

  // The report only ever refetched when the selected date changed or the
  // current device itself changed a sale's status — any sale rung up
  // elsewhere (another cashier's phone, a different page on this one) left
  // it stale until one of those happened to fire. Mirror the same
  // realtime/poll/focus wiring the shared transactions context uses so this
  // figure stays live too.
  useEffect(() => {
    let refreshTimeoutId: number | null = null;

    const scheduleRefresh = () => {
      if (refreshTimeoutId !== null) {
        return;
      }

      refreshTimeoutId = window.setTimeout(() => {
        refreshTimeoutId = null;
        void runFetch(true);
      }, 400);
    };

    const channel = supabase
      .channel("sales-summary-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "Order" },
        scheduleRefresh,
      )
      .subscribe();

    return () => {
      if (refreshTimeoutId !== null) {
        window.clearTimeout(refreshTimeoutId);
      }
      void supabase.removeChannel(channel);
    };
  }, [runFetch]);

  useEffect(() => {
    const POLL_MS = 15000;

    const refreshIfVisible = () => {
      if (document.visibilityState !== "visible") {
        return;
      }
      void runFetch(true);
    };

    const intervalId = window.setInterval(refreshIfVisible, POLL_MS);
    window.addEventListener("focus", refreshIfVisible);
    document.addEventListener("visibilitychange", refreshIfVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshIfVisible);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [runFetch]);

  useEffect(() => {
    const handlePullToRefresh = () => {
      void runFetch(false);
    };

    window.addEventListener("app:pull-to-refresh", handlePullToRefresh);
    return () => {
      window.removeEventListener("app:pull-to-refresh", handlePullToRefresh);
    };
  }, [runFetch]);

  const refetch = useCallback(() => runFetch(false), [runFetch]);

  return { summary, loading, error, refetch };
}
