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

async function fetchUnassignedPendingOrders() {
  const response = await fetch("/api/orders?status=PENDING&customerId=none", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to load unassigned pending sales");
  }

  const data = await response.json();
  return (Array.isArray(data) ? data : []).map(
    normalizeTransaction,
  ) as Transaction[];
}

// Surfaces PENDING sales with no customer at all — either never assigned
// one, or detached via the Utang page's "Remove from Customer" action — so
// they can be picked up and attributed to the right person instead of
// getting lost. Mirrors useTransactionsForCustomer's fetch/poll/realtime
// wiring since it has the same "shared context only holds the latest ~100"
// blind spot.
export function useUnassignedPendingOrders() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const runFetch = useCallback(async (silent: boolean) => {
    const requestId = (requestIdRef.current += 1);
    if (!silent) {
      setLoading(true);
    }
    setError(null);

    try {
      const items = await fetchUnassignedPendingOrders();
      if (requestIdRef.current === requestId) {
        setTransactions(items);
      }
    } catch (err) {
      if (requestIdRef.current === requestId) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load unassigned pending sales",
        );
      }
    } finally {
      if (requestIdRef.current === requestId && !silent) {
        setLoading(false);
      }
    }
  }, []);

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
      .channel("orders-unassigned-realtime")
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

  const refetch = useCallback(() => runFetch(false), [runFetch]);

  return { transactions, loading, error, refetch };
}
