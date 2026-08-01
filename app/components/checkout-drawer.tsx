"use client";

import { memo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import SwipeableDrawer from "@mui/material/SwipeableDrawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Popover from "@mui/material/Popover";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AddRounded from "@mui/icons-material/AddRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import RemoveRounded from "@mui/icons-material/RemoveRounded";
import CustomerPicker from "@/app/components/customer-picker";
import type { CartItem } from "@/app/context/cart-context";
import type { Customer } from "@/types/customer";

type CheckoutDrawerProps = {
  open: boolean;
  cartItems: CartItem[];
  cartCount: number;
  cartTotal: number;
  paidAmountInput: string;
  suggestedAmounts: number[];
  amountDue: number;
  changeAmount: number;
  checkoutLoading: boolean;
  pendingCheckoutLoading?: boolean;
  checkoutDisabled?: boolean;
  customers: Customer[];
  onCreateCustomer: (input: {
    name: string;
    phone?: string;
  }) => Promise<Customer | null>;
  onClose: () => void;
  onPaidAmountChange: (value: string) => void;
  onRemoveFromCart: (id: string) => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onClearCart: () => void;
  onCheckout: () => void;
  onCheckoutPending: (details: { customerId: string; amountPaid: number }) => void;
};

type CartItemRowProps = {
  item: CartItem;
  onRemoveFromCart: (id: string) => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
};

const CartItemRow = memo(function CartItemRow({
  item,
  onRemoveFromCart,
  onUpdateQuantity,
}: CartItemRowProps) {
  return (
    <ListItem
      secondaryAction={
        <IconButton
          edge="end"
          color="error"
          onClick={() => onRemoveFromCart(item.id)}
          aria-label={`remove ${item.name}`}
        >
          <DeleteOutlineRounded fontSize="small" />
        </IconButton>
      }
    >
      <ListItemText
        primary={item.name}
        secondary={`${item.sku} · ₱${item.price.toFixed(2)}`}
      />
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mr: 2 }}>
        <IconButton
          size="small"
          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
          aria-label={`decrease ${item.name}`}
        >
          <RemoveRounded fontSize="small" />
        </IconButton>
        <Typography variant="body2" sx={{ minWidth: 20, textAlign: "center" }}>
          {item.quantity}
        </Typography>
        <IconButton
          size="small"
          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
          aria-label={`increase ${item.name}`}
        >
          <AddRounded fontSize="small" />
        </IconButton>
      </Stack>
    </ListItem>
  );
});

