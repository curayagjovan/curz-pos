"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Transaction } from "@/types/transaction";

function normalizeTransaction(transaction: Transaction): Transaction {
  return {
    ...transaction,
    items: Array.isArray(transaction.items) ? transaction.items : [],
  };
}

async function fetchOrdersInRange(startIso: string, endIso: string) {
  const params = new URLSearchParams({ from: startIso, to: endIso });
  const response = await fetch(`/api/orders?${params.toString()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to load sales for this range");
  }

  const data = await response.json();
  return (Array.isArray(data) ? data : []).map(
    normalizeTransaction,
  ) as Transaction[];
}

// The shared transactions context only ever holds the latest ~100 orders
// plus whatever a device happened to cache locally in the past — fine for
// "recent activity", but it silently drops older periods once sales volume
// pushes them out of that window. This hook fetches a specific date range
// directly from the server so navigating to an older week always shows the
// real data, not whatever happens to still be cached on this device.
export function useTransactionsInRange(startIso: string, endIso: string) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  // Silent background refreshes (realtime/poll/focus) swap in fresh data
  // without flipping the loading flag — the range is already on screen, so
  // a spinner would just be noise.
  const runFetch = useCallback(
    async (silent: boolean) => {
      const requestId = (requestIdRef.current += 1);
      if (!silent) {
        setLoading(true);
      }
      setError(null);

      try {
        const items = await fetchOrdersInRange(startIso, endIso);
        if (requestIdRef.current === requestId) {
          setTransactions(items);
        }
      } catch (err) {
        if (requestIdRef.current === requestId) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load sales for this range",
          );
        }
      } finally {
        if (requestIdRef.current === requestId && !silent) {
          setLoading(false);
        }
      }
    },
    [startIso, endIso],
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

  // This range fetch used to only refresh on date-change or an explicit
  // refetch() from this device's own status updates — anything that changed
  // an order elsewhere (another cashier's phone, a direct database fix)
  // left it stale until one of those happened to fire, at which point the
  // page's merge logic would keep trusting the stale locally-cached copy
  // over this fetch. Mirror the transactions context's realtime/poll/focus
  // wiring so this range is never the stale side of that merge.
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
      .channel("orders-range-realtime")
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

  return { transactions, loading, error, refetch };
}
