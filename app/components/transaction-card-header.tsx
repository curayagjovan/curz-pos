"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { formatCurrency } from "@/lib/currency";
import type { Transaction } from "@/types/transaction";
import {
  formatTransactionDate,
  getStatusColor,
} from "@/app/components/transaction-card-status-utils";

type TransactionCardHeaderProps = {
  transaction: Transaction;
  expanded: boolean;
  onToggle: () => void;
  itemCount: number;
  itemPreview: string;
  balanceDue: number;
  paidAmount: number;
  isPending: boolean;
  statusUpdating: boolean;
  onQuickAssignCustomer?: () => void;
  quickAssignLabel?: string;
  onOpenPay: (event: React.MouseEvent<HTMLElement>) => void;
};

export default function TransactionCardHeader({
  transaction,
  expanded,
  onToggle,
  itemCount,
  itemPreview,
  balanceDue,
  paidAmount,
  isPending,
  statusUpdating,
  onQuickAssignCustomer,
  quickAssignLabel,
  onOpenPay,
}: TransactionCardHeaderProps) {
  return (
    <Box
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      aria-label={
        expanded ? "collapse transaction details" : "expand transaction details"
      }
      onClick={onToggle}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onToggle();
        }
      }}
      sx={{
        px: 1.25,
        py: 1.1,
        cursor: "pointer",
      }}
    >
      <Stack spacing={1}>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          justifyContent="space-between"
        >
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ minWidth: 0, flex: 1 }}
          >
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", letterSpacing: 0.4 }}
              >
                {formatTransactionDate(transaction.createdAt)}
              </Typography>
              <Typography
                variant="body1"
                sx={{ fontWeight: 800, lineHeight: 1.2, mt: 0.15 }}
              >
                {transaction.orderNo}
              </Typography>
            </Box>
          </Stack>

          <Stack alignItems="flex-end" spacing={0}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ whiteSpace: "nowrap" }}
            >
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 800, whiteSpace: "nowrap" }}>
              {formatCurrency(balanceDue > 0 ? paidAmount : transaction.total)}
            </Typography>
            {balanceDue > 0 ? (
              <Typography
                variant="caption"
                color="warning.main"
                sx={{ fontWeight: 700, whiteSpace: "nowrap" }}
              >
                Balance {formatCurrency(balanceDue)}
              </Typography>
            ) : null}
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <Typography
            variant="caption"
            color="text.secondary"
            noWrap
            sx={{
              flex: 1,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={itemPreview}
          >
            {itemPreview}
          </Typography>

          {isPending && onQuickAssignCustomer ? (
            <Button
              size="small"
              variant="outlined"
              color="primary"
              disabled={statusUpdating}
              onClick={(event) => {
                event.stopPropagation();
                onQuickAssignCustomer();
              }}
            >
              {quickAssignLabel ?? "Assign"}
            </Button>
          ) : isPending ? (
            <Button
              size="small"
              variant="contained"
              color="primary"
              disabled={statusUpdating}
              onClick={onOpenPay}
            >
              Pay
            </Button>
          ) : null}

          <Chip
            size="small"
            variant="filled"
            color={getStatusColor(transaction.status)}
            label={transaction.status}
            sx={{ fontWeight: 700 }}
          />
        </Stack>
      </Stack>
    </Box>
  );
}
