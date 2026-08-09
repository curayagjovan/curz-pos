"use client";

import { memo, useState, type RefObject } from "react";
import Box from "@mui/material/Box";
import Badge from "@mui/material/Badge";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AddRounded from "@mui/icons-material/AddRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import RemoveRounded from "@mui/icons-material/RemoveRounded";
import ShoppingCartRounded from "@mui/icons-material/ShoppingCartRounded";
import type { CartItem } from "@/app/context/cart-context";
import { formatCurrency } from "@/lib/currency";

const easeIOS = "cubic-bezier(0.32, 0.72, 0, 1)";

type MiniCartBarProps = {
  cartItems: CartItem[];
  cartCount: number;
  cartTotal: number;
  isPulsing: boolean;
  barRef: RefObject<HTMLButtonElement | null>;
  onRemoveFromCart: (id: string) => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onClearCart: () => void;
  onCheckout: () => void;
};

type MiniCartRowProps = {
  item: CartItem;
  onRemoveFromCart: (id: string) => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
};

const MiniCartRow = memo(function MiniCartRow({
  item,
  onRemoveFromCart,
  onUpdateQuantity,
}: MiniCartRowProps) {
  return (
    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ px: 1, py: 0.5 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
          {item.name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {formatCurrency(item.price)}
        </Typography>
      </Box>

      <Stack direction="row" alignItems="center" spacing={0.25}>
        <IconButton
          size="small"
          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
          aria-label={`decrease ${item.name}`}
        >
          <RemoveRounded fontSize="inherit" />
        </IconButton>
        <Typography variant="body2" sx={{ minWidth: 18, textAlign: "center" }}>
          {item.quantity}
        </Typography>
        <IconButton
          size="small"
          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
          aria-label={`increase ${item.name}`}
        >
          <AddRounded fontSize="inherit" />
        </IconButton>
      </Stack>

      <IconButton
        size="small"
        color="error"
        onClick={() => onRemoveFromCart(item.id)}
        aria-label={`remove ${item.name}`}
      >
        <CloseRounded fontSize="inherit" />
      </IconButton>
    </Stack>
  );
});

// Docked cart summary that lives above the bottom nav whenever the cart has
// items. Tapping the summary row expands the item list in place (qty edits,
// removal); "Checkout" always jumps straight to CheckoutDrawer regardless of
// expanded state. `barRef` is the flight animation's landing target — same
// role the Fab used to play in useCartFlightAnimation.
const MiniCartBar = memo(function MiniCartBar({
  cartItems,
  cartCount,
  cartTotal,
  isPulsing,
  barRef,
  onRemoveFromCart,
  onUpdateQuantity,
  onClearCart,
  onCheckout,
}: MiniCartBarProps) {
  const [expanded, setExpanded] = useState(false);
  const visible = cartCount > 0;

  return (
    <Box
      sx={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: "calc(env(safe-area-inset-bottom) + 88px)",
        zIndex: 1201,
        px: "calc(env(safe-area-inset-left) + 16px)",
        pr: "calc(env(safe-area-inset-right) + 16px)",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <Box
        sx={{
          maxWidth: 600,
          mx: "auto",
          transform: visible ? "translateY(0)" : "translateY(calc(100% + 24px))",
          opacity: visible ? 1 : 0,
          transition: `transform 320ms ${easeIOS}, opacity 220ms ${easeIOS}`,
        }}
      >
        <Paper
          elevation={0}
          sx={(theme) => ({
            borderRadius: "18px",
            overflow: "hidden",
            bgcolor: "rgba(var(--mui-palette-background-paperChannel) / 0.82)",
            backdropFilter: "saturate(180%) blur(20px)",
            WebkitBackdropFilter: "saturate(180%) blur(20px)",
            border: "1px solid transparent",
            boxShadow:
              "0 22px 48px -12px rgba(0, 0, 0, 0.45), 0 6px 18px rgba(0, 0, 0, 0.28)",
            transform: isPulsing ? "scale(1.02)" : "scale(1)",
            transition: `transform 180ms ${easeIOS}`,
            // Shadows don't read against the near-black dark background, so
            // separation there comes from a light hairline border instead.
            ...theme.applyStyles("dark", {
              borderColor: "rgba(255, 255, 255, 0.14)",
              boxShadow:
                "0 22px 48px -12px rgba(0, 0, 0, 0.6), 0 6px 18px rgba(0, 0, 0, 0.4)",
            }),
          })}
        >
          <Collapse in={expanded}>
            <List dense sx={{ px: 1, py: 0.5, maxHeight: 236, overflowY: "auto" }}>
              {cartItems.map((item) => (
                <MiniCartRow
                  key={item.id}
                  item={item}
                  onRemoveFromCart={onRemoveFromCart}
                  onUpdateQuantity={onUpdateQuantity}
                />
              ))}
            </List>
            <Divider />
          </Collapse>

          <Stack direction="row" alignItems="center" sx={{ pr: 1 }}>
            <ButtonBase
              ref={barRef}
              onClick={() => setExpanded((current) => !current)}
              aria-label={expanded ? "collapse cart" : "expand cart"}
              sx={{
                flex: 1,
                minWidth: 0,
                justifyContent: "flex-start",
                gap: 1.25,
                px: 1.5,
                py: 1.25,
              }}
            >
              <Badge
                color="error"
                badgeContent={cartCount}
                overlap="circular"
                max={99}
              >
                <ShoppingCartRounded fontSize="small" />
              </Badge>

              <Stack sx={{ minWidth: 0, alignItems: "flex-start" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {formatCurrency(cartTotal)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {cartCount} {cartCount === 1 ? "item" : "items"}
                </Typography>
              </Stack>

              <ExpandMoreRounded
                fontSize="small"
                sx={{
                  ml: "auto",
                  color: "text.secondary",
                  transform: expanded ? "rotate(180deg)" : "none",
                  transition: `transform 220ms ${easeIOS}`,
                }}
              />
            </ButtonBase>

            <IconButton
              size="small"
              color="error"
              onClick={onClearCart}
              aria-label="clear cart"
            >
              <DeleteOutlineRounded fontSize="small" />
            </IconButton>

            <Button variant="contained" size="small" onClick={onCheckout}>
              Checkout
            </Button>
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
});

export default MiniCartBar;