const CheckoutDrawer = memo(function CheckoutDrawer({
  open,
  cartItems,
  cartCount,
  cartTotal,
  paidAmountInput,
  suggestedAmounts,
  amountDue,
  changeAmount,
  checkoutLoading,
  pendingCheckoutLoading = false,
  checkoutDisabled = false,
  customers,
  onCreateCustomer,
  onClose,
  onPaidAmountChange,
  onRemoveFromCart,
  onUpdateQuantity,
  onClearCart,
  onCheckout,
  onCheckoutPending,
}: CheckoutDrawerProps) {
  const anyCheckoutLoading = checkoutLoading || pendingCheckoutLoading;

  const [pendingAnchorEl, setPendingAnchorEl] = useState<HTMLElement | null>(
    null,
  );
  const [pendingCustomerId, setPendingCustomerId] = useState<string | null>(
    null,
  );
  const [pendingAmountInput, setPendingAmountInput] = useState("0");
  const pendingPopoverOpen = Boolean(pendingAnchorEl);

  const handleOpenPending = (event: React.MouseEvent<HTMLElement>) => {
    setPendingCustomerId(null);
    setPendingAmountInput("0");
    setPendingAnchorEl(event.currentTarget);
  };

  const handleClosePending = () => {
    if (pendingCheckoutLoading) {
      return;
    }
    setPendingAnchorEl(null);
  };

  const numericPendingAmount = Number(pendingAmountInput);

  const handleConfirmPending = () => {
    if (!pendingCustomerId) {
      return;
    }

    // The total charged to the customer is always the full cart total —
    // this field only controls how much of it is collected up front. The
    // rest becomes the utang balance, tracked via the order's amountPaid.
    const amountPaid =
      Number.isFinite(numericPendingAmount) && numericPendingAmount > 0
        ? Math.min(numericPendingAmount, cartTotal)
        : 0;

    onCheckoutPending({ customerId: pendingCustomerId, amountPaid });
    setPendingAnchorEl(null);
  };

  return (
    <SwipeableDrawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      onOpen={() => {}}
      disableSwipeToOpen
      slotProps={{
        paper: {
          sx: {
            pb: "env(safe-area-inset-bottom)",
            maxHeight: "78dvh",
          },
        },
      }}
    >
      <Box sx={{ px: 2, pt: 1.5, pb: 1.25 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Typography variant="h6">Cart</Typography>
          <IconButton onClick={onClose} aria-label="close cart">
            <CloseRounded fontSize="small" />
          </IconButton>
        </Stack>

        <Typography variant="caption" color="text.secondary">
          {cartCount} {cartCount === 1 ? "item" : "items"}
        </Typography>
      </Box>

      <Divider />

      <List sx={{ px: 1, overflowY: "auto" }}>
        {cartItems.length === 0 ? (
          <ListItem>
            <ListItemText
              primary="Your cart is empty"
              secondary="Add products from the list to start checkout."
            />
          </ListItem>
        ) : (
          cartItems.map((item) => (
            <CartItemRow
              key={item.id}
              item={item}
              onRemoveFromCart={onRemoveFromCart}
              onUpdateQuantity={onUpdateQuantity}
            />
          ))
        )}
      </List>

      <Divider />

      <Box sx={{ px: 2, py: 1.5 }}>
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 1.25 }}>
          <Typography variant="subtitle2">Total</Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            ₱{cartTotal.toFixed(2)}
          </Typography>
        </Stack>

        <TextField
          fullWidth
          type="number"
          value={paidAmountInput}
          onChange={(event) => onPaidAmountChange(event.target.value)}
          slotProps={{
            htmlInput: {
              min: 0,
              step: "0.01",
              inputMode: "decimal",
            },
          }}
        />

        <Stack
          direction="row"
          spacing={0.75}
          useFlexGap
          flexWrap="wrap"
          sx={{ mt: 1 }}
        >
          {suggestedAmounts.map((amount) => (
            <Chip
              key={amount}
              size="small"
              clickable
              label={`₱${amount.toLocaleString()}`}
              onClick={() => onPaidAmountChange(amount.toFixed(2))}
            />
          ))}
        </Stack>

        <Stack
          direction="row"
          justifyContent="space-between"
          sx={{ mt: 1.25, mb: 1.25 }}
        >
          <Typography variant="subtitle2" color="text.secondary">
            {amountDue > 0 ? "Amount Due" : "Change"}
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 700 }}
            color={amountDue > 0 ? "error.main" : "success.main"}
          >
            ₱{(amountDue > 0 ? amountDue : changeAmount).toFixed(2)}
          </Typography>
        </Stack>

        <Stack spacing={1}>
          <Button
            fullWidth
            variant="contained"
            disabled={
              cartItems.length === 0 ||
              anyCheckoutLoading ||
              checkoutDisabled ||
              amountDue > 0
            }
            onClick={onCheckout}
          >
            {checkoutLoading ? "Processing..." : "Checkout"}
          </Button>
          <Button
            fullWidth
            variant="outlined"
            color="warning"
            disabled={
              cartItems.length === 0 ||
              anyCheckoutLoading ||
              checkoutDisabled
            }
            onClick={handleOpenPending}
          >
            {pendingCheckoutLoading ? "Saving..." : "Pending"}
          </Button>
          <Button
            fullWidth
            variant="outlined"
            color="inherit"
            disabled={cartItems.length === 0 || anyCheckoutLoading}
            onClick={onClearCart}
          >
            Clear
          </Button>
        </Stack>
      </Box>

      <Popover
        open={pendingPopoverOpen}
        anchorEl={pendingAnchorEl}
        onClose={handleClosePending}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        transformOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Stack spacing={1.5} sx={{ p: 2, minWidth: 280 }}>
          <Typography variant="subtitle2">Unpaid Sale (Utang)</Typography>

          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              Total
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              ₱{cartTotal.toFixed(2)}
            </Typography>
          </Stack>

          <CustomerPicker
            customers={customers}
            value={pendingCustomerId}
            onChange={setPendingCustomerId}
            onCreateCustomer={onCreateCustomer}
            label="Customer"
            required
          />

          <TextField
            fullWidth
            size="small"
            type="number"
            label="Amount received now (optional)"
            value={pendingAmountInput}
            onChange={(event) => setPendingAmountInput(event.target.value)}
            slotProps={{
              htmlInput: {
                min: 0,
                step: "0.01",
                inputMode: "decimal",
              },
            }}
          />

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button onClick={handleClosePending} disabled={pendingCheckoutLoading}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="warning"
              disabled={!pendingCustomerId || pendingCheckoutLoading}
              onClick={handleConfirmPending}
            >
              {pendingCheckoutLoading ? "Saving..." : "Confirm"}
            </Button>
          </Stack>
        </Stack>
      </Popover>
    </SwipeableDrawer>
  );
});

export default CheckoutDrawer;
