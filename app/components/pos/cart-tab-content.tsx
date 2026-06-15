"use client";

import { Card, Space, Typography } from "antd";
import { CartContent } from "@/app/components/pos/cart-content";
import type { Product } from "@/app/components/pos/product-row";

type CartItem = Product & { quantity: number };

interface CartTabContentProps {
  mode: "light" | "dark";
  cart: CartItem[];
  cartItemCount: number;
  subtotal: number;
  tax: number;
  total: number;
  paymentAmount: number | null;
  quickCashAmounts: number[];
  change: number;
  checkingOut: boolean;
  onPaymentAmountChange: (amount: number | null) => void;
  onUpdateQty: (productId: string, delta: number) => void;
  onCheckout: () => void;
}

export function CartTabContent({
  mode,
  cart,
  cartItemCount,
  subtotal,
  tax,
  total,
  paymentAmount,
  quickCashAmounts,
  change,
  checkingOut,
  onPaymentAmountChange,
  onUpdateQty,
  onCheckout,
}: CartTabContentProps) {
  return (
    <Card
      style={{
        background:
          mode === "dark"
            ? "linear-gradient(135deg, rgba(20,31,55,0.9), rgba(15,23,42,0.8))"
            : undefined,
        border:
          mode === "dark" ? "1px solid rgba(71, 85, 105, 0.5)" : undefined,
      }}
    >
      <Space orientation="vertical" size={12} style={{ width: "100%" }}>
        <Typography.Text
          type="secondary"
          style={{
            color: mode === "dark" ? "#cbd5e1" : undefined,
          }}
        >
          {cartItemCount} item{cartItemCount === 1 ? "" : "s"}
        </Typography.Text>
        <CartContent
          cart={cart}
          subtotal={subtotal}
          tax={tax}
          total={total}
          paymentAmount={paymentAmount}
          setPaymentAmount={onPaymentAmountChange}
          quickCashAmounts={quickCashAmounts}
          change={change}
          checkingOut={checkingOut}
          updateQty={onUpdateQty}
          onCheckout={onCheckout}
        />
      </Space>
    </Card>
  );
}
