"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AddRounded from "@mui/icons-material/AddRounded";
import RemoveRounded from "@mui/icons-material/RemoveRounded";
import { formatCurrency } from "@/lib/currency";
import type { Transaction } from "@/types/transaction";

type TransactionItem = Transaction["items"][number];

type TransactionItemsSectionProps = {
  transactionItems: TransactionItem[];
  canReturnItems: boolean;
  returnMode: boolean;
  returnQuantities: Record<string, number>;
  returnTotal: number;
  returnUnitCount: number;
  statusUpdating: boolean;
  statusError: string | null;
  onStartReturn: () => void;
  onCancelReturn: () => void;
  onReturnQuantityChange: (item: TransactionItem, delta: number) => void;
  onProcessRefund: () => void;
};

export default function TransactionItemsSection({
  transactionItems,
  canReturnItems,
  returnMode,
  returnQuantities,
  returnTotal,
  returnUnitCount,
  statusUpdating,
  statusError,
  onStartReturn,
  onCancelReturn,
  onReturnQuantityChange,
  onProcessRefund,
}: TransactionItemsSectionProps) {
  return (
    <Box sx={{ px: 1.25, py: 1 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 0.75 }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 0.3 }}>
          Items Bought
        </Typography>

        {canReturnItems && !returnMode && transactionItems.length > 0 ? (
          <Button size="small" onClick={onStartReturn}>
            Return Items
          </Button>
        ) : null}
      </Stack>

      <Stack spacing={0.9}>
        {transactionItems.map((item) => {
          const originalQty = Number(item.quantity);
          const remainingQty = Math.max(
            0,
            originalQty - Number(item.returnedQuantity ?? 0),
          );
          const remainingLineTotal =
            originalQty > 0
              ? (Number(item.lineTotal) / originalQty) * remainingQty
              : 0;

          return (
            <Stack
              key={item.id}
              direction="row"
              spacing={1}
              alignItems="flex-start"
              justifyContent="space-between"
            >
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    textDecoration:
                      item.returnedQuantity >= item.quantity &&
                      item.returnedQuantity > 0
                        ? "line-through"
                        : "none",
                  }}
                >
                  {item.productName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Qty {remainingQty} x {formatCurrency(item.unitPrice)}
                </Typography>
                {item.returnedQuantity > 0 ? (
                  <Typography
                    variant="caption"
                    color="warning.main"
                    sx={{ display: "block" }}
                  >
                    Returned {item.returnedQuantity}
                  </Typography>
                ) : null}

                {returnMode ? (
                  <Stack
                    direction="row"
                    spacing={0.5}
                    alignItems="center"
                    sx={{ mt: 0.5 }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      Return qty:
                    </Typography>
                    <IconButton
                      size="small"
                      disabled={(returnQuantities[item.id] ?? 0) <= 0}
                      onClick={() => onReturnQuantityChange(item, -1)}
                      aria-label={`decrease return quantity for ${item.productName}`}
                    >
                      <RemoveRounded fontSize="small" />
                    </IconButton>
                    <Typography variant="body2" sx={{ minWidth: 20, textAlign: "center" }}>
                      {returnQuantities[item.id] ?? 0}
                    </Typography>
                    <IconButton
                      size="small"
                      disabled={
                        (returnQuantities[item.id] ?? 0) >= Number(item.quantity)
                      }
                      onClick={() => onReturnQuantityChange(item, 1)}
                      aria-label={`increase return quantity for ${item.productName}`}
                    >
                      <AddRounded fontSize="small" />
                    </IconButton>
                    <Typography variant="caption" color="text.secondary">
                      of {item.quantity}
                    </Typography>
                  </Stack>
                ) : null}
              </Box>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 700,
                  textDecoration:
                    item.returnedQuantity >= item.quantity &&
                    item.returnedQuantity > 0
                      ? "line-through"
                      : "none",
                }}
              >
                {formatCurrency(remainingLineTotal)}
              </Typography>
            </Stack>
          );
        })}

        {transactionItems.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No item details available.
          </Typography>
        ) : null}
      </Stack>

      {returnMode ? (
        <Box sx={{ mt: 1.25 }}>
          <Divider sx={{ mb: 1 }} />
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 1 }}
          >
            <Typography variant="body2" color="text.secondary">
              Refund total
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 800 }}>
              {formatCurrency(returnTotal)}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button size="small" disabled={statusUpdating} onClick={onCancelReturn}>
              Cancel
            </Button>
            <Button
              size="small"
              variant="contained"
              color="warning"
              disabled={statusUpdating || returnUnitCount <= 0}
              onClick={onProcessRefund}
            >
              Process Refund
            </Button>
          </Stack>

          {statusError ? (
            <Alert severity="error" sx={{ mt: 1, py: 0 }}>
              {statusError}
            </Alert>
          ) : null}
        </Box>
      ) : null}
    </Box>
  );
}
