import { useCallback, useEffect, useRef, useState } from "react";
import type { CartItem } from "@/app/context/cart-context";
import { useCheckoutCalculations } from "@/app/hooks/use-checkout-calculations";
import { hapticSuccess } from "@/lib/haptics";
import type { Transaction } from "@/types/transaction";

type ShowSnackbar = (options: {
  message: string;
  severity?: "success" | "info" | "warning" | "error";
}) => void;

type UseProductsCheckoutParams = {
  cartItems: CartItem[];
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  addTransaction: (transaction: Transaction) => void;
  refreshTransactions: (force?: boolean) => Promise<void>;
  showSnackbar: ShowSnackbar;
  senderPushEndpointRef: React.RefObject<string | undefined>;
  setSearchQuery: (value: string) => void;
};

// Owns the checkout drawer's open/loading state and both submit paths —
// the normal "Checkout" (status PAID, full payment required) and the "Item
// Taken, Unpaid" flow (status PENDING, e.g. for Utang customers) — since
// they share validation, the request payload shape, and cooldown handling.
export function useProductsCheckout({
  cartItems,
  removeFromCart,
  clearCart,
  addTransaction,
  refreshTransactions,
  showSnackbar,
  senderPushEndpointRef,
  setSearchQuery,
}: UseProductsCheckoutParams) {
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [pendingCheckoutLoading, setPendingCheckoutLoading] = useState(false);
  const [checkoutCooldown, setCheckoutCooldown] = useState(false);
  const [paidAmountInput, setPaidAmountInput] = useState("0");
  const [paidAmountTouched, setPaidAmountTouched] = useState(false);
  const [autoPaidTotal, setAutoPaidTotal] = useState<number | null>(null);
  const checkoutCooldownTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (checkoutCooldownTimeoutRef.current !== null) {
        window.clearTimeout(checkoutCooldownTimeoutRef.current);
      }
    };
  }, []);

  const handleCartFabClick = useCallback(() => {
    setPaidAmountTouched(false);
    setAutoPaidTotal(null);
    setCartOpen(true);
  }, []);

  const { cartTotal, suggestedAmounts, parsedPaidAmount, changeAmount, amountDue } =
    useCheckoutCalculations({
      cartItems,
      paidAmountInput,
    });

  // Prefill the paid amount with the cart total (exact payment is the common
  // case) and keep it following the total while quantities change in the
  // drawer, until the cashier types or taps an amount themselves.
  if (cartOpen && !paidAmountTouched && autoPaidTotal !== cartTotal) {
    setAutoPaidTotal(cartTotal);
    setPaidAmountInput(cartTotal > 0 ? cartTotal.toFixed(2) : "0");
  }

  const handlePaidAmountChange = useCallback((value: string) => {
    setPaidAmountTouched(true);
    setPaidAmountInput(value);
  }, []);

  const startCheckoutCooldown = useCallback(() => {
    if (checkoutCooldownTimeoutRef.current !== null) {
      window.clearTimeout(checkoutCooldownTimeoutRef.current);
    }

    setCheckoutCooldown(true);
    checkoutCooldownTimeoutRef.current = window.setTimeout(() => {
      setCheckoutCooldown(false);
      checkoutCooldownTimeoutRef.current = null;
    }, 500);
  }, []);

  // Shared by the normal "Checkout" button (status PAID, full payment
  // required) and the "Item Taken, Unpaid" button (status PENDING — the
  // customer walks off with the item before payment is settled). Only the
  // validation and the resulting order status differ between the two.
  const submitCheckout = useCallback(
    async (
      status: "PAID" | "PENDING",
      pendingDetails?: { customerId: string; amountPaid: number },
      paidOverride?: number,
    ) => {
      if (checkoutCooldown) {
        showSnackbar({
          message: "Please wait a moment before checking out again",
          severity: "info",
        });
        return;
      }

      if (cartItems.length === 0) {
        showSnackbar({ message: "Cart is empty", severity: "error" });
        return;
      }

      const paidAmount = paidOverride ?? parsedPaidAmount;

      if (status === "PAID" && paidAmount < cartTotal) {
        showSnackbar({
          message: "Insufficient payment amount",
          severity: "error",
        });
        return;
      }

      if (status === "PENDING" && !pendingDetails?.customerId) {
        showSnackbar({
          message: "Select a customer for unpaid sales",
          severity: "error",
        });
        return;
      }

      const setLoading =
        status === "PAID" ? setCheckoutLoading : setPendingCheckoutLoading;

      setLoading(true);
      startCheckoutCooldown();
      showSnackbar({
        message:
          status === "PAID" ? "Saving checkout..." : "Saving pending sale...",
        severity: "info",
      });

      try {
        const requestId = crypto.randomUUID();
        const payload = {
          requestId,
          status,
          amountPaid:
            status === "PENDING" ? pendingDetails!.amountPaid : paidAmount,
          customerId:
            status === "PENDING" ? pendingDetails!.customerId : undefined,
          senderPushEndpoint: senderPushEndpointRef.current,
          items: cartItems.map((item) => ({
            productId: item.id,
            productName: item.name,
            quantity: item.quantity,
            unitPrice: item.price,
          })),
        };

        const submitOrder = () =>
          fetch("/api/orders", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

        let response = await submitOrder();
        if (!response.ok && response.status >= 500) {
          response = await submitOrder();
        }

        const data = await response.json();

        if (!response.ok) {
          if (
            response.status === 409 &&
            Array.isArray(data?.missingProductIds) &&
            data.missingProductIds.length > 0
          ) {
            for (const productId of data.missingProductIds as string[]) {
              removeFromCart(productId);
            }

            throw new Error(
              data?.message ||
                "Some items are no longer available and were removed from cart",
            );
          }

          throw new Error(data?.message || "Checkout failed");
        }

        const savedTransaction = data as Partial<Transaction>;
        if (
          !savedTransaction ||
          typeof savedTransaction.id !== "string" ||
          typeof savedTransaction.orderNo !== "string" ||
          typeof savedTransaction.createdAt !== "string" ||
          !Array.isArray(savedTransaction.items)
        ) {
          throw new Error("Checkout not yet confirmed. Please try again.");
        }

        addTransaction(savedTransaction as Transaction);
        void refreshTransactions(false);

        hapticSuccess();
        clearCart();
        setPaidAmountInput("0");
        setCartOpen(false);
        setSearchQuery("");
        showSnackbar({
          message: data?.orderNo
            ? status === "PAID"
              ? `Order ${data.orderNo} completed`
              : `Order ${data.orderNo} marked pending — payment not yet received`
            : status === "PAID"
              ? "Checkout completed"
              : "Sale marked pending",
        });
      } catch (err) {
        showSnackbar({
          message:
            err instanceof Error ? err.message : "Unable to complete checkout",
          severity: "error",
        });
      } finally {
        setLoading(false);
      }
    },
    [
      cartItems,
      senderPushEndpointRef,
      parsedPaidAmount,
      cartTotal,
      clearCart,
      removeFromCart,
      addTransaction,
      refreshTransactions,
      showSnackbar,
      checkoutCooldown,
      startCheckoutCooldown,
      setSearchQuery,
    ],
  );

  const handleCheckout = useCallback(
    () => submitCheckout("PAID"),
    [submitCheckout],
  );
  // Quick checkout from the mini cart bar: assumes cash tendered matches the
  // total exactly (the common case) and completes the sale in one tap,
  // bypassing the drawer entirely.
  const handleExactCheckout = useCallback(
    () => submitCheckout("PAID", undefined, cartTotal),
    [submitCheckout, cartTotal],
  );
  const handleCheckoutPending = useCallback(
    (details: { customerId: string; amountPaid: number }) =>
      submitCheckout("PENDING", details),
    [submitCheckout],
  );

  const handleCloseCart = useCallback(() => {
    setCartOpen(false);
    setPaidAmountInput("0");
  }, []);

  const handleClearCart = useCallback(() => {
    clearCart();
    setPaidAmountInput("0");
  }, [clearCart]);

  return {
    cartOpen,
    checkoutLoading,
    pendingCheckoutLoading,
    checkoutCooldown,
    paidAmountInput,
    cartTotal,
    suggestedAmounts,
    amountDue,
    changeAmount,
    handleCartFabClick,
    handlePaidAmountChange,
    handleCheckout,
    handleExactCheckout,
    handleCheckoutPending,
    handleCloseCart,
    handleClearCart,
  };
}
