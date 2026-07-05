"use client";

import { useDeferredValue, useMemo } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import ProductsSearchBar from "@/app/components/products-search-bar";
import TransactionsCatalog from "@/app/components/transactions-catalog";
import { useTransactions } from "@/app/context/transactions-context";
import { usePageContext } from "@/app/context/page-context";
import MobilePageWrapper from "@/app/layouts/mobile-page-wrapper";

export default function TransactionsPage() {
  const { searchQuery, setSearchQuery } = usePageContext();
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const { transactions, loading, error, updateTransactionStatus } =
    useTransactions();

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
            onUpdateStatus={updateTransactionStatus}
          />
        </Stack>
      </Container>
    </MobilePageWrapper>
  );
}
