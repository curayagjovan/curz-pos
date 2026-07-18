"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

  useEffect(() => {
    let cancelled = false;

    const runFetch = async () => {
      const requestId = (requestIdRef.current += 1);
      setLoading(true);
      setError(null);

      try {
        const items = await fetchOrdersInRange(startIso, endIso);
        if (!cancelled && requestIdRef.current === requestId) {
          setTransactions(items);
        }
      } catch (err) {
        if (!cancelled && requestIdRef.current === requestId) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load sales for this range",
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
  }, [startIso, endIso]);

  const refetch = useCallback(async () => {
    const requestId = (requestIdRef.current += 1);
    setLoading(true);
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
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [startIso, endIso]);

  return { transactions, loading, error, refetch };
}
