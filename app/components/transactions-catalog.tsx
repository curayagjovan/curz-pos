"use client";

import { memo } from "react";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import List from "@mui/material/List";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ListEmptyState from "@/app/components/list-empty-state";
import TransactionCard from "@/app/components/transaction-card";
import type { Transaction } from "@/types/transaction";

export type TransactionGroup = {
  key: string;
  label: string;
  transactions: Transaction[];
};

type TransactionsCatalogProps = {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  onUpdateStatus: (id: string, status: Transaction["status"]) => Promise<void>;
  groups?: TransactionGroup[];
};

const TransactionsCatalog = memo(function TransactionsCatalog({
  transactions,
  loading,
  error,
  onUpdateStatus,
  groups,
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

  if (groups && groups.length > 0) {
    return (
      <Stack spacing={1.5}>
        {groups.map((group) => (
          <Stack key={group.key} spacing={0.75}>
            <Typography
              variant="overline"
              sx={{ px: 0.5, color: "text.secondary", fontWeight: 700 }}
            >
              {group.label}
            </Typography>
            <List disablePadding>
              {group.transactions.map((transaction) => (
                <TransactionCard
                  key={transaction.id}
                  transaction={transaction}
                  onUpdateStatus={onUpdateStatus}
                />
              ))}
            </List>
          </Stack>
        ))}
      </Stack>
    );
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
