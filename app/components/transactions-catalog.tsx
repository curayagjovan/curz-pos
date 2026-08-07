"use client";

import { memo } from "react";
import ReceiptLongRounded from "@mui/icons-material/ReceiptLongRounded";
import Alert from "@mui/material/Alert";
import List from "@mui/material/List";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import FadeInContent from "@/app/components/fade-in-content";
import ListEmptyState from "@/app/components/list-empty-state";
import ListSkeleton from "@/app/components/list-skeleton";
import TransactionCard from "@/app/components/transaction-card";
import type { Transaction } from "@/types/transaction";
import type { Customer } from "@/types/customer";

export type TransactionGroup = {
  key: string;
  label: string;
  transactions: Transaction[];
};

type TransactionsCatalogProps = {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  onUpdateStatus: (
    id: string,
    status: Transaction["status"],
    items?: Array<{ id: string; returnedQuantity: number }>,
    amountPaid?: number,
  ) => Promise<void>;
  onRemoveFromCustomer?: (id: string) => Promise<void>;
  customers?: Customer[];
  onAssignCustomer?: (id: string, customerId: string) => Promise<void>;
  onCreateCustomer?: (input: {
    name: string;
    phone?: string;
  }) => Promise<Customer | null>;
  onQuickAssignCustomer?: (id: string) => Promise<void>;
  quickAssignLabel?: string;
  limitedActions?: boolean;
  groups?: TransactionGroup[];
};

const TransactionsCatalog = memo(function TransactionsCatalog({
  transactions,
  loading,
  error,
  onUpdateStatus,
  onRemoveFromCustomer,
  customers,
  onAssignCustomer,
  onCreateCustomer,
  onQuickAssignCustomer,
  quickAssignLabel,
  limitedActions,
  groups,
}: TransactionsCatalogProps) {
  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (loading) {
    return <ListSkeleton />;
  }

  if (transactions.length === 0) {
    return (
      <ListEmptyState
        description="No sales found."
        icon={<ReceiptLongRounded fontSize="small" />}
      />
    );
  }

  if (groups && groups.length > 0) {
    return (
      <FadeInContent>
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
                    onRemoveFromCustomer={onRemoveFromCustomer}
                    customers={customers}
                    onAssignCustomer={onAssignCustomer}
                    onCreateCustomer={onCreateCustomer}
                    onQuickAssignCustomer={onQuickAssignCustomer}
                    quickAssignLabel={quickAssignLabel}
                    limitedActions={limitedActions}
                  />
                ))}
              </List>
            </Stack>
          ))}
        </Stack>
      </FadeInContent>
    );
  }

  return (
    <FadeInContent>
      <List disablePadding>
        {transactions.map((transaction) => (
          <TransactionCard
            key={transaction.id}
            transaction={transaction}
            onUpdateStatus={onUpdateStatus}
            onRemoveFromCustomer={onRemoveFromCustomer}
            customers={customers}
            onAssignCustomer={onAssignCustomer}
            onCreateCustomer={onCreateCustomer}
            onQuickAssignCustomer={onQuickAssignCustomer}
            quickAssignLabel={quickAssignLabel}
            limitedActions={limitedActions}
          />
        ))}
      </List>
    </FadeInContent>
  );
});

export default TransactionsCatalog;
