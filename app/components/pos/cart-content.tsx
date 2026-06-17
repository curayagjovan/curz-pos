"use client";

import { useMemo, useRef, useState } from "react";

import { MinusOutlined, PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import {
  Button,
  Divider,
  Empty,
  InputNumber,
  Space,
  Statistic,
  Tag,
  Typography,
} from "antd";
import { useThemeMode } from "@/app/components/providers/theme-provider";
import { TAX_ENABLED, TAX_RATE } from "@/lib/tax-config";

export type CartItem = {
  id: string;
  name: string;
  price: number;
  bundleQty: number | null;
  bundlePrice: number | null;
  stock: number;
  quantity: number;
};

type CartContentProps = {
  cart: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentAmount: number | null;
  setPaymentAmount: (value: number | null) => void;
  quickCashAmounts: number[];
  change: number;
  checkingOut: boolean;
  updateQty: (productId: string, delta: number) => void;
  onCheckout: () => void;
};

function getLineTotal(item: {
  quantity: number;
  price: number;
  bundleQty: number | null;
  bundlePrice: number | null;
}) {
  if (
    item.bundleQty &&
    item.bundleQty >= 2 &&
    item.bundlePrice !== null &&
    item.bundlePrice >= 0
  ) {
    const bundles = Math.floor(item.quantity / item.bundleQty);
    const remainder = item.quantity % item.bundleQty;
    return Number(
      (bundles * item.bundlePrice + remainder * item.price).toFixed(2),
    );
  }

  return Number((item.quantity * item.price).toFixed(2));
}

function isBundleApplied(item: {
  quantity: number;
  bundleQty: number | null;
  bundlePrice: number | null;
}) {
  return (
    item.bundleQty !== null &&
    item.bundleQty >= 2 &&
    item.bundlePrice !== null &&
    item.bundlePrice >= 0 &&
    item.quantity >= item.bundleQty
  );
}

export function CartContent({
  cart,
  subtotal,
  tax,
  total,
  paymentAmount,
  setPaymentAmount,
  quickCashAmounts,
  change,
  checkingOut,
  updateQty,
  onCheckout,
}: CartContentProps) {
  const { mode } = useThemeMode();
  const isDark = mode === "dark";
  const [swipedItemId, setSwipedItemId] = useState<string | null>(null);
  const [dragItemId, setDragItemId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const isSwipingRef = useRef(false);
  const ACTION_WIDTH = 104;
  const SWIPE_THRESHOLD = 44;

  const activeSwipedItemId = useMemo(
    () =>
      swipedItemId && cart.some((item) => item.id === swipedItemId)
        ? swipedItemId
        : null,
    [cart, swipedItemId],
  );

  const handleTouchStart = (
    itemId: string,
    clientX: number,
    clientY: number,
  ) => {
    if (activeSwipedItemId && activeSwipedItemId !== itemId) {
      setSwipedItemId(null);
    }

    setDragItemId(itemId);
    setDragOffset(activeSwipedItemId === itemId ? -ACTION_WIDTH : 0);
    touchStartXRef.current = clientX;
    touchStartYRef.current = clientY;
    isSwipingRef.current = false;
  };

  const handleTouchMove = (
    itemId: string,
    clientX: number,
    clientY: number,
    preventDefault: () => void,
  ) => {
    const startX = touchStartXRef.current;
    const startY = touchStartYRef.current;
    if (startX === null || startY === null || dragItemId !== itemId) {
      return;
    }

    const deltaX = clientX - startX;
    const deltaY = clientY - startY;

    if (!isSwipingRef.current) {
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 4) {
        isSwipingRef.current = true;
      } else {
        return;
      }
    }

    preventDefault();

    const baseOffset = activeSwipedItemId === itemId ? -ACTION_WIDTH : 0;
    const nextOffset = Math.min(
      0,
      Math.max(-ACTION_WIDTH, baseOffset + deltaX),
    );
    setDragOffset(nextOffset);
  };

  const handleTouchEnd = (itemId: string, clientX: number) => {
    const startX = touchStartXRef.current;
    touchStartXRef.current = null;
    touchStartYRef.current = null;

    if (startX === null) {
      setDragItemId(null);
      setDragOffset(0);
      isSwipingRef.current = false;
      return;
    }

    const deltaX = clientX - startX;

    if (isSwipingRef.current) {
      const shouldOpen = dragOffset <= -SWIPE_THRESHOLD;
      setSwipedItemId(shouldOpen ? itemId : null);
    } else if (deltaX >= SWIPE_THRESHOLD || activeSwipedItemId === itemId) {
      setSwipedItemId(null);
    }

    setDragItemId(null);
    setDragOffset(0);
    isSwipingRef.current = false;
  };

  return (
    <Space orientation="vertical" className="w-full" size={14}>
      <div className="flex flex-col gap-2">
        {cart.length === 0 ? (
          <div className="flex justify-center py-5">
            <Empty description="Cart Empty" style={{ margin: 0 }}>
              <Typography.Text type="secondary">No items yet</Typography.Text>
            </Empty>
          </div>
        ) : (
          cart.map((item) => (
            <div
              key={item.id}
              className="relative overflow-hidden rounded-[10px] transition-[transform,box-shadow,border-color] duration-150 active:scale-[0.994] motion-reduce:transform-none motion-reduce:transition-none"
              style={{
                background: isDark ? "#0f172a" : "#f8fafc",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  updateQty(item.id, -item.quantity);
                  setSwipedItemId(null);
                }}
                aria-label={`Remove ${item.name} from cart`}
                className="absolute top-0 right-0 h-full rounded-r-[10px] border-0 flex flex-col items-center justify-center gap-1.5 text-base font-semibold cursor-pointer"
                style={{
                  width: ACTION_WIDTH,
                  borderLeft: `1px solid ${isDark ? "#7f1d1d" : "#fecaca"}`,
                  background: isDark
                    ? "linear-gradient(180deg, #1f1113 0%, #2a1215 100%)"
                    : "linear-gradient(180deg, #fff1f2 0%, #ffe4e6 100%)",
                  color: isDark ? "#fb7185" : "#dc2626",
                }}
              >
                <DeleteOutlined />
                <span>Remove</span>
              </button>

              <div
                className="flex flex-col gap-2 rounded-[10px] p-2.5 touch-pan-y"
                style={{
                  border: isDark ? "1px solid #334155" : "1px solid #e2e8f0",
                  background: isDark ? "#111827" : "#ffffff",
                  transform: `translateX(${dragItemId === item.id ? dragOffset : activeSwipedItemId === item.id ? -ACTION_WIDTH : 0}px)`,
                  transition:
                    dragItemId === item.id ? "none" : "transform 180ms ease",
                }}
                onTouchStart={(event) =>
                  handleTouchStart(
                    item.id,
                    event.touches[0]?.clientX ?? 0,
                    event.touches[0]?.clientY ?? 0,
                  )
                }
                onTouchMove={(event) =>
                  handleTouchMove(
                    item.id,
                    event.touches[0]?.clientX ?? 0,
                    event.touches[0]?.clientY ?? 0,
                    () => event.preventDefault(),
                  )
                }
                onTouchEnd={(event) =>
                  handleTouchEnd(item.id, event.changedTouches[0]?.clientX ?? 0)
                }
                onTouchCancel={() => {
                  touchStartXRef.current = null;
                  touchStartYRef.current = null;
                  setDragItemId(null);
                  setDragOffset(0);
                  isSwipingRef.current = false;
                }}
              >
                <div className="flex items-center justify-between">
                  <Typography.Text
                    className="text-[0.9rem] font-bold tracking-[-0.01em]"
                    strong
                    style={{ color: isDark ? "#e5e7eb" : undefined }}
                  >
                    {item.name}
                  </Typography.Text>
                  <Typography.Text
                    className="text-base font-extrabold tracking-[-0.01em]"
                    strong
                    style={{ color: isDark ? "#f8fafc" : undefined }}
                  >
                    ₱{getLineTotal(item).toFixed(2)}
                  </Typography.Text>
                </div>
                {isBundleApplied(item) ? (
                  <Tag color="green">Bundle Applied</Tag>
                ) : null}
                <Typography.Text type="secondary">
                  {item.quantity} x ₱{item.price.toFixed(2)}
                </Typography.Text>
                {item.bundleQty && item.bundlePrice !== null ? (
                  <Typography.Text type="secondary">
                    Promo: {item.bundleQty} for ₱{item.bundlePrice.toFixed(2)}
                  </Typography.Text>
                ) : null}
                <Typography.Text type="secondary">
                  Available stock: {item.stock}
                </Typography.Text>
                <Space>
                  <Button
                    icon={<MinusOutlined />}
                    onClick={() => updateQty(item.id, -1)}
                    size="small"
                  />
                  <Typography.Text>{item.quantity}</Typography.Text>
                  <Button
                    icon={<PlusOutlined />}
                    onClick={() => updateQty(item.id, 1)}
                    size="small"
                    disabled={item.stock <= item.quantity}
                  />
                </Space>
              </div>
            </div>
          ))
        )}
      </div>

      <Divider className="my-2" />
      <div className="rounded-[14px] border border-slate-300/35 bg-white/65 p-2.5 backdrop-blur-[5px] dark:border-slate-600/60 dark:bg-slate-900/50">
        <Statistic title="Subtotal" value={subtotal} precision={2} prefix="₱" />
        {TAX_ENABLED ? (
          <Statistic
            title={`Tax (${(TAX_RATE * 100).toFixed(0)}%)`}
            value={tax}
            precision={2}
            prefix="₱"
          />
        ) : null}
        <Statistic
          title="Grand Total"
          value={total}
          precision={2}
          prefix="₱"
          styles={{ content: { color: "#0b6bcb" } }}
        />
      </div>

      <InputNumber<number>
        className="w-full"
        min={0}
        step={1}
        precision={2}
        prefix="₱"
        placeholder="Payment amount"
        value={paymentAmount ?? undefined}
        onChange={(value) => setPaymentAmount(value ?? null)}
      />

      <Space wrap>
        <Button onClick={() => setPaymentAmount(Number(total.toFixed(2)))}>
          Exact
        </Button>
        {quickCashAmounts.map((amount) => (
          <Button key={amount} onClick={() => setPaymentAmount(amount)}>
            ₱{amount}
          </Button>
        ))}
      </Space>

      <Statistic
        title="Change"
        value={Math.max(change, 0)}
        precision={2}
        prefix="₱"
        styles={{ content: { color: change >= 0 ? "#16a34a" : "#dc2626" } }}
      />
      {change < 0 ? (
        <Typography.Text type="danger">
          Insufficient payment by ₱{Math.abs(change).toFixed(2)}
        </Typography.Text>
      ) : null}

      <Button
        className="rounded-xl font-bold tracking-[0.01em] transition-[transform,box-shadow] duration-140 active:translate-y-px active:scale-[0.99] motion-reduce:transform-none motion-reduce:transition-none"
        type="primary"
        size="large"
        loading={checkingOut}
        disabled={cart.length === 0 || paymentAmount === null || checkingOut}
        onClick={onCheckout}
      >
        Checkout
      </Button>
    </Space>
  );
}
