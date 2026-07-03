"use client";

import { memo } from "react";
import Alert from "@mui/material/Alert";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import List from "@mui/material/List";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TransactionCard from "@/app/components/transaction-card";
import type { Transaction } from "@/types/transaction";

type TransactionsCatalogProps = {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
};

const TransactionsCatalog = memo(function TransactionsCatalog({
  transactions,
  loading,
  error,
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
    return (
      <Card variant="outlined">
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            No sales found.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <List disablePadding>
      {transactions.map((transaction) => (
        <TransactionCard key={transaction.id} transaction={transaction} />
      ))}
    </List>
  );
});

export default TransactionsCatalog;
