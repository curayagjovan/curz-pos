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
import Popover from "@mui/material/Popover";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AddRounded from "@mui/icons-material/AddRounded";
import RemoveRounded from "@mui/icons-material/RemoveRounded";
import CustomerPicker from "@/app/components/customer-picker";
import { useAuth } from "@/app/context/auth-context";
import { hasPermission } from "@/lib/auth/permissions";
import { formatCurrency } from "@/lib/currency";
import type { Transaction } from "@/types/transaction";
import type { Customer } from "@/types/customer";

type TransactionCardProps = {
  transaction: Transaction;
  onUpdateStatus: (
    id: string,
    status: Transaction["status"],
    items?: Array<{ id: string; returnedQuantity: number }>,
    amountPaid?: number,
  ) => Promise<void>;
  // Only passed by the Utang customer detail view — lets a sale that was
  // accidentally attributed to the wrong customer be detached from them
  // without touching the sale itself. Omitted (and hidden) everywhere else,
  // e.g. the general Sales page, where there's no "this customer" context.
  onRemoveFromCustomer?: (id: string) => Promise<void>;
  // Only passed by the Sales page — lets a pending sale that has no
  // customer (or the wrong one) get assigned/reassigned directly, without
  // needing to go through the Utang page.
  customers?: Customer[];
  onAssignCustomer?: (id: string, customerId: string) => Promise<void>;
  onCreateCustomer?: (input: {
    name: string;
    phone?: string;
  }) => Promise<Customer | null>;
  // Only passed by the Utang customer detail view's "Unassigned Pending
  // Sales" list — when set, this replaces the header's "Pay" button with an
  // "Assign" button (there's no one to collect payment from yet, so paying
  // isn't the relevant action for an orphaned sale).
  onQuickAssignCustomer?: (id: string) => Promise<void>;
  quickAssignLabel?: string;
  // Only passed by the Utang page — cashiers there only get Pay, Assign,
  // and Remove from Customer; arbitrary status jumps and item returns are
  // full sale edits that stay confined to the Sales page.
  limitedActions?: boolean;
};

const ALL_STATUSES: Transaction["status"][] = [
  "PENDING",
  "PAID",
  "REFUNDED",
  "VOIDED",
];

