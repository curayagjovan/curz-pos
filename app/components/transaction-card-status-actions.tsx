"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { Transaction } from "@/types/transaction";
import { getStatusColor } from "@/app/components/transaction-card-status-utils";

type TransactionStatusActionsProps = {
  limitedActions: boolean;
  otherStatuses: Transaction["status"][];
  canVoidOrRefund: boolean;
  statusUpdating: boolean;
  statusError: string | null;
  onStatusChange: (status: Transaction["status"]) => void;
  canRemoveFromCustomer: boolean;
  onRemoveFromCustomer: () => void;
};

export default function TransactionStatusActions({
  limitedActions,
  otherStatuses,
  canVoidOrRefund,
  statusUpdating,
  statusError,
  onStatusChange,
  canRemoveFromCustomer,
  onRemoveFromCustomer,
}: TransactionStatusActionsProps) {
  if (!limitedActions) {
    return (
      <Box sx={{ px: 1.25, py: 1.1 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 0.75 }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ letterSpacing: 0.3 }}
          >
            Change Status To
          </Typography>

          {canRemoveFromCustomer ? (
            <Button
              size="small"
              color="error"
              disabled={statusUpdating}
              onClick={onRemoveFromCustomer}
            >
              Remove from Customer
            </Button>
          ) : null}
        </Stack>

        <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
          {otherStatuses.map((status) => {
            const restricted =
              (status === "REFUNDED" || status === "VOIDED") &&
              !canVoidOrRefund;

            return (
              <Chip
                key={status}
                size="small"
                variant="outlined"
                color={getStatusColor(status)}
                label={status}
                clickable={!statusUpdating && !restricted}
                disabled={statusUpdating || restricted}
                onClick={() => onStatusChange(status)}
                sx={{ fontWeight: 700 }}
              />
            );
          })}
        </Stack>

        {statusError ? (
          <Alert severity="error" sx={{ mt: 1, py: 0 }}>
            {statusError}
          </Alert>
        ) : null}
      </Box>
    );
  }

  if (canRemoveFromCustomer) {
    return (
      <Box sx={{ px: 1.25, py: 1.1 }}>
        <Button
          fullWidth
          size="small"
          variant="outlined"
          color="error"
          disabled={statusUpdating}
          onClick={onRemoveFromCustomer}
        >
          Remove from Customer
        </Button>

        {statusError ? (
          <Alert severity="error" sx={{ mt: 1, py: 0 }}>
            {statusError}
          </Alert>
        ) : null}
      </Box>
    );
  }

  return null;
}
