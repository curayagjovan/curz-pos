"use client";

import { memo } from "react";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import List from "@mui/material/List";
import Stack from "@mui/material/Stack";
import ListEmptyState from "@/app/components/list-empty-state";
import TransactionCard from "@/app/components/transaction-card";
import type { Transaction } from "@/types/transaction";

type TransactionsCatalogProps = {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  onUpdateStatus: (id: string, status: Transaction["status"]) => Promise<void>;
};

const TransactionsCatalog = memo(function TransactionsCatalog({
  transactions,
  loading,
  error,
  onUpdateStatus,
}: TransactionsCatalogProps) {
  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (loading) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ py: 5 }}>
        <CircularProgress size={28} />
      </Stack>
    );
  }

  if (transactions.length === 0) {
    return <ListEmptyState description="No sales found." />;
  }

  return (
    <List disablePadding>
      {transactions.map((transaction) => (
        <TransactionCard
          key={transaction.id}
          transaction={transaction}
          onUpdateStatus={onUpdateStatus}
        />
      ))}
    </List>
  );
});

export default TransactionsCatalog;