function getStatusColor(status: Transaction["status"]) {
  switch (status) {
    case "PAID":
      return "success" as const;
    case "PENDING":
      return "info" as const;
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
  onRemoveFromCustomer,
  customers,
  onAssignCustomer,
  onCreateCustomer,
  onQuickAssignCustomer,
  quickAssignLabel,
  limitedActions = false,
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
  const [payAnchorEl, setPayAnchorEl] = useState<HTMLElement | null>(null);
  const [payAmountInput, setPayAmountInput] = useState("");
  const paidAmount = transaction.amountPaid ?? transaction.total;
  const change = Math.max(0, Number(paidAmount) - Number(transaction.total));
  const isPending = transaction.status === "PENDING";
  const balanceDue = Math.max(
    0,
    Number(transaction.total) - Number(paidAmount),
  );
  const hasNote = Boolean(transaction.note?.trim());
  const itemCount = transactionItems.reduce(
    (sum, item) =>
      sum +
      Math.max(0, Number(item.quantity) - Number(item.returnedQuantity ?? 0)),
    0,
  );
  const { appUser } = useAuth();
  const canVoidOrRefund = hasPermission(appUser, "VOID_REFUND");
  const canReturnItems =
    transaction.status === "PAID" && canVoidOrRefund && !limitedActions;

  const payPopoverOpen = Boolean(payAnchorEl);
  const numericPayAmount = Number(payAmountInput);
  // Anything tendered beyond the balance is change handed back to the
  // customer — shown for reference only, never sent to the server or
  // credited toward the order.
  const payChange =
    Number.isFinite(numericPayAmount) && numericPayAmount > balanceDue
      ? numericPayAmount - balanceDue
      : 0;

  const itemPreview = useMemo(() => {
    const visibleItems = transactionItems.filter(
      (item) => Number(item.quantity) - Number(item.returnedQuantity ?? 0) > 0,
    );
    const previewItems = visibleItems.slice(0, 2).map((item) => {
      const qty = Number(item.quantity) - Number(item.returnedQuantity ?? 0);
      return qty > 1 ? `${item.productName} ×${qty}` : item.productName;
    });
    const remaining = visibleItems.length - previewItems.length;

    return remaining > 0
      ? `${previewItems.join(", ")} +${remaining} more`
      : previewItems.join(", ");
  }, [transactionItems]);

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

  // Everything BUT the current status — the header chip already shows what
  // this sale currently is, so repeating it here would just be noise. Only
  // the statuses it could actually move to are worth showing. PAID is also
  // dropped while PENDING — settling a balance always goes through the Pay
  // popover, which reconciles the actual amount collected, rather than this
  // chip jumping straight to PAID without collecting anything.
  const otherStatuses = useMemo(
    () =>
      ALL_STATUSES.filter(
        (status) =>
          status !== transaction.status &&
          !(transaction.status === "PENDING" && status === "PAID"),
      ),
    [transaction.status],
  );

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

  const handleOpenPay = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setStatusError(null);
    setPayAmountInput(balanceDue.toFixed(2));
    setPayAnchorEl(event.currentTarget);
  };

  const handleClosePay = () => {
    if (statusUpdating) {
      return;
    }
    setPayAnchorEl(null);
  };

  const handleConfirmPay = async () => {
    if (statusUpdating) {
      return;
    }

    if (!Number.isFinite(numericPayAmount) || numericPayAmount <= 0) {
      setStatusError("Enter a valid amount");
      return;
    }

    // Anything over the balance is change — only what actually settles the
    // balance gets credited to the order.
    const creditedAmount = Math.min(numericPayAmount, balanceDue);
    const nextAmountPaid = Number(
      (Number(paidAmount) + creditedAmount).toFixed(2),
    );
    const nextStatus: Transaction["status"] =
      nextAmountPaid >= Number(transaction.total) ? "PAID" : "PENDING";

    setStatusError(null);
    setStatusUpdating(true);

    try {
      await onUpdateStatus(
        transaction.id,
        nextStatus,
        undefined,
        nextAmountPaid,
      );
      setPayAnchorEl(null);
    } catch (error) {
      setStatusError(
        error instanceof Error ? error.message : "Unable to record payment",
      );
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleRemoveFromCustomer = async () => {
    if (!onRemoveFromCustomer || statusUpdating) {
      return;
    }

    const confirmationMessage = `Remove this sale from ${
      transaction.customer?.name ?? "this customer"
    }? It will no longer count toward their balance.`;
    if (!window.confirm(confirmationMessage)) {
      return;
    }

    setStatusError(null);
    setStatusUpdating(true);

    try {
      await onRemoveFromCustomer(transaction.id);
    } catch (error) {
      setStatusError(
        error instanceof Error
          ? error.message
          : "Unable to remove this sale from the customer",
      );
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleAssignCustomer = async (customerId: string | null) => {
    // Clearing the picker (selecting nothing) is treated as a no-op here —
    // unlinking a customer is a deliberate action that lives on the Utang
    // page's "Remove from Customer" button, not a side effect of this field.
    if (!onAssignCustomer || !customerId || statusUpdating) {
      return;
    }

    setStatusError(null);
    setStatusUpdating(true);

    try {
      await onAssignCustomer(transaction.id, customerId);
    } catch (error) {
      setStatusError(
        error instanceof Error ? error.message : "Unable to assign customer",
      );
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleQuickAssignCustomer = async () => {
    if (!onQuickAssignCustomer || statusUpdating) {
      return;
    }

    setStatusError(null);
    setStatusUpdating(true);

    try {
      await onQuickAssignCustomer(transaction.id);
    } catch (error) {
      setStatusError(
        error instanceof Error ? error.message : "Unable to assign customer",
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

  const handleReturnQuantityChange = (
    item: Transaction["items"][number],
    delta: number,
  ) => {
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
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          aria-label={
            expanded
              ? "collapse transaction details"
              : "expand transaction details"
          }
          onClick={() => setExpanded((current) => !current)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setExpanded((current) => !current);
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
                <Typography
                  variant="body1"
                  sx={{ fontWeight: 800, whiteSpace: "nowrap" }}
                >
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
                    void handleQuickAssignCustomer();
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
                  onClick={handleOpenPay}
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

        <Popover
          open={payPopoverOpen}
          anchorEl={payAnchorEl}
          onClose={handleClosePay}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          slotProps={{ paper: { sx: { p: 2, width: 260 } } }}
        >
          <Stack spacing={1.25}>
            <Box>
              <Typography variant="subtitle2">Collect Payment</Typography>
              <Typography variant="caption" color="text.secondary">
                Balance due {formatCurrency(balanceDue)}
              </Typography>
            </Box>

            <TextField
              autoFocus
              label="Amount received"
              value={payAmountInput}
              onChange={(event) => setPayAmountInput(event.target.value)}
              type="number"
              size="small"
              fullWidth
              slotProps={{
                htmlInput: { min: 0, step: "0.01", inputMode: "decimal" },
              }}
            />

            {payChange > 0 ? (
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">
                  Change (for reference only)
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {formatCurrency(payChange)}
                </Typography>
              </Stack>
            ) : null}

            {statusError ? (
              <Alert severity="error" sx={{ py: 0 }}>
                {statusError}
              </Alert>
            ) : null}

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button
                size="small"
                onClick={handleClosePay}
                disabled={statusUpdating}
              >
                Cancel
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={() => void handleConfirmPay()}
                disabled={statusUpdating}
              >
                {statusUpdating ? "Saving..." : "Confirm"}
              </Button>
            </Stack>
          </Stack>
        </Popover>

        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Divider />

          {!limitedActions ? (
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

                {onRemoveFromCustomer && transaction.customerId ? (
                  <Button
                    size="small"
                    color="error"
                    disabled={statusUpdating}
                    onClick={() => void handleRemoveFromCustomer()}
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
                      onClick={() => void handleStatusChange(status)}
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
          ) : onRemoveFromCustomer && transaction.customerId ? (
            <Box sx={{ px: 1.25, py: 1.1 }}>
              <Button
                fullWidth
                size="small"
                variant="outlined"
                color="error"
                disabled={statusUpdating}
                onClick={() => void handleRemoveFromCustomer()}
              >
                Remove from Customer
              </Button>

              {statusError ? (
                <Alert severity="error" sx={{ mt: 1, py: 0 }}>
                  {statusError}
                </Alert>
              ) : null}
            </Box>
          ) : null}

          {isPending && customers && onAssignCustomer ? (
            <>
              <Divider />
              <Box sx={{ px: 1.25, py: 1.1 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mb: 0.75, letterSpacing: 0.3 }}
                >
                  Customer
                </Typography>

                <CustomerPicker
                  customers={customers}
                  value={transaction.customerId}
                  onChange={(customerId) =>
                    void handleAssignCustomer(customerId)
                  }
                  onCreateCustomer={onCreateCustomer ?? (async () => null)}
                  placeholder="Assign a customer"
                  disabled={statusUpdating}
                />
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
                {isPending ? "Balance Due" : "Change"}
              </Typography>
              <Typography
                variant="body1"
                sx={{ fontWeight: 800, mt: 0.15 }}
                color={isPending && balanceDue > 0 ? "error.main" : undefined}
              >
                {formatCurrency(isPending ? balanceDue : change)}
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
