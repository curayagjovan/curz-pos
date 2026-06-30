"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import { createPortal } from "react-dom";
import { useEffect, useSyncExternalStore } from "react";

type CheckoutSheetItem = {
  id: string;
  name: string;
  sku: string;
  unitPrice: number;
  quantity: number;
};

type CheckoutActionSheetProps = {
  open: boolean;
  items: CheckoutSheetItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentAmountInput: string;
  paymentAmount: number;
  changeAmount: number;
  quickAmounts: number[];
  isSubmitting?: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
  onClearCart: () => void;
  onPaymentAmountInputChange: (value: string) => void;
  onQuickAmountSelect: (value: number) => void;
  onCheckout: () => void;
  formatPrice: (value: number) => string;
};

export default function CheckoutActionSheet({
  open,
  items,
  subtotal,
  tax,
  total,
  paymentAmountInput,
  paymentAmount,
  changeAmount,
  quickAmounts,
  isSubmitting = false,
  errorMessage,
  onClose,
  onIncrement,
  onDecrement,
  onClearCart,
  onPaymentAmountInputChange,
  onQuickAmountSelect,
  onCheckout,
  formatPrice,
}: CheckoutActionSheetProps) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!mounted) {
    return null;
  }

  const remainingAmount = Math.max(
    0,
    Number((total - paymentAmount).toFixed(2)),
  );
  const hasSufficientPayment =
    items.length === 0 ? false : paymentAmount >= total;

  return createPortal(
    <>
      <div
        className={[
          "fixed inset-0 z-70 bg-black/35 backdrop-blur-[1px] transition-opacity duration-200",
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        ].join(" ")}
        onClick={onClose}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label="Checkout"
        className={[
          "fixed bottom-0 left-0 right-0 z-71 max-h-[84svh] rounded-t-3xl bg-[#f7f7fa] shadow-[0_-20px_60px_rgba(0,0,0,0.22)] transition-transform duration-250 dark:bg-[#121217]",
          open ? "translate-y-0" : "translate-y-[104%]",
        ].join(" ")}
      >
        <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-black/15 dark:bg-white/20" />

        <header className="flex items-center justify-between px-4 pb-3 pt-3">
          <h2 className="text-[1.1rem] font-semibold tracking-[-0.01em] text-[#131316] dark:text-white">
            Checkout
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-[#3a3a3f] active:bg-black/5 dark:text-[#e7e7ea] dark:active:bg-white/10"
            aria-label="Close checkout"
          >
            <XMarkIcon className="size-5" />
          </button>
        </header>

        <div className="max-h-[44svh] overflow-y-auto px-4 pb-2">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-black/10 bg-white/65 px-4 py-8 text-center dark:border-white/10 dark:bg-white/5">
              <p className="text-sm text-[#5f5f66] dark:text-[#b8b8c2]">
                Your cart is empty.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="rounded-2xl bg-white px-3 py-3 dark:bg-[#1a1a22]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#1c1c1f] dark:text-white">
                        {item.name}
                      </p>
                      <p className="text-xs text-[#7f7f88]">{item.sku}</p>
                    </div>
                    <p className="text-sm font-semibold text-[#1c1c1f] dark:text-white">
                      {formatPrice(item.unitPrice * item.quantity)}
                    </p>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-[#7f7f88]">
                      {formatPrice(item.unitPrice)} each
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onDecrement(item.id)}
                        className="size-7 rounded-full border border-black/10 text-sm font-semibold text-[#1f1f24] active:bg-black/5 dark:border-white/15 dark:text-white dark:active:bg-white/10"
                        aria-label={`Decrease ${item.name} quantity`}
                      >
                        -
                      </button>
                      <span className="min-w-5 text-center text-sm font-semibold text-[#1f1f24] dark:text-white">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onIncrement(item.id)}
                        className="size-7 rounded-full border border-black/10 text-sm font-semibold text-[#1f1f24] active:bg-black/5 dark:border-white/15 dark:text-white dark:active:bg-white/10"
                        aria-label={`Increase ${item.name} quantity`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-black/8 px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 dark:border-white/10">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm text-[#5f5f66] dark:text-[#b8b8c2]">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-[#5f5f66] dark:text-[#b8b8c2]">
              <span>Tax</span>
              <span>{formatPrice(tax)}</span>
            </div>
            <div className="flex items-center justify-between text-base font-semibold text-[#141418] dark:text-white">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>

          <div className="mt-3 rounded-2xl bg-white/75 p-3 dark:bg-white/5">
            <div className="flex items-end justify-between gap-3">
              <label
                htmlFor="checkout-payment-amount"
                className="text-xs font-semibold tracking-[0.06em] text-[#6a6a72] dark:text-[#b8b8c2]"
              >
                PAYMENT AMOUNT
              </label>
              <p className="text-xs text-[#6a6a72] dark:text-[#b8b8c2]">
                Tendered cash
              </p>
            </div>
            <input
              id="checkout-payment-amount"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              placeholder="0.00"
              value={paymentAmountInput}
              onChange={(event) =>
                onPaymentAmountInputChange(event.target.value)
              }
              className="mt-2 h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-[1rem] font-semibold text-[#1b1b21] outline-none focus:border-[#0a84ff] focus:ring-2 focus:ring-[#0a84ff]/25 dark:border-white/15 dark:bg-[#1b1b24] dark:text-white"
            />

            <div className="mt-2 flex flex-wrap gap-2">
              {quickAmounts.map((value) => (
                <button
                  key={value}
                  type="button"
                  className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-[#202028] active:bg-black/5 dark:border-white/15 dark:bg-[#1c1c24] dark:text-white dark:active:bg-white/10"
                  onClick={() => onQuickAmountSelect(value)}
                >
                  {formatPrice(value)}
                </button>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm font-medium text-[#5f5f66] dark:text-[#b8b8c2]">
                {hasSufficientPayment ? "Change" : "Remaining"}
              </span>
              <span
                className={[
                  "text-sm font-semibold",
                  hasSufficientPayment
                    ? "text-[#1a7f37] dark:text-[#55d87a]"
                    : "text-[#b42318] dark:text-[#ff7b72]",
                ].join(" ")}
              >
                {hasSufficientPayment
                  ? formatPrice(changeAmount)
                  : formatPrice(remainingAmount)}
              </span>
            </div>
          </div>

          {errorMessage ? (
            <p className="mt-2 text-xs font-medium text-red-500">
              {errorMessage}
            </p>
          ) : null}

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              className="h-11 rounded-xl border border-black/10 px-4 text-sm font-semibold text-[#2a2a2f] active:bg-black/5 disabled:opacity-50 dark:border-white/15 dark:text-[#e8e8ef] dark:active:bg-white/10"
              onClick={onClearCart}
              disabled={items.length === 0 || isSubmitting}
            >
              Clear
            </button>
            <button
              type="button"
              className="h-11 flex-1 rounded-xl bg-[#111115] text-sm font-semibold text-white disabled:opacity-60 dark:bg-[#0a84ff]"
              onClick={onCheckout}
              disabled={
                items.length === 0 || isSubmitting || !hasSufficientPayment
              }
            >
              {isSubmitting ? "Processing..." : "Pay Now"}
            </button>
          </div>
        </div>
      </section>
    </>,
    document.body,
  );
}
