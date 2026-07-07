"use client";

import { memo, useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Collapse from "@mui/material/Collapse";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import ExpandLessRounded from "@mui/icons-material/ExpandLessRounded";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
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
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!groups || groups.length === 0) {
      return;
    }

    setOpenGroups((current) => {
      const next: Record<string, boolean> = {};

      for (const group of groups) {
        next[group.key] = current[group.key] ?? true;
      }

      return next;
    });
  }, [groups]);

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
      <List disablePadding>
        {groups.map((group) => {
          const isOpen = openGroups[group.key] ?? true;

          return (
            <Stack
              key={group.key}
              spacing={0.5}
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                overflow: "hidden",
                mb: 1,
              }}
            >
              <ListItemButton
                onClick={() =>
                  setOpenGroups((current) => ({
                    ...current,
                    [group.key]: !isOpen,
                  }))
                }
                sx={{
                  py: 0.75,
                  bgcolor: "background.paper",
                  borderBottom: isOpen ? "1px solid" : "none",
                  borderColor: "divider",
                }}
              >
                <ListItemText
                  primary={group.label}
                  secondary={`${group.transactions.length} sale${group.transactions.length === 1 ? "" : "s"}`}
                />
                {isOpen ? (
                  <ExpandLessRounded fontSize="small" />
                ) : (
                  <ExpandMoreRounded fontSize="small" />
                )}
              </ListItemButton>

              <Collapse
                in={isOpen}
                timeout="auto"
                unmountOnExit
                sx={{
                  p: 1,
                  pb: 0.5,
                }}
              >
                <List disablePadding>
                  {group.transactions.map((transaction) => (
                    <TransactionCard
                      key={transaction.id}
                      transaction={transaction}
                      onUpdateStatus={onUpdateStatus}
                    />
                  ))}
                </List>
              </Collapse>
            </Stack>
          );
        })}
      </List>
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
