"use client";

import { memo, useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItem from "@mui/material/ListItem";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AddRounded from "@mui/icons-material/AddRounded";
import KeyboardArrowDownRounded from "@mui/icons-material/KeyboardArrowDownRounded";
import RemoveRounded from "@mui/icons-material/RemoveRounded";
import type { Transaction } from "@/types/transaction";

type TransactionCardProps = {
  transaction: Transaction;
  onUpdateStatus: (
    id: string,
    status: Transaction["status"],
    items?: Array<{ id: string; returnedQuantity: number }>,
  ) => Promise<void>;
};

function getStatusColor(status: Transaction["status"]) {
  switch (status) {
    case "PAID":
      return "success" as const;
    case "REFUNDED":
      return "warning" as const;
    case "VOIDED":
      return "default" as const;
    default:
      return "default" as const;
  }
}

function formatTransactionDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatCurrency(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return "--";
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "--";
  }

  return `₱${amount.toFixed(2)}`;
}

function getStatusConfirmationMessage(status: Transaction["status"]) {
  switch (status) {
    case "REFUNDED":
      return "Mark this sale as REFUNDED?";
    case "VOIDED":
      return "Mark this sale as VOIDED?";
    default:
      return null;
  }
}

const TransactionCard = memo(function TransactionCard({
  transaction,
  onUpdateStatus,
}: TransactionCardProps) {
  const transactionItems = useMemo(
    () => (Array.isArray(transaction.items) ? transaction.items : []),
    [transaction.items],
  );
  const [expanded, setExpanded] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [returnMode, setReturnMode] = useState(false);
  const [returnQuantities, setReturnQuantities] = useState<
    Record<string, number>
  >({});
  const paidAmount = transaction.amountPaid ?? transaction.total;
  const change = Math.max(0, Number(paidAmount) - Number(transaction.total));
  const hasNote = Boolean(transaction.note?.trim());
  const itemCount = transactionItems.reduce(
    (sum, item) => sum + Number(item.quantity),
    0,
  );
  const canReturnItems = transaction.status === "PAID";

  const returnTotal = useMemo(
    () =>
      transactionItems.reduce((sum, item) => {
        const returnQty = returnQuantities[item.id] ?? 0;
        return sum + returnQty * Number(item.unitPrice);
      }, 0),
    [transactionItems, returnQuantities],
  );
  const returnUnitCount = useMemo(
    () => Object.values(returnQuantities).reduce((sum, qty) => sum + qty, 0),
    [returnQuantities],
  );
  const hasRefundDetails =
    transaction.status === "REFUNDED" && transaction.refundAmount !== null;
  const returnedUnitCount = useMemo(
    () =>
      transactionItems.reduce(
        (sum, item) => sum + Number(item.returnedQuantity ?? 0),
        0,
      ),
    [transactionItems],
  );
  const remainingAmount = hasRefundDetails
    ? Math.max(0, Number(paidAmount) - Number(transaction.refundAmount))
    : 0;

  const handleStatusChange = async (nextStatus: Transaction["status"]) => {
    if (nextStatus === transaction.status || statusUpdating) {
      return;
    }

    const confirmationMessage = getStatusConfirmationMessage(nextStatus);
    if (confirmationMessage && !window.confirm(confirmationMessage)) {
      return;
    }

    setStatusError(null);
    setStatusUpdating(true);

    try {
      await onUpdateStatus(transaction.id, nextStatus);
    } catch (error) {
      setStatusError(
        error instanceof Error ? error.message : "Unable to update sale status",
      );
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleStartReturn = () => {
    setStatusError(null);
    setReturnQuantities({});
    setReturnMode(true);
  };

  const handleCancelReturn = () => {
    setReturnMode(false);
    setReturnQuantities({});
  };

  const handleReturnQuantityChange = (item: Transaction["items"][number], delta: number) => {
    setReturnQuantities((current) => {
      const nextQty = Math.min(
        Number(item.quantity),
        Math.max(0, (current[item.id] ?? 0) + delta),
      );

      return { ...current, [item.id]: nextQty };
    });
  };

  const handleProcessRefund = async () => {
    if (statusUpdating || returnUnitCount <= 0) {
      return;
    }

    const confirmationMessage = `Refund ${formatCurrency(returnTotal)} for ${returnUnitCount} item(s)?`;
    if (!window.confirm(confirmationMessage)) {
      return;
    }

    setStatusError(null);
    setStatusUpdating(true);

    try {
      const returnItems = Object.entries(returnQuantities)
        .filter(([, returnedQuantity]) => returnedQuantity > 0)
        .map(([itemId, returnedQuantity]) => ({
          id: itemId,
          returnedQuantity,
        }));

      await onUpdateStatus(transaction.id, "REFUNDED", returnItems);
      setReturnMode(false);
      setReturnQuantities({});
    } catch (error) {
      setStatusError(
        error instanceof Error ? error.message : "Unable to update sale status",
      );
    } finally {
      setStatusUpdating(false);
    }
  };

  return (
    <ListItem disablePadding sx={{ mb: 1 }}>
      <Card
        variant="outlined"
        sx={{
          width: "100%",
          borderRadius: 2,
          borderColor: "divider",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            px: 1.25,
            py: 1.1,
            background:
              "linear-gradient(180deg, rgba(25,118,210,0.06) 0%, rgba(25,118,210,0) 100%)",
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
                    Transaction
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{ fontWeight: 800, lineHeight: 1.2, mt: 0.15 }}
                  >
                    {transaction.orderNo}
                  </Typography>
                </Box>

                <Chip
                  size="small"
                  variant="filled"
                  color={getStatusColor(transaction.status)}
                  label={transaction.status}
                  sx={{ fontWeight: 700 }}
                />
              </Stack>

              <IconButton
                size="small"
                aria-label={
                  expanded
                    ? "collapse transaction details"
                    : "expand transaction details"
                }
                onClick={() => setExpanded((current) => !current)}
                sx={{
                  transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 180ms ease",
                }}
              >
                <KeyboardArrowDownRounded fontSize="small" />
              </IconButton>
            </Stack>

            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              justifyContent="space-between"
            >
              <Typography variant="caption" color="text.secondary">
                {formatTransactionDate(transaction.createdAt)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </Typography>
            </Stack>
          </Stack>
        </Box>

        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Divider />

          <Box sx={{ px: 1.25, py: 1.1 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ minWidth: 72 }}
              >
                Sale Status
              </Typography>
              <Select
                size="small"
                value={transaction.status}
                disabled={statusUpdating}
                onChange={(event) =>
                  void handleStatusChange(
                    event.target.value as Transaction["status"],
                  )
                }
                sx={{ minWidth: 140 }}
              >
                <MenuItem value="PAID">PAID</MenuItem>
                <MenuItem value="REFUNDED">REFUNDED</MenuItem>
                <MenuItem value="VOIDED">VOIDED</MenuItem>
              </Select>
            </Stack>

            {statusError ? (
              <Alert severity="error" sx={{ mt: 1, py: 0 }}>
                {statusError}
              </Alert>
            ) : null}
          </Box>

          <Divider />

          <Stack
            direction="row"
            spacing={1}
            sx={{ px: 1.25, py: 1.1 }}
            divider={<Divider orientation="vertical" flexItem />}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary">
                Total
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 800, mt: 0.15 }}>
                {formatCurrency(transaction.total)}
              </Typography>
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary">
                Paid
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 800, mt: 0.15 }}>
                {formatCurrency(paidAmount)}
              </Typography>
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary">
                Change
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 800, mt: 0.15 }}>
                {formatCurrency(change)}
              </Typography>
            </Box>
          </Stack>

          {hasRefundDetails ? (
            <>
              <Divider />
              <Box sx={{ px: 1.25, py: 1 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mb: 0.75, letterSpacing: 0.3 }}
                >
                  Refund Details
                </Typography>

                <Stack
                  direction="row"
                  spacing={1}
                  divider={<Divider orientation="vertical" flexItem />}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary">
                      Items Returned
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{ fontWeight: 800, mt: 0.15 }}
                    >
                      {returnedUnitCount}
                    </Typography>
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary">
                      Refund Amount
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{ fontWeight: 800, mt: 0.15, color: "warning.main" }}
                    >
                      {formatCurrency(transaction.refundAmount)}
                    </Typography>
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary">
                      Remaining Amount
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{ fontWeight: 800, mt: 0.15 }}
                    >
                      {formatCurrency(remainingAmount)}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            </>
          ) : null}

          <Divider />

          <Box sx={{ px: 1.25, py: 1 }}>
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
                Items Bought
              </Typography>

              {canReturnItems && !returnMode && transactionItems.length > 0 ? (
                <Button size="small" onClick={handleStartReturn}>
                  Return Items
                </Button>
              ) : null}
            </Stack>

            <Stack spacing={0.9}>
              {transactionItems.map((item) => (
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
                      Qty {item.quantity} x {formatCurrency(item.unitPrice)}
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
                          onClick={() => handleReturnQuantityChange(item, -1)}
                          aria-label={`decrease return quantity for ${item.productName}`}
                        >
                          <RemoveRounded fontSize="small" />
                        </IconButton>
                        <Typography
                          variant="body2"
                          sx={{ minWidth: 20, textAlign: "center" }}
                        >
                          {returnQuantities[item.id] ?? 0}
                        </Typography>
                        <IconButton
                          size="small"
                          disabled={
                            (returnQuantities[item.id] ?? 0) >=
                            Number(item.quantity)
                          }
                          onClick={() => handleReturnQuantityChange(item, 1)}
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
                    {formatCurrency(item.lineTotal)}
                  </Typography>
                </Stack>
              ))}

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
                  <Button
                    size="small"
                    disabled={statusUpdating}
                    onClick={handleCancelReturn}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    color="warning"
                    disabled={statusUpdating || returnUnitCount <= 0}
                    onClick={handleProcessRefund}
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

          {hasNote ? (
            <>
              <Divider />
              <Box sx={{ px: 1.25, py: 1 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mb: 0.35, letterSpacing: 0.3 }}
                >
                  Note
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ lineHeight: 1.35 }}
                >
                  {transaction.note}
                </Typography>
              </Box>
            </>
          ) : null}
        </Collapse>
      </Card>
    </ListItem>
  );
});

export default TransactionCard;
