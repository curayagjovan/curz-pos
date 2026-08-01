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

async function fetchOrdersForCustomer(customerId: string) {
  const params = new URLSearchParams({ customerId });
  const response = await fetch(`/api/orders?${params.toString()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to load this customer's sales");
  }

  const data = await response.json();
  return (Array.isArray(data) ? data : []).map(
    normalizeTransaction,
  ) as Transaction[];
}

// Mirrors useTransactionsInRange: the shared transactions context only ever
// holds the latest ~100 orders store-wide, so an older utang order can fall
// out of that window long before it's paid off. Fetching a customer's orders
// directly from the server (unbounded, like the date-range fetch) guarantees
// their balance and history are always complete regardless of store-wide
// sales volume.
export function useTransactionsForCustomer(customerId: string | null) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const runFetch = useCallback(
    async (silent: boolean) => {
      if (!customerId) {
        setTransactions([]);
        setLoading(false);
        setError(null);
        return;
      }

      const requestId = (requestIdRef.current += 1);
      if (!silent) {
        setLoading(true);
      }
      setError(null);

      try {
        const items = await fetchOrdersForCustomer(customerId);
        if (requestIdRef.current === requestId) {
          setTransactions(items);
        }
      } catch (err) {
        if (requestIdRef.current === requestId) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load this customer's sales",
          );
        }
      } finally {
        if (requestIdRef.current === requestId && !silent) {
          setLoading(false);
        }
      }
    },
    [customerId],
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

  useEffect(() => {
    if (!customerId) {
      return;
    }

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
      .channel(`orders-customer-realtime-${customerId}`)
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
  }, [customerId, runFetch]);

  const refetch = useCallback(() => runFetch(false), [runFetch]);

  return { transactions, loading, error, refetch };
}
