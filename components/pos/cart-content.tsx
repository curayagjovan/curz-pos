"use client";

import { useEffect, useRef, useState } from "react";

import {
  MinusOutlined,
  PlusOutlined,
  DeleteOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";
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
import { useThemeMode } from "@/components/providers/theme-provider";
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

  useEffect(() => {
    if (swipedItemId && !cart.some((item) => item.id === swipedItemId)) {
      setSwipedItemId(null);
    }
  }, [cart, swipedItemId]);

  const handleTouchStart = (
    itemId: string,
    clientX: number,
    clientY: number,
  ) => {
    if (swipedItemId && swipedItemId !== itemId) {
      setSwipedItemId(null);
    }

    setDragItemId(itemId);
    setDragOffset(swipedItemId === itemId ? -ACTION_WIDTH : 0);
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

    const baseOffset = swipedItemId === itemId ? -ACTION_WIDTH : 0;
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
    } else if (deltaX >= SWIPE_THRESHOLD || swipedItemId === itemId) {
      setSwipedItemId(null);
    }

    setDragItemId(null);
    setDragOffset(0);
    isSwipingRef.current = false;
  };

  return (
    <Space orientation="vertical" style={{ width: "100%" }} size={14}>
      <Space align="center">
        <ShoppingCartOutlined style={{ fontSize: 18, color: "#0b6bcb" }} />
        <Typography.Title level={4} style={{ margin: 0 }}>
          Cart
        </Typography.Title>
      </Space>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {cart.length === 0 ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "20px 0",
            }}
          >
            <Empty description="Cart Empty" style={{ margin: 0 }}>
              <Typography.Text type="secondary">
                No items added to cart yet
              </Typography.Text>
            </Empty>
          </div>
        ) : (
          cart.map((item) => (
            <div
              key={item.id}
              style={{
                borderRadius: 10,
                position: "relative",
                overflow: "hidden",
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
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  height: "100%",
                  width: ACTION_WIDTH,
                  borderRadius: "0 10px 10px 0",
                  border: "none",
                  borderLeft: `1px solid ${isDark ? "#7f1d1d" : "#fecaca"}`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  background: isDark
                    ? "linear-gradient(180deg, #1f1113 0%, #2a1215 100%)"
                    : "linear-gradient(180deg, #fff1f2 0%, #ffe4e6 100%)",
                  color: isDark ? "#fb7185" : "#dc2626",
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <DeleteOutlined />
                <span>Remove</span>
              </button>

              <div
                style={{
                  border: isDark ? "1px solid #334155" : "1px solid #e2e8f0",
                  borderRadius: 10,
                  padding: 10,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  background: isDark ? "#111827" : "#ffffff",
                  transform: `translateX(${dragItemId === item.id ? dragOffset : swipedItemId === item.id ? -ACTION_WIDTH : 0}px)`,
                  transition:
                    dragItemId === item.id ? "none" : "transform 180ms ease",
                  touchAction: "pan-y",
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
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography.Text
                    strong
                    style={{ color: isDark ? "#e5e7eb" : undefined }}
                  >
                    {item.name}
                  </Typography.Text>
                  <Typography.Text
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

      <Divider style={{ margin: "8px 0" }} />
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

      <InputNumber<number>
        style={{ width: "100%" }}
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
