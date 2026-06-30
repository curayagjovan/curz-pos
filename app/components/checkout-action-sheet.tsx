"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useRef } from "react";
import { useState } from "react";
import { useSyncExternalStore } from "react";
import { Card, Popup } from "konsta/react";

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
  onRemoveItem: (productId: string) => void;
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
  onRemoveItem,
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
  const swipeStartYRef = useRef<number | null>(null);
  const swipeStartXRef = useRef<number | null>(null);
  const itemSwipeIdRef = useRef<string | null>(null);
  const itemSwipeStartXRef = useRef<number | null>(null);
  const itemSwipeStartYRef = useRef<number | null>(null);
  const [sheetDragOffset, setSheetDragOffset] = useState(0);
  const [isSheetDragging, setIsSheetDragging] = useState(false);
  const [swipePreview, setSwipePreview] = useState<{
    id: string;
    offset: number;
    isDragging: boolean;
  } | null>(null);

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

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverscroll = document.body.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overscrollBehavior = previousBodyOverscroll;
    };
  }, [open]);

  const closeSheet = () => {
    setSheetDragOffset(0);
    setIsSheetDragging(false);
    onClose();
  };

  const remainingAmount = Math.max(
    0,
    Number((total - paymentAmount).toFixed(2)),
  );
  const hasSufficientPayment =
    items.length === 0 ? false : paymentAmount >= total;

  const onSheetTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    if (!touch) {
      return;
    }

    swipeStartYRef.current = touch.clientY;
    swipeStartXRef.current = touch.clientX;
    setIsSheetDragging(true);
  };

  const onSheetTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (swipeStartYRef.current === null || swipeStartXRef.current === null) {
      return;
    }

    const touch = event.changedTouches[0];
    if (!touch) {
      swipeStartYRef.current = null;
      swipeStartXRef.current = null;
      return;
    }

    const deltaY = touch.clientY - swipeStartYRef.current;
    const deltaX = Math.abs(touch.clientX - swipeStartXRef.current);

    swipeStartYRef.current = null;
    swipeStartXRef.current = null;

    if (deltaY > 60 && deltaY > deltaX * 1.2) {
      setSheetDragOffset(0);
      setIsSheetDragging(false);
      closeSheet();
      return;
    }

    setSheetDragOffset(0);
    setIsSheetDragging(false);
  };

  const onSheetTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (swipeStartYRef.current === null || swipeStartXRef.current === null) {
      return;
    }

    const touch = event.touches[0];
    if (!touch) {
      return;
    }

    const deltaY = touch.clientY - swipeStartYRef.current;
    const deltaX = Math.abs(touch.clientX - swipeStartXRef.current);

    if (deltaY > 0 && deltaY > deltaX) {
      setSheetDragOffset(Math.min(deltaY, 96));
      return;
    }

    setSheetDragOffset(0);
  };

  const onSheetTouchCancel = () => {
    swipeStartYRef.current = null;
    swipeStartXRef.current = null;
    setSheetDragOffset(0);
    setIsSheetDragging(false);
  };

  const onItemTouchStart = (
    itemId: string,
    event: React.TouchEvent<HTMLLIElement>,
  ) => {
    const target = event.target as HTMLElement;
    if (target.closest("button") || target.closest("input")) {
      itemSwipeIdRef.current = null;
      itemSwipeStartXRef.current = null;
      itemSwipeStartYRef.current = null;
      return;
    }

    const touch = event.touches[0];
    if (!touch) {
      return;
    }

    itemSwipeIdRef.current = itemId;
    itemSwipeStartXRef.current = touch.clientX;
    itemSwipeStartYRef.current = touch.clientY;
    setSwipePreview({ id: itemId, offset: 0, isDragging: true });
  };

  const onItemTouchMove = (
    itemId: string,
    event: React.TouchEvent<HTMLLIElement>,
  ) => {
    if (
      itemSwipeIdRef.current !== itemId ||
      itemSwipeStartXRef.current === null
    ) {
      return;
    }

    const touch = event.touches[0];
    if (!touch) {
      return;
    }

    const deltaX = touch.clientX - itemSwipeStartXRef.current;
    const clampedOffset = Math.max(-112, Math.min(0, deltaX));
    setSwipePreview({ id: itemId, offset: clampedOffset, isDragging: true });
  };

  const onItemTouchEnd = (
    itemId: string,
    event: React.TouchEvent<HTMLLIElement>,
  ) => {
    if (itemSwipeIdRef.current !== itemId) {
      return;
    }

    const touch = event.changedTouches[0];
    if (
      !touch ||
      itemSwipeStartXRef.current === null ||
      itemSwipeStartYRef.current === null
    ) {
      itemSwipeIdRef.current = null;
      itemSwipeStartXRef.current = null;
      itemSwipeStartYRef.current = null;
      return;
    }

    const deltaX = touch.clientX - itemSwipeStartXRef.current;
    const deltaY = Math.abs(touch.clientY - itemSwipeStartYRef.current);

    itemSwipeIdRef.current = null;
    itemSwipeStartXRef.current = null;
    itemSwipeStartYRef.current = null;

    if (deltaX < -70 && deltaY < 50) {
      setSwipePreview(null);
      onRemoveItem(itemId);
      return;
    }

    setSwipePreview((prev) =>
      prev?.id === itemId ? { id: itemId, offset: 0, isDragging: false } : prev,
    );
  };

  const onItemTouchCancel = () => {
    itemSwipeIdRef.current = null;
    itemSwipeStartXRef.current = null;
    itemSwipeStartYRef.current = null;
    setSwipePreview((prev) =>
      prev ? { id: prev.id, offset: 0, isDragging: false } : prev,
    );
  };

  if (!mounted) {
    return null;
  }

  return createPortal(
    <Popup opened={open} backdrop={false} className="bg-transparent!">
      <div className="fixed inset-0 z-50 flex items-stretch">
        <button
          type="button"
          aria-label="Close checkout"
          className="absolute inset-0 bg-transparent [backdrop-filter:blur(8px)]"
          onClick={closeSheet}
        />

        <div
          className={[
            "relative z-10 flex h-dvh w-full flex-col overflow-hidden overscroll-contain bg-[#f7f7fa] pt-[max(env(safe-area-inset-top),8px)] dark:bg-[#0b0b0d]",
            isSheetDragging ? "" : "transition-transform duration-200 ease-out",
          ].join(" ")}
          style={{ transform: `translateY(${sheetDragOffset}px)` }}
          onClick={(event) => event.stopPropagation()}
          onWheel={(event) => event.stopPropagation()}
        >
          <div
            className="pt-2"
            onTouchStart={onSheetTouchStart}
            onTouchMove={onSheetTouchMove}
            onTouchEnd={onSheetTouchEnd}
            onTouchCancel={onSheetTouchCancel}
          >
            <div className="mx-auto h-1.5 w-12 rounded-full bg-black/15 dark:bg-white/20" />
          </div>

          <header className="flex items-center justify-between px-4 pb-3 pt-3">
            <h2 className="text-[1.1rem] font-semibold tracking-[-0.01em] text-[#131316] dark:text-white">
              Checkout
            </h2>
            <button
              type="button"
              onClick={closeSheet}
              className="rounded-full p-1.5 text-[#3a3a3f] active:bg-black/5 dark:text-[#e7e7ea] dark:active:bg-white/10"
              aria-label="Close checkout"
            >
              <XMarkIcon className="size-5" />
            </button>
          </header>

          <div className="flex min-h-0 flex-1 flex-col px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-1">
            <Card
              contentWrap={false}
              className="mb-2 flex min-h-0 flex-1 rounded-2xl border border-black/10 bg-[#eceff3] dark:border-white/10 dark:bg-[#151518]"
            >
              <div className="flex h-full min-h-0 flex-col px-3 pb-3 pt-3">
                {items.length === 0 ? (
                  <div className="flex h-full w-full flex-1 items-center justify-center rounded-2xl border border-dashed border-black/10 bg-white px-4 py-8 text-center dark:border-white/15 dark:bg-[#0e0e10]">
                    <p className="text-sm text-[#6b7280] dark:text-[#b8b8c2]">
                      Your cart is empty.
                    </p>
                  </div>
                ) : (
                  <div className="min-h-0 flex-1 overflow-y-auto">
                    <ul className="space-y-2 pr-1">
                      {items.map((item) => (
                        <li
                          key={item.id}
                          className="relative overflow-hidden rounded-2xl"
                          onTouchStart={(event) =>
                            onItemTouchStart(item.id, event)
                          }
                          onTouchMove={(event) =>
                            onItemTouchMove(item.id, event)
                          }
                          onTouchEnd={(event) => onItemTouchEnd(item.id, event)}
                          onTouchCancel={onItemTouchCancel}
                        >
                          <div className="absolute inset-0 flex items-center justify-end rounded-2xl bg-[#ef4444] pr-4">
                            <span className="text-xs font-semibold tracking-[0.08em] text-white/95">
                              REMOVE
                            </span>
                          </div>

                          <div
                            className={[
                              "relative rounded-2xl bg-white px-3 py-3 dark:bg-[#0e0e10]",
                              swipePreview?.id === item.id &&
                              swipePreview.isDragging
                                ? ""
                                : "transition-transform duration-200 ease-out",
                            ].join(" ")}
                            style={{
                              transform: `translateX(${swipePreview?.id === item.id ? swipePreview.offset : 0}px)`,
                            }}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-[#111827] dark:text-[#f3f4f6]">
                                  {item.name}
                                </p>
                                <p className="text-xs text-[#7f7f88]">
                                  {item.sku}
                                </p>
                              </div>
                              <p className="text-sm font-semibold text-[#111827] dark:text-[#f3f4f6]">
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
                                  className="size-7 rounded-full border border-black/10 text-sm font-semibold text-[#111827] active:bg-black/5 dark:border-white/15 dark:text-[#f3f4f6] dark:active:bg-white/10"
                                  aria-label={`Decrease ${item.name} quantity`}
                                >
                                  -
                                </button>
                                <span className="min-w-5 text-center text-sm font-semibold text-[#111827] dark:text-[#f3f4f6]">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onIncrement(item.id)}
                                  className="size-7 rounded-full border border-black/10 text-sm font-semibold text-[#111827] active:bg-black/5 dark:border-white/15 dark:text-[#f3f4f6] dark:active:bg-white/10"
                                  aria-label={`Increase ${item.name} quantity`}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>

            <Card
              contentWrap={false}
              className="shrink-0 border border-black/10 bg-[#eceff3] px-4 pb-3 pt-3 dark:border-white/10 dark:bg-[#151518]"
            >
              <div className="space-y-1.5 border-b border-black/10 pb-3 dark:border-white/10">
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

              <div className="mt-3 rounded-2xl bg-white p-3 dark:bg-[#0e0e10]">
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
                  className="mt-2 h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-[1rem] font-semibold text-[#111827] placeholder:text-[#9ca3af] outline-none focus:border-[#0a84ff] focus:ring-2 focus:ring-[#0a84ff]/25 dark:border-white/15 dark:bg-[#0e0e10] dark:text-[#f3f4f6] dark:placeholder:text-[#6b7280]"
                />

                <div className="mt-2 flex flex-wrap gap-2">
                  {quickAmounts.map((value) => (
                    <button
                      key={value}
                      type="button"
                      className="rounded-full border border-black/10 bg-[#f3f4f6] px-3 py-1.5 text-xs font-semibold text-[#111827] active:bg-black/5 dark:border-white/15 dark:bg-[#151518] dark:text-white dark:active:bg-white/10"
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
                        ? "text-[#22c55e] dark:text-[#86efac]"
                        : "text-[#ef4444] dark:text-[#fca5a5]",
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
                  className="h-11 flex-1 rounded-xl bg-[#0a84ff] text-sm font-semibold text-white disabled:opacity-60 dark:bg-[#3b82f6]"
                  onClick={onCheckout}
                  disabled={
                    items.length === 0 || isSubmitting || !hasSufficientPayment
                  }
                >
                  {isSubmitting ? "Processing..." : "Pay Now"}
                </button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Popup>,
    document.body,
  );
}
