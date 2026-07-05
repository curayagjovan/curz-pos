"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getTransactions as getCachedTransactions,
  saveTransactions as saveCachedTransactions,
  shouldRefreshTransactions,
} from "@/lib/transactions-db";
import type { Transaction } from "@/types/transaction";

type TransactionsContextType = {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  refreshTransactions: (force?: boolean) => Promise<void>;
  addTransaction: (transaction: Transaction) => void;
  updateTransactionStatus: (
    id: string,
    status: Transaction["status"],
  ) => Promise<void>;
};

const TransactionsContext = createContext<TransactionsContextType | undefined>(
  undefined,
);

function normalizeTransaction(transaction: Transaction): Transaction {
  return {
    ...transaction,
    items: Array.isArray(transaction.items) ? transaction.items : [],
  };
}

function sortTransactions(transactions: Transaction[]) {
  return [...transactions].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

export function TransactionsProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshTransactions = useCallback(async (force = false) => {
    if (force) {
      setLoading(true);
    }

    setError(null);

    try {
      const response = await fetch("/api/orders", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch transactions");
      }

      const data = await response.json();
      const items: Transaction[] = (
        Array.isArray(data) ? data : (data.items ?? [])
      ).map(normalizeTransaction);
      const nextTransactions = sortTransactions(items);

      setTransactions(nextTransactions);
      await saveCachedTransactions(nextTransactions);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load transactions",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const hydrateTransactions = async () => {
      setLoading(true);
      setError(null);

      try {
        const cachedTransactions = await getCachedTransactions();

        if (!active) {
          return;
        }

        if (cachedTransactions.length > 0) {
          setTransactions(sortTransactions(cachedTransactions));
          setLoading(false);
        }

        if (cachedTransactions.length === 0 || shouldRefreshTransactions()) {
          await refreshTransactions(cachedTransactions.length === 0);
        } else {
          setLoading(false);
        }
      } catch (err) {
        if (!active) {
          return;
        }

        setError(
          err instanceof Error ? err.message : "Unable to load transactions",
        );
        setLoading(false);
      }
    };

    hydrateTransactions();

    return () => {
      active = false;
    };
  }, [refreshTransactions]);

  useEffect(() => {
    const handlePullToRefresh = () => {
      void refreshTransactions(true);
    };

    window.addEventListener("app:pull-to-refresh", handlePullToRefresh);
    return () => {
      window.removeEventListener("app:pull-to-refresh", handlePullToRefresh);
    };
  }, [refreshTransactions]);

  useEffect(() => {
    const POLL_MS = 15000;

    const refreshIfVisible = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      void refreshTransactions(false);
    };

    const handleVisibilityChange = () => {
      refreshIfVisible();
    };

    const handleFocus = () => {
      refreshIfVisible();
    };

    const intervalId = window.setInterval(() => {
      refreshIfVisible();
    }, POLL_MS);

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshTransactions]);

  const addTransaction = useCallback((transaction: Transaction) => {
    setTransactions((current) => {
      const nextTransactions = sortTransactions([
        normalizeTransaction(transaction),
        ...current.filter((item) => item.id !== transaction.id),
      ]);

      void saveCachedTransactions(nextTransactions);
      return nextTransactions;
    });
  }, []);

  const updateTransactionStatus = useCallback(
    async (id: string, status: Transaction["status"]) => {
      const response = await fetch("/api/orders", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, status }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Unable to update sale status");
      }

      const nextTransaction = normalizeTransaction(data as Transaction);

      setTransactions((current) => {
        const nextTransactions = sortTransactions(
          current.map((item) =>
            item.id === nextTransaction.id ? nextTransaction : item,
          ),
        );

        void saveCachedTransactions(nextTransactions);
        return nextTransactions;
      });
    },
    [],
  );

  const value = useMemo(
    () => ({
      transactions,
      loading,
      error,
      refreshTransactions,
      addTransaction,
      updateTransactionStatus,
    }),
    [
      transactions,
      loading,
      error,
      refreshTransactions,
      addTransaction,
      updateTransactionStatus,
    ],
  );

  return (
    <TransactionsContext.Provider value={value}>
      {children}
    </TransactionsContext.Provider>
  );
}

export function useTransactions() {
  const context = useContext(TransactionsContext);

  if (!context) {
    throw new Error("useTransactions must be used within TransactionsProvider");
  }

  return context;
}
