import { useMemo } from "react";
import type { CartItem } from "@/app/context/cart-context";

type UseCheckoutCalculationsParams = {
  cartItems: CartItem[];
  paidAmountInput: string;
};

export function useCheckoutCalculations({
  cartItems,
  paidAmountInput,
}: UseCheckoutCalculationsParams) {
  const cartTotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems],
  );

  const suggestedAmounts = useMemo(() => {
    if (cartTotal <= 0) {
      return [];
    }

    const denominations = [20, 50, 100, 200, 500, 1000];
    while (denominations[denominations.length - 1] < cartTotal) {
      denominations.push(denominations[denominations.length - 1] * 2);
    }

    const startIndex = Math.max(
      0,
      denominations.findIndex((amount) => amount >= cartTotal),
    );

    return denominations.slice(startIndex, startIndex + 4);
  }, [cartTotal]);

  const parsedPaidAmount = useMemo(() => {
    const sanitized = paidAmountInput.replace(/,/g, "").trim();
    if (!sanitized) {
      return 0;
    }

    const numeric = Number(sanitized);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
  }, [paidAmountInput]);

  const changeAmount = useMemo(
    () => Math.max(0, parsedPaidAmount - cartTotal),
    [parsedPaidAmount, cartTotal],
  );

  const amountDue = useMemo(
    () => Math.max(0, cartTotal - parsedPaidAmount),
    [cartTotal, parsedPaidAmount],
  );

  return {
    cartTotal,
    suggestedAmounts,
    parsedPaidAmount,
    changeAmount,
    amountDue,
  };
}
