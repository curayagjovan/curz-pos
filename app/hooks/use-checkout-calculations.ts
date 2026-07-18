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

  // The exact total is prefilled into the paid-amount input, so chips only
  // offer realistic cash tenders above it: the total rounded up to the
  // nearest ₱5 and ₱10 coin, then whole bills.
  const suggestedAmounts = useMemo(() => {
    if (cartTotal <= 0) {
      return [];
    }

    const exactTotal = Number(cartTotal.toFixed(2));
    const coinRoundUps = [5, 10].map(
      (coin) => Math.ceil(exactTotal / coin) * coin,
    );

    const bills = [20, 50, 100, 200, 500, 1000];
    while (bills[bills.length - 1] < exactTotal) {
      bills.push(bills[bills.length - 1] * 2);
    }

    const startIndex = Math.max(
      0,
      bills.findIndex((amount) => amount >= exactTotal),
    );

    return Array.from(new Set([...coinRoundUps, ...bills.slice(startIndex)]))
      .filter((amount) => amount !== exactTotal)
      .sort((left, right) => left - right)
      .slice(0, 4);
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
