import { useMemo } from "react";
import type { CartItem } from "@/app/context/cart-context";

type UseCheckoutCalculationsParams = {
  cartItems: CartItem[];
  paidAmountInput: string;
};

function computeLineTotal(item: CartItem) {
  const bundleQty =
    item.bundleQty == null
      ? null
      : Number.isFinite(item.bundleQty)
        ? item.bundleQty
        : null;
  const bundlePrice =
    item.bundlePrice == null
      ? null
      : Number.isFinite(item.bundlePrice)
        ? item.bundlePrice
        : null;

  if (
    bundleQty !== null &&
    bundleQty >= 2 &&
    bundlePrice !== null &&
    bundlePrice >= 0
  ) {
    const bundles = Math.floor(item.quantity / bundleQty);
    const remainder = item.quantity % bundleQty;
    return Number((bundles * bundlePrice + remainder * item.price).toFixed(2));
  }

  return Number((item.price * item.quantity).toFixed(2));
}

export function useCheckoutCalculations({
  cartItems,
  paidAmountInput,
}: UseCheckoutCalculationsParams) {
  const cartTotal = useMemo(() => {
    return Number(
      cartItems
        .reduce((sum, item) => sum + computeLineTotal(item), 0)
        .toFixed(2),
    );
  }, [cartItems]);

  const suggestedAmounts = useMemo(() => {
    if (cartTotal <= 0) {
      return [];
    }

    const exactTotal = Number(cartTotal.toFixed(2));
    const denominations = [20, 50, 100, 200, 500, 1000];
    while (denominations[denominations.length - 1] < cartTotal) {
      denominations.push(denominations[denominations.length - 1] * 2);
    }

    const startIndex = Math.max(
      0,
      denominations.findIndex((amount) => amount >= cartTotal),
    );

    const fallbackAmounts = denominations
      .slice(startIndex, startIndex + 4)
      .filter((amount) => amount !== exactTotal);

    return [exactTotal, ...fallbackAmounts].slice(0, 4);
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
