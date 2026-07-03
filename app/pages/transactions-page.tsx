"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import ProductsSearchBar from "@/app/components/products-search-bar";
import TransactionsCatalog from "@/app/components/transactions-catalog";
import { usePageContext } from "@/app/context/page-context";
import MobilePageWrapper from "@/app/layouts/mobile-page-wrapper";
import type { Transaction } from "@/types/transaction";

function normalizeTransaction(transaction: Transaction): Transaction {
  return {
    ...transaction,
    items: Array.isArray(transaction.items) ? transaction.items : [],
  };
}

export default function TransactionsPage() {
  const { searchQuery, setSearchQuery } = usePageContext();
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let active = true;

    const loadTransactions = async () => {
      setLoading(true);
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

        if (active) {
          setTransactions(items);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Unable to load transactions",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadTransactions();

    return () => {
      active = false;
    };
  }, [refreshToken]);

  useEffect(() => {
    const handlePullToRefresh = () => {
      setRefreshToken((current) => current + 1);
    };

    window.addEventListener("app:pull-to-refresh", handlePullToRefresh);
    return () => {
      window.removeEventListener("app:pull-to-refresh", handlePullToRefresh);
    };
  }, []);

  const filteredTransactions = useMemo(() => {
    const query = deferredSearchQuery.trim().toLowerCase();

    if (!query) {
      return transactions;
    }

    return transactions.filter((transaction) => {
      const note = transaction.note?.toLowerCase() ?? "";
      return (
        transaction.orderNo.toLowerCase().includes(query) ||
        transaction.status.toLowerCase().includes(query) ||
        note.includes(query)
      );
    });
  }, [transactions, deferredSearchQuery]);

  return (
    <MobilePageWrapper title="Sales">
      <Container maxWidth="sm" sx={{ py: 0.5 }}>
        <Stack spacing={1.5}>
          <ProductsSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search sales"
            ariaLabel="search sales"
          />

          <Box sx={{ px: 0.5, color: "text.secondary", typography: "caption" }}>
            {loading
              ? "Loading sales..."
              : `${filteredTransactions.length.toLocaleString()} sales`}
          </Box>

          <TransactionsCatalog
            transactions={filteredTransactions}
            loading={loading}
            error={error}
          />
        </Stack>
      </Container>
    </MobilePageWrapper>
  );
}
