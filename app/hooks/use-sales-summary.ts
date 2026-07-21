"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

  useEffect(() => {
    let cancelled = false;

    const runFetch = async () => {
      const requestId = (requestIdRef.current += 1);
      setLoading(true);
      setError(null);

      try {
        const data = await fetchSalesSummary(dateIso);
        if (!cancelled && requestIdRef.current === requestId) {
          setSummary(data);
        }
      } catch (err) {
        if (!cancelled && requestIdRef.current === requestId) {
          setError(
            err instanceof Error ? err.message : "Unable to load the sales report",
          );
        }
      } finally {
        if (!cancelled && requestIdRef.current === requestId) {
          setLoading(false);
        }
      }
    };

    runFetch();

    return () => {
      cancelled = true;
    };
  }, [dateIso]);

  const refetch = useCallback(async () => {
    const requestId = (requestIdRef.current += 1);
    setLoading(true);
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
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [dateIso]);

  return { summary, loading, error, refetch };
}
